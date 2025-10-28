import useSWR from 'swr';
import { fetchQueueJobs } from '@/lib/api';
import { queueStore } from '@/lib/queue-store';
import type { QueueJobsResponse } from '@/lib/types';

export function useQueueJobs(queueName: string, status?: string) {
  const { data, error, isLoading, mutate } = useSWR<QueueJobsResponse>(
    queueName ? ['queue-jobs', queueName, status] : null,
    () => fetchQueueJobs(queueName, status),
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
      onSuccess: (data) => {
        // Update the queue store when new data arrives
        queueStore.updateQueue(queueName, data.queue);
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
