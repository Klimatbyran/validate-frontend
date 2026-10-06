import { useState, useEffect } from "react";
import type { MunicipalityMeasures } from "../lib/measures-types";
import { fetchPipelineMeasures } from "../lib/pipeline-measures";
import { loadStaticMeasures } from "../lib/static-measures";

export function useMeasures() {
  const [data, setData] = useState<MunicipalityMeasures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [staticResults, pipelineResults] = await Promise.all([
          loadStaticMeasures(),
          fetchPipelineMeasures(),
        ]);

        if (!cancelled) {
          setData([...staticResults, ...pipelineResults]);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
