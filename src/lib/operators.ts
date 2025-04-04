import { Observable, OperatorFunction, pipe, map, groupBy, mergeMap, reduce, from, min, scan, catchError, of, share, tap, BehaviorSubject, withLatestFrom, switchMap, distinctUntilChanged } from 'rxjs';
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
  // Create a shared subject to track thread-company associations
  const threadCompanyAssociations = new BehaviorSubject<Record<string, string>>({});
  
  return pipe(
    // First, process each job to update thread-company associations
    tap(job => {
      console.log('👥 Processing job for associations:', {
        id: job.id,
        companyName: job.data.companyName,
        threadId: job.data.threadId
      });
      
      // If this job has both a threadId and companyName, update the associations
      if (job.data.threadId && job.data.companyName) {
        threadCompanyAssociations.next({
          ...threadCompanyAssociations.getValue(),
          [job.data.threadId]: job.data.companyName
        });
      }
    }),
    // Group by threadId to process jobs in the same thread together
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
    // Process each thread group reactively
    mergeMap(threadGroup => {
      // Create a stream that combines each job with the latest associations
      return threadGroup.pipe(
        // For each job in the thread, combine with latest associations
        withLatestFrom(threadCompanyAssociations),
        // Update job company name based on thread associations
        map(([jobData, associations]) => {
          const threadId = jobData.threadId;
          const companyName = jobData.job.data.companyName || 
                             (threadId && associations[threadId]);
          
          // If we have a company name from associations, apply it
          if (companyName && !jobData.job.data.companyName) {
            // Create a new job object with updated company name
            const updatedJob = {
              ...jobData.job,
              data: {
                ...jobData.job.data,
                companyName
              }
            };
            
            return {
              ...jobData,
              job: updatedJob
            };
          }
          
          return jobData;
        }),
        // Share the processed jobs stream
        share()
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
    mergeMap(group => {
      // Create a subject to track the accumulated state for this company
      const companyState = new BehaviorSubject({
        company: group.key,
        companyName: undefined as string | undefined,
        description: undefined as string | undefined,
        threads: new Map<string, QueueJob[]>()
      });
      
      // Process each job in the company group
      return group.pipe(
        // Update company state with each job
        tap(data => {
          const { job, threadId } = data;
          const currentState = companyState.getValue();
          
          // Get current jobs for this thread
          const threadJobs = currentState.threads.get(threadId) || [];
          
          // Add job to thread, replacing if it already exists
          const updatedJobs = [
            ...threadJobs.filter(j => j.id !== job.id || j.queueId !== job.queueId), 
            job
          ];
          
          // Create new threads map with updated jobs
          const newThreads = new Map(currentState.threads);
          newThreads.set(threadId, updatedJobs);
          
          // Update company info if available
          const newCompanyName = job.data.companyName || currentState.companyName;
          const newDescription = job.data.description || currentState.description;
          
          // Update the company state
          companyState.next({
            company: currentState.company,
            companyName: newCompanyName,
            description: newDescription,
            threads: newThreads
          });
        }),
        // Convert the latest company state to GroupedCompany format
        switchMap(() => companyState),
        map(({ company, companyName, description, threads }) => {
          // Convert threads Map to attempts array
          const attempts = Array.from(threads.entries()).map(([threadId, jobs]) => {
            // Find the latest job in this thread
            const latestJob = jobs.reduce((latest, job) => 
              job.timestamp > (latest?.timestamp ?? 0) ? job : latest
            , jobs[0]);
            
            // Create stages object from jobs
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
              jobs, // Include all jobs for this thread
              stages
            };
          });
          
          // Sort attempts by timestamp (newest first)
          const sortedAttempts = [...attempts].sort((a, b) => {
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
        // Only emit when the company state changes
        distinctUntilChanged((prev, curr) => {
          // Simple check for equality based on thread count and job count
          const prevJobCount = Array.from(prev.threads.values()).flat().length;
          const currJobCount = Array.from(curr.threads.values()).flat().length;
          return prevJobCount === currJobCount && prev.threads.size === curr.threads.size;
        })
      );
    }),
    // Combine all company groups into a single array using a shared state
    scan((companies, company) => {
      // Find if this company already exists in our array
      const index = companies.findIndex(c => c.company === company.company);
      
      // Replace or add the company
      if (index >= 0) {
        return [
          ...companies.slice(0, index),
          company,
          ...companies.slice(index + 1)
        ];
      }
      return [...companies, company];
    }, [] as GroupedCompany[]),
    
    // Sort companies by name
    map(companies => 
      [...companies].sort((a, b) => 
        (a.companyName || a.company).localeCompare(b.companyName || b.company)
      )
    ),
    
    // Log the current state
    tap(companies => {
      console.log('📈 Current companies state:', {
        companyCount: companies.length,
        totalAttempts: companies.reduce((sum, company) => 
          sum + company.attempts.length, 0
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
