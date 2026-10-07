import { useCallback, useEffect, useState } from "react";
import {
  CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
  getClimatePlansPipelineApiUrl,
  getClimatePlansPipelineWebhookUrl,
} from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import { createJobsFromUrls } from "@/tabs/upload/lib/upload-api";

export type MunicipalitySourceOrigin = "seed" | "companion" | "manual";

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
  /** Null for the original one-row-per-municipality seed data (the
   * municipality's main plan) — set for a row discovered via a companion
   * document reference, or added manually, so several rows for the same
   * municipality can be told apart. */
  documentTitle: string | null;
  source: MunicipalitySourceOrigin;
  createdAt: string;
  updatedAt: string;
}

export type MunicipalitySourceEdit = Partial<
  Pick<
    MunicipalitySource,
    | "county"
    | "url"
    | "contact"
    | "adoptedYear"
    | "planName"
    | "notes"
    | "documentTitle"
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

export interface NewMunicipalitySource {
  municipality: string;
  /** Required for a human-curated entry (the "Add a document" modal) —
   * optional for the Upload tab's "pick a municipality" case, which only
   * needs a registry row to exist so extractMunicipality's url match
   * auto-approves the run. */
  documentTitle?: string | null;
  county?: string;
  url?: string | null;
  contact?: string | null;
  adoptedYear?: number | null;
  planName?: string | null;
  notes?: string | null;
}

/** Adds a document a human already knows about but auto-discovery
 * (groupDocumentReferences, when a companion reference is found) hasn't.
 * county is optional — the backend inherits it from the municipality's
 * existing primary row when omitted. */
export async function createMunicipalitySource(
  input: NewMunicipalitySource,
): Promise<MunicipalitySource> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/municipality-sources`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
    readImages: true,
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
 * call with exactly the rows the caller decided to include (e.g. the
 * county's own plans only, or those plus companion documents too — the
 * caller picks the subset, this just runs it), then one backend call
 * with the same ids to record lastRunAt for exactly those rows. Passing
 * ids rather than re-deriving "everything in this county" on the backend
 * matters here specifically — it's what keeps the two "run region"
 * buttons from bookkeeping rows the other one didn't actually trigger.
 * Meaningful real cost (one real fetch+extraction per municipality), so
 * the UI confirms before calling this. */
export async function runMunicipalityRegion(
  county: string,
  rows: { id: string; url: string }[],
): Promise<RunRegionResult> {
  if (rows.length > 0) {
    await createJobsFromUrls({
      urls: rows.map((r) => r.url),
      autoApprove: false,
      forceReindex: false,
      readImages: true,
      callbackUrl: getClimatePlansPipelineWebhookUrl(),
      reportTypeSlug: CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
    });
  }

  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/municipality-sources/run-region`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ county, ids: rows.map((r) => r.id) }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as RunRegionResult;
}
