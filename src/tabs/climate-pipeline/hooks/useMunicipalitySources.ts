import { useCallback, useEffect, useState } from "react";
import {
  CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
  getClimatePlansPipelineApiUrl,
  getClimatePlansPipelineWebhookUrl,
} from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import { createJobsFromUrls } from "@/tabs/upload/lib/upload-api";

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

/** Triggers the real docling parse + Chroma indexing via the same
 * createJobsFromUrls call the upload tab uses to add a climate plan —
 * garbo posts the parsed markdown to our own /webhook once it's done,
 * which is what actually enqueues extractMunicipality. Enqueuing that
 * job directly (skipping this call) fails for any url not already
 * indexed in Chroma from a prior upload. The backend /run call after it
 * is bookkeeping only (records lastRunAt). */
export async function runMunicipalitySource(
  id: string,
  url: string,
): Promise<void> {
  await createJobsFromUrls({
    urls: [url],
    autoApprove: false,
    forceReindex: false,
    callbackUrl: getClimatePlansPipelineWebhookUrl(),
    reportTypeSlug: CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
  });

  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/municipality-sources/${id}/run`,
    { method: "POST" },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
}

export interface RunRegionResult {
  county: string;
  started: { id: string; municipality: string }[];
  skippedNoUrl: string[];
}

/** Bulk version of runMunicipalitySource above — one createJobsFromUrls
 * call with every url in the county, then one backend call to record
 * lastRunAt for all of them. Meaningful real cost (one real
 * fetch+extraction per municipality), so the UI confirms before calling
 * this. */
export async function runMunicipalityRegion(
  county: string,
  urls: string[],
): Promise<RunRegionResult> {
  if (urls.length > 0) {
    await createJobsFromUrls({
      urls,
      autoApprove: false,
      forceReindex: false,
      callbackUrl: getClimatePlansPipelineWebhookUrl(),
      reportTypeSlug: CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
    });
  }

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
