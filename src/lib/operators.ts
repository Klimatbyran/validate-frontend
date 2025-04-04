import { Observable, OperatorFunction, pipe, from, of, share, BehaviorSubject, withLatestFrom, switchMap, distinctUntilChanged } from 'rxjs';
import { map, groupBy, mergeMap, reduce, min, scan, catchError, tap } from 'rxjs/operators';
import type { Queue, QueueJob, CompanyStatus, GroupedCompany } from './types';

// Group queues into a stream of jobs with queue information
export function groupQueues(): OperatorFunction<{ queueId: string; queue: Queue | null }[], QueueJob[]> {
  return pipe(
    tap(queues => {
      console.log('🔍 Incoming queues:', queues.map(q => ({
        queueId: q.queueId,
        jobCount: q.queue?.jobs.length || 0
      })));
    }),
    mergeMap(queues => from(queues.flatMap(({ queueId, queue }) => 
      queue?.jobs.map(job => ({ ...job, queueId })) || []
    ))),
    tap(job => {
      console.log('📦 Processing job:', {
        id: job.id,
        queueId: job.queueId,
        companyName: job.data.companyName,
        threadId: job.data.threadId
      });
    }),
    share() // Share the stream between multiple subscribers
  );
}

// Group jobs by company using RxJS groupBy
// VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler 
// och blockerande metoder som toArray() är FÖRBJUDNA.
export function groupByCompany(): OperatorFunction<QueueJob, GroupedCompany[]> {
  return pipe(
    // Logga inkommande jobb
    tap(job => {
      console.log('👥 Processing job:', {
        id: job.id,
        companyName: job.data.companyName,
        threadId: job.data.threadId
      });
    }),
    // Steg 1: Gruppera jobb efter threadId för att hantera jobb i samma tråd tillsammans
    groupBy(
      job => job.data.threadId || job.id,
      {
        element: job => ({
          job,
          threadId: job.data.threadId || job.id,
          timestamp: job.finishedOn || job.processedOn || job.timestamp
        })
      }
    ),
    // Steg 2: Bearbeta varje trådgrupp reaktivt
    mergeMap(threadGroup => {
      // Använd scan för att bygga upp en "state" för varje tråd
      // Detta ersätter behovet av en global BehaviorSubject
      return threadGroup.pipe(
        // Scan används för att ackumulera state inom en ström
        scan((acc, jobData) => {
          // Hitta companyName från tidigare jobb i tråden eller från det aktuella jobbet
          const companyName = jobData.job.data.companyName || acc.companyName;
          
          // Uppdatera alla jobb i tråden med companyName om det finns
          const updatedJobs = acc.jobs.map(item => {
            // Om jobbet inte har companyName men tråden har det, uppdatera jobbet
            if (companyName && !item.job.data.companyName) {
              return {
                ...item,
                job: {
                  ...item.job,
                  data: {
                    ...item.job.data,
                    companyName
                  }
                }
              };
            }
            return item;
          });
          
          // Lägg till eller uppdatera det aktuella jobbet
          const existingJobIndex = updatedJobs.findIndex(
            item => item.job.id === jobData.job.id && item.job.queueId === jobData.job.queueId
          );
          
          if (existingJobIndex >= 0) {
            updatedJobs[existingJobIndex] = jobData;
          } else {
            updatedJobs.push(jobData);
          }
          
          return {
            companyName,
            jobs: updatedJobs
          };
        }, { companyName: '', jobs: [] as any[] }),
        // Emittera varje jobb separat med uppdaterad companyName
        mergeMap(threadState => 
          from(threadState.jobs).pipe(
            // Uppdatera companyName för alla jobb i tråden
            map(jobData => {
              if (threadState.companyName && !jobData.job.data.companyName) {
                return {
                  ...jobData,
                  job: {
                    ...jobData.job,
                    data: {
                      ...jobData.job.data,
                      companyName: threadState.companyName
                    }
                  }
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
      job => job.job.data.companyName || job.job.data.company || 'Unknown',
      {
        element: job => job
      }
    ),
    tap(group => {
      console.log('🏢 Created company group:', group.key);
    }),
    // Steg 4: Bearbeta varje företagsgrupp
    mergeMap(group => {
      // Använd scan istället för BehaviorSubject för att bygga upp företagsstate
      // Detta är en rent funktionell reaktiv approach utan sidoeffekter
      
      return group.pipe(
        // Använd scan för att bygga upp företagsstate
        scan((acc, data) => {
          const { job, threadId } = data;
          
          // Hämta aktuella jobb för denna tråd
          const threadJobs = acc.threads.get(threadId) || [];
          
          // Lägg till jobb i tråden, ersätt om det redan finns
          const updatedJobs = [
            ...threadJobs.filter(j => j.id !== job.id || j.queueId !== job.queueId), 
            job
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
            threads: newThreads
          };
        }, {
          company: group.key,
          companyName: undefined as string | undefined,
          description: undefined as string | undefined,
          threads: new Map<string, QueueJob[]>()
        }),
        // Konvertera företagsstate till GroupedCompany-format
        map(({ company, companyName, description, threads }) => {
          // Konvertera threads Map till attempts-array
          const attempts = Array.from(threads.entries()).map(([threadId, jobs]) => {
            // Hitta det senaste jobbet i denna tråd
            const latestJob = jobs.reduce((latest, job) => 
              job.timestamp > (latest?.timestamp ?? 0) ? job : latest
            , jobs[0]);
            
            // Skapa stages-objekt från jobb
            const stages = jobs.reduce((stagesAcc, job) => ({
              ...stagesAcc,
              [job.queueId]: {
                status: getJobStatus(job),
                timestamp: job.finishedOn || job.processedOn || job.timestamp
              }
            }), {});
            
            return {
              company,
              companyName: latestJob.data.companyName,
              description,
              threadId,
              year: latestJob.data.year || new Date().getFullYear(),
              jobs, // Inkludera alla jobb för denna tråd
              stages
            };
          });
          
          // Sortera attempts efter timestamp (nyast först)
          const sortedAttempts = attempts.sort((a, b) => {
            const aTime = Math.min(...Object.values(a.stages).map(s => s.timestamp));
            const bTime = Math.min(...Object.values(b.stages).map(s => s.timestamp));
            return bTime - aTime;
          });
          
          return {
            company,
            companyName,
            description,
            attempts: sortedAttempts
          };
        }),
        // Emittera bara när företagsstatet ändras
        distinctUntilChanged((prev, curr) => {
          // Säkerställ att threads finns innan vi försöker använda values()
          if (!prev?.threads || !curr?.threads) return false;
          
          // Kontrollera likhet baserat på antal trådar och jobb
          const prevJobCount = Array.from(prev.threads.values()).flat().length;
          const currJobCount = Array.from(curr.threads.values()).flat().length;
          return prevJobCount === currJobCount && prev.threads.size === curr.threads.size;
        })
      );
    }),
    // Steg 5: Kombinera alla företagsgrupper till en enda array
    // Använd scan för att bygga upp en array av företag och emittera för varje uppdatering
    scan((companies, company) => {
      // Hitta om detta företag redan finns i vår array
      const index = companies.findIndex(c => c.company === company.company);
      
      // Ersätt eller lägg till företaget
      if (index >= 0) {
        // Skapa en ny array med det uppdaterade företaget
        return [
          ...companies.slice(0, index),
          company,
          ...companies.slice(index + 1)
        ];
      }
      // Lägg till det nya företaget
      return [...companies, company];
    }, [] as GroupedCompany[]),
    // Dela strömmen för att undvika att köra om hela pipeline för varje subscriber
    share(),
    
    // Sortera företag efter namn
    map(companies => 
      // Skapa en ny sorterad array utan att mutera den ursprungliga
      companies.sort((a, b) => 
        (a.companyName || a.company).localeCompare(b.companyName || b.company)
      )
    ),
    
    // Log the current state
    tap(companies => {
      // Säkerställ att companies är en array innan vi försöker använda length och reduce
      if (!companies || !Array.isArray(companies)) {
        console.log('📈 Current companies state: No companies available');
        return;
      }
      
      console.log('📈 Current companies state:', {
        companyCount: companies.length,
        totalAttempts: companies.reduce((sum, company) => 
          sum + (company?.attempts?.length || 0), 0
        )
      });
    }),
    catchError(error => {
      console.error('❌ Error in groupByCompany:', error);
      return of([]);
    }),
    share() // Share the stream between multiple subscribers
  );
}

function getJobStatus(job: QueueJob): CompanyStatus['stages'][string]['status'] {
  if (job.finishedOn) return job.isFailed ? 'failed' : 'completed';
  if (job.processedOn) return 'processing';
  return 'pending';
}
