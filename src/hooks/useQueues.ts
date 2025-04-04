import useSWR from 'swr';
import { fetchQueues, fetchQueueJobs } from '@/lib/api';
import type { QueuesResponse } from '@/lib/types';
import { WORKFLOW_STAGES } from '@/lib/constants';
import { queueStore } from '@/lib/queue-store';
import { toast } from 'sonner';

import { from, forkJoin } from 'rxjs';
import { mergeMap, map, catchError, tap, toArray, delay } from 'rxjs/operators';

export function useQueues(page = 1, jobsPerPage = 20) {
  const { data, error, isLoading, mutate } = useSWR<QueuesResponse>(
    ['queues', page, jobsPerPage],
    async () => {
      // Create a reactive pipeline to fetch all queues
      return from(WORKFLOW_STAGES).pipe(
        // Process in batches of 3 to reduce server load
        mergeMap((stage, index) => {
          // Add a small delay between requests based on index to stagger them
          const staggerDelay = Math.floor(index / 3) * 300;
          
          return from(fetchQueueJobs(stage.id, 'latest', page, jobsPerPage)).pipe(
            delay(staggerDelay),
            map(response => ({
              ...response.queue,
              name: stage.id
            })),
            tap(queue => {
              // Update the queue store immediately when data arrives
              queueStore.updateQueue(stage.id, queue);
            }),
            catchError(error => {
              console.error(`❌ Failed to fetch queue ${stage.id}:`, error);
              return from([null]); // Return null for failed queues
            })
          );
        }, 3), // Concurrency limit of 3
        toArray(),
        map(queues => ({
          queues: queues.filter(Boolean) // Filter out nulls
        }))
      ).toPromise();
    },
    {
      refreshInterval: 10000, // Increased from 5000 to 10000 to reduce server load
      errorRetryCount: 3,
      errorRetryInterval: (retryCount) => Math.min(1000 * 2 ** retryCount, 30000),
      shouldRetryOnError: (error) => {
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
      onError: (error) => {
        console.error('❌ Queue fetch error:', error);
        toast.error('Kunde inte hämta ködata: ' + error.message);
      }
    }
  );

  return {
    queues: data?.queues ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    error,
    refresh: () => {
      console.log('🔄 Manually refreshing queues');
      return mutate();
    },
  };
}
