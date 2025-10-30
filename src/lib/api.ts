import axios, { AxiosError } from "axios";
import {
  QueueJobsResponse,
  CustomAPIProcess,
  CustomAPICompany,
  CustomAPIQueueStats,
  CustomAPIJob,
} from "./types";

import {
  Observable,
  Subject,
  from,
  of,
  timer,
  concat,
  throwError,
} from "rxjs";
import {
  concatMap,
  tap,
  catchError,
  map,
  share,
  finalize,
} from "rxjs/operators";

// RxJS-based rate limiter for API requests
class RxRateLimiter {
  private queue$ = new Subject<{
    fn: () => Promise<any>;
    observer: {
      next: (value: any) => void;
      error: (err: any) => void;
      complete: () => void;
    };
  }>();
  private lastRequestTime = 0;

  constructor(private minInterval = 1000) {
    // Process queue items with rate limiting
    this.queue$
      .pipe(
        concatMap((item) => {
          const now = Date.now();
          const timeElapsed = now - this.lastRequestTime;
          const waitTime = Math.max(0, this.minInterval - timeElapsed);

          return concat(
            // Wait if needed
            waitTime > 0 ? timer(waitTime) : of(null),
            // Execute the function
            from(item.fn()).pipe(
              tap(() => (this.lastRequestTime = Date.now())),
              map((result) => ({
                result,
                observer: item.observer,
                error: null,
              })),
              catchError((error) =>
                of({ result: null, observer: item.observer, error })
              )
            )
          );
        })
      )
      .subscribe((item) => {
        if (!item || !item.observer) {
          return;
        }

        if (item.error) {
          try {
            item.observer.error(item.error);
          } catch (err) {
            // Observer might be closed, ignore
          }
        } else {
          try {
            item.observer.next(item.result);
            item.observer.complete();
          } catch (err) {
            // Observer might be closed, ignore
          }
        }
      });
  }

  throttle<T>(fn: () => Promise<T>): Observable<T> {
    return new Observable<T>((observer) => {
      if (!observer) {
        return;
      }

      this.queue$.next({
        fn,
        observer: {
          next: (value) => {
            try {
              observer.next(value);
            } catch (err) {
              // Observer might be closed, ignore
            }
          },
          error: (err) => {
            try {
              observer.error(err);
            } catch (error) {
              // Observer might be closed, ignore
            }
          },
          complete: () => {
            try {
              observer.complete();
            } catch (err) {
              // Observer might be closed, ignore
            }
          },
        },
      });

      // Return unsubscribe function
      return () => {
        // Nothing to clean up for this specific request
      };
    }).pipe(share());
  }
}

// Create a singleton instance
const rateLimiter = new RxRateLimiter(1000);

// Create a custom axios instance with retries
const api = axios.create({
  baseURL: "/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 30000,
  validateStatus: (status) => {
    return status >= 200 && status < 300;
  },
});

// Add request interceptor for logging and retry handling
api.interceptors.request.use(
  (config) => {
    // Add retry count to config if not present
    if ((config as any).retryCount === undefined) {
      (config as any).retryCount = 0;
      (config as any).maxRetries = 3;
    }

    // Reduce the batch size for large requests
    if (config.params?.jobsPerPage && config.params.jobsPerPage > 20) {
      config.params.jobsPerPage = 20;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for logging and retry handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Only retry on network errors or 5xx errors
    if (
      (error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNRESET" ||
        (error.response && error.response.status >= 500)) &&
      (config as any).retryCount < (config as any).maxRetries
    ) {
      (config as any).retryCount++;

      // Exponential backoff with jitter
      const jitter = Math.random() * 1000;
      const backoffDelay = Math.min(
        1000 * 2 ** (config as any).retryCount + jitter,
        10000
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));

      return api(config);
    }

    return Promise.reject(error);
  }
);

