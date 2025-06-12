import { Pipeline } from '@/lib/types';
import useSWR from 'swr';

export function usePipeline() {
        const { data, error, isLoading, mutate } = useSWR(`/api/pipeline`, fetchJob);

  return {
    pipeline: data ?? null,
    isLoading,
    isError: error ?? false,
    error,
    refresh: () => {
      console.log('🔄 Manually refreshing queues');
      return mutate();
    },
  };
}

async function fetchJob(url: string): Promise<Pipeline> {
  const response = await fetch(url);
  if(!response.ok) throw new Error('Could not fetch pipeline');
  return await response.json();
}