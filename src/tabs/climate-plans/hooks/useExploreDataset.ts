import { useEffect, useState } from "react";
import { loadExploreDataset } from "../lib/explore-dataset";
import type { ExploreDataset } from "../lib/explore-types";

export function useExploreDataset(enabled: boolean) {
  const [data, setData] = useState<ExploreDataset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);

    loadExploreDataset()
      .then((dataset) => {
        if (!cancelled) {
          setData(dataset);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load explore data",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, isLoading, error };
}