export function fetchQueueJobs(
  queueName: string,
  status?: string
): Promise<QueueJobsResponse> {
  // Create an observable for the API request
  return new Promise((resolve, reject) => {
    try {
      const params = status ? { status } : {};
      const subscription = rateLimiter
        .throttle(() =>
          api.get(`/queues/${queueName}`, { params })
        )
        .pipe(
          map((response) => {
            try {
              // The custom API returns an array of jobs directly
              const jobs = response.data || [];
              
              // Sort jobs by timestamp descending to get latest jobs first
              const sortedJobs = jobs.sort((a: CustomAPIJob, b: CustomAPIJob) => (b.timestamp || 0) - (a.timestamp || 0));
              
              // Transform the custom API response to match the expected format
              const queue = {
                name: queueName,
                type: "bullmq" as const,
                isPaused: false,
                statuses: ["active", "waiting", "completed", "failed", "delayed", "paused"],
                counts: {
                  active: sortedJobs.filter((job: CustomAPIJob) => job.status === "active").length,
                  waiting: sortedJobs.filter((job: CustomAPIJob) => job.status === "waiting").length,
                  completed: sortedJobs.filter((job: CustomAPIJob) => job.status === "completed").length,
                  failed: sortedJobs.filter((job: CustomAPIJob) => job.status === "failed").length,
                  delayed: sortedJobs.filter((job: CustomAPIJob) => job.status === "delayed").length,
                  paused: sortedJobs.filter((job: CustomAPIJob) => job.status === "paused").length,
                  prioritized: sortedJobs.filter((job: CustomAPIJob) => job.status === "prioritized").length,
                  "waiting-children": sortedJobs.filter((job: CustomAPIJob) => job.status === "waiting-children").length,
                },
                jobs: sortedJobs.map((job: CustomAPIJob) => ({
                  id: job.id,
                  name: job.name,
                  timestamp: job.timestamp,
                  processedOn: job.processedBy ? job.timestamp : undefined,
                  finishedOn: job.finishedOn,
                  progress: job.progress,
                  attempts: job.attemptsMade,
                  delay: job.delay,
                  stacktrace: job.stacktrace || [],
                  opts: job.opts || {},
                  data: {
                    url: job.url,
                    autoApprove: job.autoApprove,
                    threadId: job.processId,
                    messageId: job.id,
                    company: job.company,
                    companyName: job.company,
                    description: job.approval?.summary,
                    year: job.year,
                    status: job.status,
                    needsApproval: !job.autoApprove && !job.approval?.approved,
                    comment: job.approval?.metadata?.comment,
                  },
                  parent: undefined,
                  returnValue: job.returnvalue,
                  isFailed: job.status === "failed",
                })),
                pagination: {
                  pageCount: 1,
                  range: {
                    start: 0,
                    end: sortedJobs.length - 1,
                  },
                },
                readOnlyMode: false,
                allowRetries: true,
                allowCompletedRetries: true,
                delimiter: ":",
              };

              return { queue };
            } catch (error) {
              console.error(`Error processing queue '${queueName}':`, error);
              // Return empty queue instead of throwing
              return {
                queue: {
                  name: queueName,
                  type: "bullmq" as const,
                  isPaused: false,
                  statuses: [],
                  counts: {
                    active: 0,
                    waiting: 0,
                    completed: 0,
                    failed: 0,
                    delayed: 0,
                    paused: 0,
                    prioritized: 0,
                    "waiting-children": 0,
                  },
                  jobs: [],
                  pagination: {
                    pageCount: 0,
                    range: { start: 0, end: 0 },
                  },
                  readOnlyMode: false,
                  allowRetries: true,
                  allowCompletedRetries: true,
                  delimiter: ":",
                },
              };
            }
          }),
          catchError((error) => {
            try {
              const handledError = handleApiError(error, queueName);
              return throwError(() => handledError);
            } catch (handledError) {
              return throwError(() => handledError);
            }
          }),
          finalize(() => {})
        )
        .subscribe({
          next: (result) => {
            resolve(result);
          },
          error: (error) => {
            reject(error);
          },
          complete: () => {},
        });

      // Return cleanup function
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      reject(error);
    }
  });
}

// VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler
// och blockerande metoder som toArray() är FÖRBJUDNA.

// Load all historical jobs for a queue - simplified for custom API
export function fetchAllHistoricalJobs(
  queueName: string,
  status?: string
): Observable<QueueJobsResponse> {
  // The custom API returns all jobs at once, so we just need to fetch them
  return from(fetchQueueJobs(queueName, status)).pipe(
    catchError((error) => {
      console.error(`Error fetching historical jobs for ${queueName}:`, error);
      // Return empty response on error
      return of({
        queue: {
          name: queueName,
          type: "bullmq" as const,
          isPaused: false,
          statuses: [],
          counts: {
            active: 0,
            waiting: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
            prioritized: 0,
            "waiting-children": 0,
          },
          jobs: [],
          pagination: {
            pageCount: 0,
            range: { start: 0, end: 0 },
          },
          readOnlyMode: false,
          allowRetries: true,
          allowCompletedRetries: true,
          delimiter: ":",
        },
      });
    }),
    share()
  );
}

