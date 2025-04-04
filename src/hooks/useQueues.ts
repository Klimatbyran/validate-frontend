import useSWR from 'swr';
import { fetchQueues, fetchQueueJobs } from '@/lib/api';
import type { QueuesResponse } from '@/lib/types';
import { WORKFLOW_STAGES } from '@/lib/constants';
import { queueStore } from '@/lib/queue-store';
import { toast } from 'sonner';

export function useQueues(page = 1, jobsPerPage = 20) {
  const { data, error, isLoading, mutate } = useSWR<QueuesResponse>(
    ['queues', page, jobsPerPage],
    async () => {
      // Create a map to store queue data as it arrives
      const queueMap = new Map();

      // Fetch jobs for each queue in parallel and update the store as data arrives
      const queuePromises = WORKFLOW_STAGES.map(stage => 
        fetchQueueJobs(stage.id, 'latest', page, jobsPerPage)
          .then(response => {
            const queue = {
              ...response.queue,
              name: stage.id
            };
            
            // Update the queue store immediately when data arrives
            queueStore.updateQueue(stage.id, queue);
            queueMap.set(stage.id, queue);
            
            return queue;
          })
          .catch(error => {
            console.error(`❌ Failed to fetch queue ${stage.id}:`, error);
            return null;
          })
      );

      // Wait for all queues to complete
      await Promise.all(queuePromises);

      // Convert map to array for final response
      const queues = Array.from(queueMap.values()).filter(Boolean);

      return { queues };
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
