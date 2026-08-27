import { useState, useEffect } from "react";
import type {
  MunicipalityMeasures,
  MeasuresIndex,
  Measure,
} from "../lib/measures-types";
import { fetchPipelineMeasures } from "../lib/pipeline-measures";

/** Static files are optional now that climate-plans-pipeline can supply
 * live data — a missing/absent index.json just means zero static entries,
 * not a hard failure. */
async function loadStaticMeasures(): Promise<MunicipalityMeasures[]> {
  try {
    const indexRes = await fetch("/climate-plans/measures/index.json");
    if (!indexRes.ok) return [];
    const text = await indexRes.text();
    if (!text.trim().startsWith("{")) return [];
    const index: MeasuresIndex = JSON.parse(text);

    const results: MunicipalityMeasures[] = [];
    for (const entry of index.municipalities) {
      const res = await fetch(`/climate-plans/measures/${entry.file}`);
      if (!res.ok) {
        console.warn(`Failed to load measures for ${entry.id}, skipping`);
        continue;
      }
      const measures: Measure[] = await res.json();
      results.push({ id: entry.id, name: entry.name, measures });
    }
    return results;
  } catch (err) {
    console.warn("[useMeasures] Failed to load static measures", err);
    return [];
  }
}

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