// New process management endpoints for the custom API
export function fetchProcesses(): Promise<CustomAPIProcess[]> {
  return new Promise((resolve, reject) => {
    try {
      const subscription = rateLimiter
        .throttle(() => api.get("/processes/"))
        .pipe(
          map((response) => response.data || []),
          catchError((error) => {
            console.error("Error fetching processes:", error);
            return of([]);
          })
        )
        .subscribe({
          next: (processes) => resolve(processes),
          error: (error) => reject(error),
        });

      return () => subscription.unsubscribe();
    } catch (error) {
      reject(error);
    }
  });
}

export function fetchProcessesByCompany(): Promise<CustomAPICompany[]> {
  return new Promise((resolve, reject) => {
    try {
      const subscription = rateLimiter
        .throttle(() => api.get("/processes/companies"))
        .pipe(
          map((response) => response.data || []),
          catchError((error) => {
            console.error("Error fetching processes by company:", error);
            // Propagate error so callers can decide how to handle state updates
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (companies) => resolve(companies),
          error: (error) => reject(error),
        });

      return () => subscription.unsubscribe();
    } catch (error) {
      reject(error);
    }
  });
}

export function fetchProcessById(processId: string): Promise<CustomAPIProcess | null> {
  return new Promise((resolve, reject) => {
    try {
      const subscription = rateLimiter
        .throttle(() => api.get(`/processes/${processId}`))
        .pipe(
          map((response) => response.data),
          catchError((error) => {
            console.error(`Error fetching process ${processId}:`, error);
            return of(null);
          })
        )
        .subscribe({
          next: (process) => resolve(process),
          error: (error) => reject(error),
        });

      return () => subscription.unsubscribe();
    } catch (error) {
      reject(error);
    }
  });
}

export function fetchQueueStats(): Promise<CustomAPIQueueStats[]> {
  return new Promise((resolve, reject) => {
    try {
      const subscription = rateLimiter
        .throttle(() => api.get("/queues/stats"))
        .pipe(
          map((response) => response.data || []),
          catchError((error) => {
            console.error("Error fetching queue stats:", error);
            return of([]);
          })
        )
        .subscribe({
          next: (stats) => resolve(stats),
          error: (error) => reject(error),
        });

      return () => subscription.unsubscribe();
    } catch (error) {
      reject(error);
    }
  });
}

function handleApiError(error: unknown, context?: string): Error {
  const errorPrefix = context ? `[${context}] ` : "";

  if (error instanceof AxiosError) {
    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return new Error(`${errorPrefix}Servern svarar långsamt`);
      }
      if (error.code === "ECONNRESET") {
        return new Error(`${errorPrefix}Anslutningen bröts`);
      }
      if (error.code === "ERR_NETWORK") {
        return new Error(
          `${errorPrefix}Kunde inte nå servern. Kontrollera din internetanslutning.`
        );
      }
      return new Error(`${errorPrefix}Kunde inte nå servern: ${error.message}`);
    }

    const statusCode = error.response.status;
    const responseData = error.response.data;

    switch (statusCode) {
      case 401:
        return new Error(`${errorPrefix}Du måste logga in`);
      case 403:
        return new Error(`${errorPrefix}Åtkomst nekad`);
      case 404:
        return new Error(`${errorPrefix}Kunde inte hitta data`);
      case 429:
        return new Error(`${errorPrefix}För många förfrågningar`);
      case 500:
      case 502:
      case 503:
      case 504:
        return new Error(
          `${errorPrefix}Ett serverfel har inträffat (${statusCode})`
        );
      default:
        // Include response data in error message if available
        const errorMessage =
          responseData?.message || responseData?.error || error.message;
        return new Error(
          `${errorPrefix}Ett fel uppstod (${statusCode}): ${errorMessage}`
        );
    }
  }

  // For non-Axios errors, try to extract useful information
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new Error(`${errorPrefix}Ett oväntat fel uppstod: ${errorMessage}`);
}
