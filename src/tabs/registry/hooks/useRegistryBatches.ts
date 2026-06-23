import { useState, useEffect, useCallback } from "react";
import { fetchRegistryBatches } from "@/tabs/registry/lib/registry-api";
import type { GarboBatchOption } from "@/lib/garbo-batch-types";

export function useRegistryBatches(): {
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
    void (async () => {
      try {
        const list = await fetchRegistryBatches();
        if (!cancelled) setBatches(list);
      } catch {
        if (!cancelled) setBatches([]);
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
