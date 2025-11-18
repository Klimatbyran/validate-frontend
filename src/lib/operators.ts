import {
  OperatorFunction,
  pipe,
  from,
  of,
  share,
  distinctUntilChanged,
} from "rxjs";
import { map, groupBy, mergeMap, scan, catchError } from "rxjs/operators";
import type { Queue, QueueJob, CompanyStatus, GroupedCompany } from "./types";

// Group queues into a stream of jobs with queue information
export function groupQueues(): OperatorFunction<
  { queueId: string; queue: Queue | null }[],
  QueueJob
> {
  return pipe(
    mergeMap((queues) =>
      from(
        queues.flatMap(
          ({ queueId, queue }) =>
            queue?.jobs.map((job) => ({ ...job, queueId })) || []
        )
      )
    ),
    share() // Share the stream between multiple subscribers
  );
}

// Group jobs by company using RxJS groupBy
// VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler
// och blockerande metoder som toArray() är FÖRBJUDNA.
export function groupByCompany(): OperatorFunction<QueueJob, GroupedCompany[]> {
  return pipe(
    // Steg 1: Gruppera jobb ENBART efter top-level threadId (inga fallbacks i data)
    groupBy((job) => (job as any)?.threadId ?? "__missing_threadId__", {
      element: (job) => ({
        job,
        threadId: (job as any)?.threadId ?? "__missing_threadId__",
        timestamp: job.finishedOn || job.processedOn || job.timestamp,
      }),
    }),
    mergeMap((threadGroup) => {
      // Använd scan för att bygga upp en "state" för varje tråd
      // Detta ersätter behovet av en global BehaviorSubject
      return threadGroup.pipe(
        // Scan används för att ackumulera state inom en ström
        scan(
          (acc, jobData) => {
            // Hitta companyName från tidigare jobb i tråden eller från det aktuella jobbet
            const companyName = jobData.job.data.companyName || acc.companyName;

            // Uppdatera alla jobb i tråden med companyName om det finns
            const updatedJobs = acc.jobs.map((item) => {
              // Om jobbet inte har companyName men tråden har det, uppdatera jobbet
              if (companyName && !item.job.data.companyName) {
                return {
                  ...item,
                  job: {
                    ...item.job,
                    data: {
                      ...item.job.data,
                      companyName,
                    },
                  },
                };
              }
              return item;
            });

            // Lägg till eller uppdatera det aktuella jobbet
            const existingJobIndex = updatedJobs.findIndex(
              (item) =>
                item.job.id === jobData.job.id &&
                item.job.queueId === jobData.job.queueId
            );

            if (existingJobIndex >= 0) {
              updatedJobs[existingJobIndex] = jobData;
            } else {
              updatedJobs.push(jobData);
            }

            return {
              companyName,
              jobs: updatedJobs,
            };
          },
          { companyName: "", jobs: [] as any[] }
        ),
        // Emittera varje jobb separat med uppdaterad companyName
        mergeMap((threadState) =>
          from(threadState.jobs).pipe(
            // Uppdatera companyName för alla jobb i tråden
            map((jobData) => {
              if (threadState.companyName && !jobData.job.data.companyName) {
                return {
                  ...jobData,
                  job: {
                    ...jobData.job,
                    data: {
                      ...jobData.job.data,
                      companyName: threadState.companyName,
                    },
                  },
                };
              }
              return jobData;
            })
          )
        ),
        share()
      );
    }),
    // Steg 3: Gruppera jobb efter företagsnamn med uppdaterad jobbdata
    groupBy(
      (job) => job.job.data.companyName || job.job.data.company || "Unknown",
      {
        element: (job) => job,
      }
    ),
    // Steg 4: Bearbeta varje företagsgrupp
    mergeMap((group) => {
      // Använd scan istället för BehaviorSubject för att bygga upp företagsstate
      // Detta är en rent funktionell reaktiv approach utan sidoeffekter

      return group.pipe(
        // Använd scan för att bygga upp företagsstate
        scan(
          (acc, data) => {
            const { job, threadId } = data;

            // Hämta aktuella jobb för denna tråd
            const threadJobs = acc.threads.get(threadId) || [];

            // Lägg till jobb i tråden, ersätt om det redan finns
            const updatedJobs = [
              ...threadJobs.filter(
                (j) => j.id !== job.id || j.queueId !== job.queueId
              ),
              job,
            ];

            // Skapa ny threads-map med uppdaterade jobb
            const newThreads = new Map(acc.threads);
            newThreads.set(threadId, updatedJobs);

            // Uppdatera företagsinfo om tillgänglig
            const newCompanyName = job.data.companyName || acc.companyName;
            const newDescription = job.data.description || acc.description;

            // Returnera uppdaterat state
            return {
              company: acc.company,
              companyName: newCompanyName,
              description: newDescription,
              threads: newThreads,
            };
          },
          {
            company: group.key,
            companyName: undefined as string | undefined,
            description: undefined as string | undefined,
            threads: new Map<string, QueueJob[]>(),
          }
        ),
        // Konvertera företagsstate till GroupedCompany-format
        map(({ company, companyName, description, threads }) => {
          // Konvertera threads Map till attempts-array
          const attempts = Array.from(threads.entries()).map(
            ([threadId, jobs]) => {
              // Hitta det senaste jobbet i denna tråd
              const latestJob = jobs.reduce((latest, job) => {
                const jobTs = job.finishedOn || job.processedOn || job.timestamp || 0;
                const latestTs = latest
                  ? latest.finishedOn || latest.processedOn || latest.timestamp || 0
                  : -Infinity;
                return jobTs > latestTs ? job : latest;
              }, jobs[0]);

              // Skapa stages-objekt från jobb
              const stages = jobs.reduce(
                (stagesAcc, job) => ({
                  ...stagesAcc,
                  [job.queueId]: {
                    status: getJobStatus(job),
                    timestamp:
                      job.finishedOn || job.processedOn || job.timestamp,
                  },
                }),
                {}
              );

              return {
                company,
                companyName: latestJob.data.companyName,
                description,
                threadId,
                year: latestJob.data.year || new Date().getFullYear(),
                jobs, // Inkludera alla jobb för denna tråd
                stages,
              };
            }
          );

          // Sortera attempts efter timestamp (nyast först)
          const sortedAttempts = attempts.sort((a, b) => {
            const aStages = Object.values(
              a.stages
            ) as CompanyStatus["stages"][string][];
            const bStages = Object.values(
              b.stages
            ) as CompanyStatus["stages"][string][];
            // Use latest timestamp within an attempt
            const aTime = Math.max(...aStages.map((s) => s.timestamp));
            const bTime = Math.max(...bStages.map((s) => s.timestamp));
            return bTime - aTime;
          });

          // Do NOT merge jobs across different runs.
          // Instead, for each year, pick the single most recent attempt (thread) and show its jobs only.
          const attemptsByYear = new Map<number, {
            year: number;
            latestTimestamp: number;
            jobs: QueueJob[];
            companyName?: string;
            threadId: string;
          }>();

          sortedAttempts.forEach((attempt) => {
            const attemptLatestTs = Math.max(
              ...Object.values(attempt.stages).map((s: any) => s.timestamp)
            );
            // Derive year from the latest job in this attempt
            const latestJobInAttempt = attempt.jobs.reduce((prev: any, cur: any) => {
              const prevTs = prev ? (prev.finishedOn || prev.processedOn || prev.timestamp || 0) : -Infinity;
              const curTs = cur.finishedOn || cur.processedOn || cur.timestamp || 0;
              return curTs > prevTs ? cur : prev;
            }, attempt.jobs[0]);
            const year = latestJobInAttempt?.data?.year || new Date().getFullYear();

            const existing = attemptsByYear.get(year);
            if (!existing || attemptLatestTs > existing.latestTimestamp) {
              attemptsByYear.set(year, {
                year,
                latestTimestamp: attemptLatestTs,
                jobs: attempt.jobs,
                companyName: latestJobInAttempt?.data?.companyName,
                threadId: attempt.threadId,
              });
            }
          });

          const filteredAttempts = Array.from(attemptsByYear.values())
            .map(({ year, latestTimestamp, jobs, companyName: cn, threadId: chosenThreadId }) => {
              const stages = jobs.reduce(
                (stagesAcc: CompanyStatus["stages"], job: QueueJob) => ({
                  ...stagesAcc,
                  [job.queueId]: {
                    status: getJobStatus(job),
                    timestamp:
                      job.finishedOn || job.processedOn || job.timestamp,
                  },
                }),
                {} as CompanyStatus["stages"]
              );

              return {
                company,
                companyName: cn || company,
                description,
                threadId: chosenThreadId,
                year,
                jobs,
                stages,
                attemptCount: 1,
                latestTimestamp,
              };
            })
            .sort((a, b) => b.latestTimestamp - a.latestTimestamp);

          return {
            company,
            companyName,
            description,
            attempts: filteredAttempts,
          };
        }),
        // Emittera bara när företagsstatet ändras
        distinctUntilChanged((prev, curr) => {
          // Säkerställ att attempts finns innan vi försöker använda dem
          if (!prev?.attempts || !curr?.attempts) return false;

          // Kontrollera likhet baserat på antal attempts och jobb
          const prevJobCount = prev.attempts.reduce(
            (sum, attempt) => sum + (attempt.jobs?.length || 0),
            0
          );
          const currJobCount = curr.attempts.reduce(
            (sum, attempt) => sum + (attempt.jobs?.length || 0),
            0
          );

          // Inkludera senaste timestamp för att fånga nya körningar även om antal är lika
          const prevLatestTs = Math.max(
            0,
            ...prev.attempts.map((a: any) => a.latestTimestamp || 0)
          );
          const currLatestTs = Math.max(
            0,
            ...curr.attempts.map((a: any) => a.latestTimestamp || 0)
          );

          return (
            prevJobCount === currJobCount &&
            prev.attempts.length === curr.attempts.length &&
            prevLatestTs === currLatestTs
          );
        })
      );
    }),
    // Steg 5: Kombinera alla företagsgrupper till en enda array
    // Använd scan för att bygga upp en array av företag och emittera för varje uppdatering
    scan((companies, company) => {
      // Hitta om detta företag redan finns i vår array
      const index = companies.findIndex((c) => c.company === company.company);

      // Ersätt eller lägg till företaget
      if (index >= 0) {
        // Skapa en ny array med det uppdaterade företaget
        return [
          ...companies.slice(0, index),
          company,
          ...companies.slice(index + 1),
        ];
      }
      // Lägg till det nya företaget
      return [...companies, company];
    }, [] as GroupedCompany[]),
    // Dela strömmen för att undvika att köra om hela pipeline för varje subscriber
    share(),

    // Sortera företag efter senaste timestamp (nyaste först)
    map((companies) =>
      // Skapa en ny sorterad array utan att mutera den ursprungliga
      companies.sort((a, b) => {
        // Hitta den senaste timestampen för varje företag från attempts
        const aLatestTimestamp = Math.max(
          ...(a.attempts || []).map(
            (attempt: CompanyStatus & { latestTimestamp?: number }) =>
              attempt.latestTimestamp || 0
          )
        );
        const bLatestTimestamp = Math.max(
          ...(b.attempts || []).map(
            (attempt: CompanyStatus & { latestTimestamp?: number }) =>
              attempt.latestTimestamp || 0
          )
        );

        // Sortera efter senaste timestamp (nyaste först)
        return bLatestTimestamp - aLatestTimestamp;
      })
    ),

    catchError(() => {
      return of([]);
    }),
    share() // Share the stream between multiple subscribers
  );
}

function getJobStatus(
  job: QueueJob
): CompanyStatus["stages"][string]["status"] {
  if (job.finishedOn) return job.isFailed ? "failed" : "completed";
  if (job.processedOn) return "processing";
  return "pending";
}
