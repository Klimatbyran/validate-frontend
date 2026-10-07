import {
  getProdPipelineCompaniesListUrl,
  getStagePipelineCompaniesListUrl,
  PIPELINE_COMPANIES_LIST_PATH,
  type ApiTarget,
} from "@/config/api-env";
import type { Company } from "@/tabs/errors/types";

export type SuspiciousDataSource = ApiTarget;

const TARGET_LABELS: Record<SuspiciousDataSource, string> = {
  local: "Local",
  stage: "Stage",
  prod: "Prod",
};

export function availableSuspiciousDataSources(): SuspiciousDataSource[] {
  return import.meta.env.DEV ? ["local", "stage", "prod"] : ["stage", "prod"];
}

export function getPipelineCompaniesListUrlForSource(
  source: SuspiciousDataSource,
): string {
  if (source === "prod") return getProdPipelineCompaniesListUrl();
  if (source === "local") {
    // Deployed builds have no local upstream; fall back to stage like Errors tab.
    if (!import.meta.env.DEV) return getStagePipelineCompaniesListUrl();
    return `/unearth-local/api${PIPELINE_COMPANIES_LIST_PATH}`;
  }
  return getStagePipelineCompaniesListUrl();
}

/**
 * Staff company list for the chosen environment. Proxies inject X-API-Key in
 * dev/deployed validate builds; a Bearer token is forwarded when present so
 * environments that only accept staff JWTs still work.
 */
export async function fetchPipelineCompaniesForSource(
  source: SuspiciousDataSource,
  token: string | null,
): Promise<Company[]> {
  const url = getPipelineCompaniesListUrlForSource(source);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "omit",
  });

  if (response.ok) {
    return response.json() as Promise<Company[]>;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Your account is not authorised to read ${TARGET_LABELS[source]} pipeline data.`,
    );
  }

  const body = await response.text().catch(() => "");
  throw new Error(
    `Failed to fetch ${TARGET_LABELS[source]} pipeline companies (${response.status}) from ${url}${
      body ? `: ${body.slice(0, 200)}` : ""
    }`,
  );
}

export function sourceLabelKey(source: SuspiciousDataSource): string {
  return `suspicious.source.${source}`;
}
