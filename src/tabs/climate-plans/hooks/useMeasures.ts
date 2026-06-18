import { useState, useEffect } from "react";
import type {
  MunicipalityMeasures,
  MeasuresIndex,
  Measure,
} from "../lib/measures-types";

export function useMeasures() {
  const [data, setData] = useState<MunicipalityMeasures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const indexRes = await fetch("/climate-plans/measures/index.json");
        if (!indexRes.ok) {
          throw new Error(
            "Measures index not found. Add public/climate-plans/measures/ with municipality JSON files.",
          );
        }
        const text = await indexRes.text();
        if (!text.trim().startsWith("{")) {
          throw new Error("Measures index not found.");
        }
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

        if (!cancelled) {
          setData(results);
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
