import useSWR from "swr";
import { fetchQueueJobs } from "@/lib/api";
import type { QueuesResponse } from "@/lib/types";
import { getWorkflowStages } from "@/lib/workflow-config";
import { queueStore } from "@/lib/queue-store";
import { toast } from "sonner";

// VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler
// och blockerande metoder som toArray() är FÖRBJUDNA.
import { from, forkJoin, of, EMPTY } from "rxjs";
import {
  mergeMap,
  map,
  catchError,
  delay,
  reduce,
  scan,
  tap,
} from "rxjs/operators";

export function useQueues(page = 1, jobsPerPage = 20) {
  const { data, error, isLoading, mutate } = useSWR<QueuesResponse>(
    ["queues", page, jobsPerPage],
    async () => {
      // Simple approach: fetch each queue individually
      const queuePromises = getWorkflowStages().map(async (stage) => {
        try {
          // Load queue data
          queueStore.loadQueueWithUpdates(stage.id);

          // Fetch initial data
          const response = await fetchQueueJobs(
            stage.id,
            "latest",
            page,
            jobsPerPage
          );

          // Update queue store
          queueStore.updateQueue(stage.id, response.queue);

          return {
            ...response.queue,
            name: stage.id,
          };
        } catch (error) {
          console.warn(`Failed to load queue ${stage.id}:`, error);

          return null;
        }
      });

      const queues = await Promise.all(queuePromises);
      const validQueues = queues.filter((queue) => queue !== null);

      return {
        queues: validQueues,
        total: validQueues.length,
      };
    },
    {
      refreshInterval: 10000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      shouldRetryOnError: (error: any) => {
        const message = error?.message?.toLowerCase() || "";
        return (
          !message.includes("åtkomst nekad") &&
          !message.includes("logga in") &&
          !message.includes("ogiltig data") &&
          !message.includes("kunde inte hitta")
        );
      },
      dedupingInterval: 1000,
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onError: (error: any) => {
        toast.error(
          "Kunde inte hämta ködata: " + (error?.message || "Unknown error")
        );
      },
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
