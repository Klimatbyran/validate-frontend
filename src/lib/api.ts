import axios, { AxiosError } from 'axios';
import { QueuesResponse, QueuesResponseSchema, QueueJobsResponse, QueueJobsResponseSchema } from './types';
import { toast } from 'sonner';

import { Observable, Subject, from, of, timer, concat, throwError } from 'rxjs';
import { mergeMap, concatMap, tap, catchError, delay, map, share, finalize } from 'rxjs/operators';

// RxJS-based rate limiter for API requests
class RxRateLimiter {
  private queue$ = new Subject<{
    fn: () => Promise<any>,
    observer: { next: (value: any) => void, error: (err: any) => void, complete: () => void }
  }>();
  private lastRequestTime = 0;
  private processing = false;
  
  constructor(private minInterval = 1000) {
    // Process queue items with rate limiting
    this.queue$.pipe(
      concatMap(item => {
        const now = Date.now();
        const timeElapsed = now - this.lastRequestTime;
        const waitTime = Math.max(0, this.minInterval - timeElapsed);
        
        return concat(
          // Wait if needed
          waitTime > 0 ? timer(waitTime) : of(null),
          // Execute the function
          from(item.fn()).pipe(
            tap(() => this.lastRequestTime = Date.now()),
            map(result => ({ result, observer: item.observer })),
            catchError(error => of({ error, observer: item.observer }))
          )
        );
      })
    ).subscribe(
      ({ result, error, observer }) => {
        if (error) {
          observer.error(error);
        } else {
          observer.next(result);
          observer.complete();
        }
      }
    );
  }
  
  throttle<T>(fn: () => Promise<T>): Observable<T> {
    return new Observable<T>(observer => {
      this.queue$.next({
        fn,
        observer: {
          next: (value) => observer.next(value),
          error: (err) => observer.error(err),
          complete: () => observer.complete()
        }
      });
    }).pipe(
      share()
    );
  }
}

// Create a singleton instance
const rateLimiter = new RxRateLimiter(1000);

// Create a custom axios instance with retries
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
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
    if (config.retryCount === undefined) {
      config.retryCount = 0;
      config.maxRetries = 3;
    }

    // Reduce the batch size for large requests
    if (config.params?.jobsPerPage && config.params.jobsPerPage > 20) {
      config.params.jobsPerPage = 20;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
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
      (error.code === 'ECONNABORTED' || 
       error.code === 'ETIMEDOUT' ||
       error.code === 'ECONNRESET' ||
       (error.response && error.response.status >= 500)) && 
      config.retryCount < config.maxRetries
    ) {
      config.retryCount++;

      // Exponential backoff with jitter
      const jitter = Math.random() * 1000;
      const backoffDelay = Math.min(1000 * (2 ** config.retryCount) + jitter, 10000);
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return api(config);
    }

    return Promise.reject(error);
  }
);

export function fetchQueueJobs(
  queueName: string, 
  status = 'latest',
  page = 1,
  jobsPerPage = 20
): Promise<QueueJobsResponse> {
  console.log(`🔍 Fetching queue jobs for ${queueName}...`);
  
  // Create an observable for the API request
  return new Promise((resolve, reject) => {
    rateLimiter.throttle(() => api.get<QueuesResponse>('/queues', {
      params: {
        activeQueue: queueName,
        status,
        page,
        jobsPerPage,
        includeJobs: true,
        includeDelayed: true,
        includePaused: true,
        includeWaiting: true,
        includeActive: true,
        includeCompleted: true,
        includeFailed: true,
        showEmpty: true
      },
    }))
    .pipe(
      tap(response => console.log(`✅ Received response for ${queueName}:`, response.data)),
      map(response => {
        // Validate the response
        const parsed = QueuesResponseSchema.safeParse(response.data);
        if (!parsed.success) {
          console.error(`❌ Invalid response data for ${queueName}:`, parsed.error);
          throw new Error(`Ogiltig data från servern: ${parsed.error.message}`);
        }

        // Find the requested queue
        const queue = parsed.data.queues.find(q => q.name === queueName);
        if (!queue) {
          console.error(`❌ Queue "${queueName}" not found in response`);
          throw new Error(`Kunde inte hitta kön "${queueName}"`);
        }

        return { queue };
      }),
      catchError(error => {
        try {
          handleApiError(error, queueName);
        } catch (handledError) {
          return throwError(() => handledError);
        }
      })
    ).subscribe({
      next: (result) => resolve(result),
      error: (error) => reject(error)
    });
  });
}

function handleApiError(error: unknown, context?: string): never {
  const errorPrefix = context ? `[${context}] ` : '';
  console.error(`❌ API Error ${errorPrefix}:`, error);

  if (error instanceof AxiosError) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error(`${errorPrefix}Servern svarar långsamt`);
      }
      if (error.code === 'ECONNRESET') {
        throw new Error(`${errorPrefix}Anslutningen bröts`);
      }
      if (error.code === 'ERR_NETWORK') {
        throw new Error(`${errorPrefix}Kunde inte nå servern. Kontrollera din internetanslutning.`);
      }
      throw new Error(`${errorPrefix}Kunde inte nå servern: ${error.message}`);
    }
    
    const statusCode = error.response.status;
    const responseData = error.response.data;
    
    // Log detailed error information
    console.error('Response status:', statusCode);
    console.error('Response data:', responseData);
    
    switch (statusCode) {
      case 401:
        throw new Error(`${errorPrefix}Du måste logga in`);
      case 403:
        throw new Error(`${errorPrefix}Åtkomst nekad`);
      case 404:
        throw new Error(`${errorPrefix}Kunde inte hitta data`);
      case 429:
        throw new Error(`${errorPrefix}För många förfrågningar`);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new Error(`${errorPrefix}Ett serverfel har inträffat (${statusCode})`);
      default:
        // Include response data in error message if available
        const errorMessage = responseData?.message || responseData?.error || error.message;
        throw new Error(`${errorPrefix}Ett fel uppstod (${statusCode}): ${errorMessage}`);
    }
  }
  
  // For non-Axios errors, try to extract useful information
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Detailed error:', error);
  throw new Error(`${errorPrefix}Ett oväntat fel uppstod: ${errorMessage}`);
}
