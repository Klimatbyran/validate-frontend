/**
 * Garbo Postgres `Batch` rows for upload / jobstatus / archive (same source of truth).
 * Requires auth; returns empty list if unauthenticated or request fails.
 */

import { useState, useEffect, useCallback } from "react";
import { getGarboQueueArchiveUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { GarboBatchOption } from "@/lib/garbo-batch-types";

const BATCHES_LIMIT = 500;

export function useBatches(): {
  batches: GarboBatchOption[];
  isLoading: boolean;
  refetch: () => void;
} {
  const [batches, setBatches] = useState<GarboBatchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refetch = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const res = await garboAuthFetch(
          getGarboQueueArchiveUrl(`/batches?limit=${BATCHES_LIMIT}`),
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          batches?: GarboBatchOption[];
        };
        const list = Array.isArray(data.batches) ? data.batches : [];
        if (!cancelled) setBatches(list);
      } catch {
        if (!cancelled) {
          setBatches((prev) => (prev.length === 0 ? [] : prev));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { batches, isLoading, refetch };
}
