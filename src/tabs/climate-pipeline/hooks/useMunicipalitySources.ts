import { useCallback, useEffect, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";

export interface MunicipalitySource {
  id: string;
  municipality: string;
  county: string;
  url: string | null;
  contact: string | null;
  adoptedYear: number | null;
  planName: string | null;
  notes: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MunicipalitySourceEdit = Partial<
  Pick<
    MunicipalitySource,
    "county" | "url" | "contact" | "adoptedYear" | "planName" | "notes"
  >
>;

export function useMunicipalitySources(county: string) {
  const [sources, setSources] = useState<MunicipalitySource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (county) params.set("county", county);
      const res = await fetch(
        `${getClimatePlansPipelineApiUrl()}/municipality-sources?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setSources((await res.json()) as MunicipalitySource[]);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load municipalities",
      );
    } finally {
      setIsLoading(false);
    }
  }, [county]);

  useEffect(() => {
    void fetchSources();
  }, [fetchSources]);

  return { sources, isLoading, error, refresh: fetchSources };
}

export async function updateMunicipalitySource(
  id: string,
  edit: MunicipalitySourceEdit,
): Promise<MunicipalitySource> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/municipality-sources/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as MunicipalitySource;
}

export async function runMunicipalitySource(
  id: string,
): Promise<{ jobId: string; url: string }> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/municipality-sources/${id}/run`,
    { method: "POST" },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as { jobId: string; url: string };
}

export interface RunRegionResult {
  county: string;
  started: { id: string; municipality: string; jobId: string }[];
  skippedNoUrl: string[];
}

/** Bulk-triggers every municipality in a county that has a url — same
 * extractMunicipality chain as a single run, so results land as real
 * ClimatePlan rows the normal way, just started all at once. Meaningful
 * real cost (one real fetch+extraction per municipality), so the UI
 * confirms before calling this. */
export async function runMunicipalityRegion(
  county: string,
): Promise<RunRegionResult> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/municipality-sources/run-region`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ county }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as RunRegionResult;
}
