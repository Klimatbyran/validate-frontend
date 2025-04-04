import { Observable, OperatorFunction, pipe, map, groupBy, mergeMap, reduce, from, min, scan, catchError, of, share, tap } from 'rxjs';
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
export function groupByCompany(): OperatorFunction<QueueJob, GroupedCompany[]> {
  // Create a map to track threadIds and their associated companies
  const threadCompanyMap: Record<string, string> = {};
  
  return pipe(
    tap(job => {
      console.log('👥 Grouping job:', {
        id: job.id,
        companyName: job.data.companyName,
        threadId: job.data.threadId
      });
      
      // If this job has both a threadId and companyName, store the association
      if (job.data.threadId && job.data.companyName) {
        threadCompanyMap[job.data.threadId] = job.data.companyName;
      }
    }),
    // First, group by threadId to collect all jobs in the same thread
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
    // Process each thread group to determine the company name
    mergeMap(threadGroup => {
      return threadGroup.pipe(
        // Collect all jobs in this thread
        toArray(),
        map(jobsInThread => {
          // Find a job with a company name if any exists
          const jobWithCompany = jobsInThread.find(item => item.job.data.companyName);
          const companyName = jobWithCompany ? 
            jobWithCompany.job.data.companyName : 
            (threadGroup.key && threadCompanyMap[threadGroup.key] ? 
              threadCompanyMap[threadGroup.key] : null);
          
          // If we found a company name, apply it to all jobs in this thread
          if (companyName) {
            jobsInThread.forEach(item => {
              if (!item.job.data.companyName) {
                item.job.data.companyName = companyName;
              }
            });
          }
          
          // Return the jobs with potentially updated company names
          return jobsInThread;
        }),
        // Flatten the array back to individual jobs
        mergeMap(jobs => from(jobs))
      );
    }),
    // Now group by company name with the updated job data
    groupBy(
      job => job.job.data.companyName || job.job.data.company || 'Unknown',
      {
        element: job => job
      }
    ),
    tap(group => {
      console.log('🏢 Created company group:', group.key);
    }),
    // Process each company group
    mergeMap(group => group.pipe(
      tap(data => {
        console.log('📊 Processing company data:', {
          companyName: group.key,
          jobId: data.job.id,
          threadId: data.threadId
        });
      }),
      // Accumulate jobs for each company
      scan((acc, { job, threadId, timestamp }) => {
        const threadJobs = acc.threads.get(threadId) || [];
        const updatedJobs = [...threadJobs.filter(j => j.id !== job.id || j.queueId !== job.queueId), job];
        acc.threads.set(threadId, updatedJobs);
        
        // Update company info if available
        if (job.data.companyName) {
          acc.companyName = job.data.companyName;
        }
        if (job.data.description) {
          acc.description = job.data.description;
        }
        
        return acc;
      }, {
        company: group.key,
        companyName: undefined as string | undefined,
        description: undefined as string | undefined,
        threads: new Map<string, QueueJob[]>()
      }),
      tap(acc => {
        console.log('🔄 Updated company accumulator:', {
          company: acc.company,
          companyName: acc.companyName,
          threadCount: acc.threads.size,
          totalJobs: Array.from(acc.threads.values()).flat().length
        });
      }),
      // Convert accumulated data to GroupedCompany format
      map(({ company, companyName, description, threads }) => ({
        company,
        companyName,
        description,
        attempts: Array.from(threads.entries()).map(([threadId, jobs]) => {
          const latestJob = jobs.reduce((latest, job) => 
            job.timestamp > (latest?.timestamp ?? 0) ? job : latest
          , jobs[0]);

          return {
            company,
            companyName: latestJob.data.companyName,
            description,
            threadId,
            year: latestJob.data.year || new Date().getFullYear(),
            jobs, // Include all jobs for this thread
            stages: jobs.reduce((stages, job) => ({
              ...stages,
              [job.queueId]: {
                status: getJobStatus(job),
                timestamp: job.finishedOn || job.processedOn || job.timestamp
              }
            }), {})
          };
        }).sort((a, b) => {
          const aTime = Math.min(...Object.values(a.stages).map(s => s.timestamp));
          const bTime = Math.min(...Object.values(b.stages).map(s => s.timestamp));
          return bTime - aTime;
        })
      }))
    )),
    tap(company => {
      console.log('✨ Emitting grouped company:', {
        company: company.company,
        companyName: company.companyName,
        attemptCount: company.attempts.length,
        totalStages: company.attempts.reduce((sum, attempt) => 
          sum + Object.keys(attempt.stages).length, 0
        )
      });
    }),
    // Combine all company groups into a single array
    scan((companies, company) => {
      const index = companies.findIndex(c => c.company === company.company);
      if (index >= 0) {
        return [
          ...companies.slice(0, index),
          company,
          ...companies.slice(index + 1)
        ];
      }
      return [...companies, company];
    }, [] as GroupedCompany[]),
    tap(companies => {
      console.log('📈 Current companies state:', {
        companyCount: companies.length,
        totalAttempts: companies.reduce((sum, company) => 
          sum + company.attempts.length, 0
        )
      });
    }),
    // Sort companies by name
    map(companies => 
      companies.sort((a, b) => (a.companyName || a.company).localeCompare(b.companyName || b.company))
    ),
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
