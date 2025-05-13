import useSWR from 'swr';
import { fetchQueueJobs } from '@/lib/api';
import type { QueuesResponse } from '@/lib/types';
import { WORKFLOW_STAGES } from '@/lib/constants';
import { queueStore } from '@/lib/queue-store';
import { toast } from 'sonner';

// VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler 
// och blockerande metoder som toArray() är FÖRBJUDNA.
import { from, lastValueFrom, of } from 'rxjs';
import { mergeMap, map, catchError, delay, scan, tap } from 'rxjs/operators';

export function useQueues(page = 1, jobsPerPage = 20) {
  const { data, error, isLoading, mutate } = useSWR<QueuesResponse>(
    ['queues', page, jobsPerPage],
    () => {
      // Skapa en reaktiv pipeline för att hämta alla köer
      return lastValueFrom(from(WORKFLOW_STAGES).pipe(
        // Bearbeta i batches om 3 för att minska serverbelastningen
        mergeMap((stage, index) => {
          // Lägg till en liten fördröjning baserad på index för att sprida ut förfrågningarna
          const staggerDelay = Math.floor(index / 3) * 300;
          
          // Starta tvåstegsprocessen för att ladda denna kö
          queueStore.loadQueueWithUpdates(stage.id);
          console.log(stage.id);
          // Returnera initiala data för att snabbt populera UI
          return from(fetchQueueJobs(stage.id, 'latest', page, jobsPerPage)).pipe(
            delay(staggerDelay),
            map(response => ({
              ...response.queue,
              name: stage.id
            })),
            tap(queue => {
              // Uppdatera queue store omedelbart när data anländer
              queueStore.updateQueue(stage.id, queue);
            }),
            catchError(error => {
              console.error(`❌ Failed to fetch queue ${stage.id}:`, error);
              return of(null); // Returnera null för misslyckade köer
            })
          );
        }, 3), // Samtidighetsgräns på 3
        // Använd scan istället för reduce/toArray för att bygga upp resultatet reaktivt
        // scan emitterar värden för varje element, inte bara i slutet som reduce
        scan((acc: any[], queue) => {
          if (queue) return [...acc, queue];
          return acc;
        }, []),
        map(queues => ({
          queues // Filtrera bort nulls redan i reduce
        }))
      ))
    },
    {
      refreshInterval: 1000000, // Increased from 5000 to 10000 to reduce server load
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
    total: data?.queues.length ?? 0,
    isLoading,
    isError: !!error,
    error,
    refresh: () => {
      console.log('🔄 Manually refreshing queues');
      return mutate();
    },
  };
}
