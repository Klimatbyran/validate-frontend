import {
  getProdPipelineCompaniesListUrl,
  getStagePipelineCompaniesListUrl,
  PIPELINE_COMPANIES_LIST_PATH,
  type ApiTarget,
} from "@/config/api-env";
import {
  fetchProdPipelineCompanies,
  fetchStagePipelineCompanies,
} from "@/lib/pipeline-companies-cross-env";
import type { Company } from "@/tabs/errors/types";

export type SuspiciousDataSource = ApiTarget;

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
 * Staff company list for the chosen environment. Reuses the Errors-tab
 * fetchers so stage/prod/local reads go through the same proxy-injected
 * X-API-Key path (no session Bearer on a mismatched host).
 */
export async function fetchPipelineCompaniesForSource(
  source: SuspiciousDataSource,
): Promise<Company[]> {
  if (source === "prod") return fetchProdPipelineCompanies();
  if (source === "local") return fetchStagePipelineCompanies("local");
  return fetchStagePipelineCompanies("stage");
}

export function sourceLabelKey(source: SuspiciousDataSource): string {
  return `suspicious.source.${source}`;
}
