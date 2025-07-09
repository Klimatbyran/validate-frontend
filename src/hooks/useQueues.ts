import useSWR from 'swr';
import { fetchQueueJobs } from '@/lib/api';
import type { QueuesResponse } from '@/lib/types';
import { WORKFLOW_STAGES } from '@/lib/constants';
import { queueStore } from '@/lib/queue-store';
import { toast } from 'sonner';

// VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler 
// och blockerande metoder som toArray() är FÖRBJUDNA.
import { from, forkJoin, of, EMPTY } from 'rxjs';
import { mergeMap, map, catchError, delay, reduce, scan, tap } from 'rxjs/operators';

export function useQueues(page = 1, jobsPerPage = 20) {
  const { data, error, isLoading, mutate } = useSWR<QueuesResponse>(
    ['queues', page, jobsPerPage],
    async () => {
      // Simple approach: fetch each queue individually
      const queuePromises = WORKFLOW_STAGES.map(async (stage) => {
        try {
          console.log(`Loading queue: ${stage.id}`);
          
          // Load queue data
          queueStore.loadQueueWithUpdates(stage.id);
          
          // Fetch initial data
          const response = await fetchQueueJobs(stage.id, 'latest', page, jobsPerPage);
          
          console.log(`Queue ${stage.id} response:`, response);
          
          // Special debugging for precheck
          if (stage.id === 'precheck') {
            console.log('🔍 Precheck queue details:', {
              jobs: response.queue.jobs?.length || 0,
              counts: response.queue.counts,
              isPaused: response.queue.isPaused
            });
            
            // Log individual job details for precheck
            if (response.queue.jobs && response.queue.jobs.length > 0) {
              console.log('🔍 Precheck jobs:', response.queue.jobs.map(job => ({
                id: job.id,
                threadId: job.data.threadId,
                company: job.data.company,
                status: job.finishedOn ? 'completed' : job.processedOn ? 'processing' : 'waiting'
              })));
            }
          }
          
          if (stage.id === 'precheck') {
            console.log('Fetched precheck jobs from API:', response.queue.jobs);
            console.log('About to update queueStore for precheck with:', response.queue);
          }
          // Update queue store
          queueStore.updateQueue(stage.id, response.queue);
          
          return {
            ...response.queue,
            name: stage.id
          };
        } catch (error) {
          console.warn(`Failed to load queue ${stage.id}:`, error);
          
          // Special debugging for precheck errors
          if (stage.id === 'precheck') {
            console.error('🔍 Precheck queue error:', error);
          }
          
          return null;
        }
      });

      const queues = await Promise.all(queuePromises);
      const validQueues = queues.filter(queue => queue !== null);

      return {
        queues: validQueues,
        total: validQueues.length
      };
    },
    {
      refreshInterval: 10000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      shouldRetryOnError: (error: any) => {
        const message = error?.message?.toLowerCase() || '';
        return !message.includes('åtkomst nekad') &&
               !message.includes('logga in') &&
               !message.includes('ogiltig data') &&
               !message.includes('kunde inte hitta');
      },
      dedupingInterval: 1000,
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onError: (error: any) => {
        toast.error('Kunde inte hämta ködata: ' + (error?.message || 'Unknown error'));
      }
    }
  );

  return {
    queues: data?.queues ?? [],
    total: data?.queues?.length ?? 0,
    isLoading,
    isError: !!error,
    error,
    refresh: () => {
      return mutate();
    },
  };
}
