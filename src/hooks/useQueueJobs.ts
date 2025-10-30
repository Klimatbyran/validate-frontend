import useSWR from 'swr';
import { fetchQueueJobs } from '@/lib/api';
import { queueStore } from '@/lib/queue-store';
import type { QueueJobsResponse } from '@/lib/types';

export function useQueueJobs(queueName: string) {
  const { data, error, isLoading, mutate } = useSWR<QueueJobsResponse>(
    queueName ? ['queue-jobs', queueName] : null,
    () => fetchQueueJobs(queueName),
    {
      refreshInterval: 30000, // Poll every 30s to reduce browser churn
      errorRetryCount: 3,
      errorRetryInterval: 5000,
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
      onSuccess: (data) => {
        // Update the queue store when new data arrives
        if (data?.queue) {
          queueStore.updateQueue(queueName, data.queue);
        }
      }
    }
  );

  return {
    queue: data?.queue,
    isLoading,
    isError: !!error,
    error,
    refresh: () => mutate(),
  };
}
