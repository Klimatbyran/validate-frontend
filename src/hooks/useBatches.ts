/**
 * Fetches available batch IDs from the API. Shared by Upload tab (batch choice)
 * and Job status tab (batch filter).
 */

import { useState, useEffect } from "react";
import { authenticatedFetch } from "@/lib/api-helpers";
import { BATCHES_API_ENDPOINT } from "@/lib/api";

export function useBatches(): { batches: string[]; isLoading: boolean } {
  const [batches, setBatches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBatches([]);
    setIsLoading(true);
    (async () => {
      try {
        const res = await authenticatedFetch(BATCHES_API_ENDPOINT);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const ids = Array.isArray(data)
          ? data
          : data?.batchIds ?? data?.batches ?? [];
        if (Array.isArray(ids) && !cancelled) setBatches(ids);
      } catch {
        // Non-fatal: dropdown will be empty
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { batches, isLoading };
}
