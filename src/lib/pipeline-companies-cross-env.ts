import {
  getProdPipelineCompaniesListUrl,
  getStagePipelineCompaniesListUrl,
  PIPELINE_COMPANIES_LIST_PATH,
} from "@/config/api-env";
import type { ErrorBrowserStageSource } from "@/config/api-env";
import type { Company } from "@/tabs/errors/types";

/** Error Browser: internal pipeline lists from fixed stage/prod Unearth hosts (X-API-Key via proxy). */
async function fetchPipelineCompanies(
  label: "Stage" | "Prod",
  url: string,
): Promise<Company[]> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    credentials: "omit",
  });

  if (response.ok) {
    return response.json() as Promise<Company[]>;
  }

  const body = await response.text().catch(() => "");
  throw new Error(
    `Failed to fetch ${label} pipeline companies (${response.status}) from ${url}${body ? `: ${body.slice(0, 200)}` : ""}`,
  );
}

/**
 * Stage list URL, routed to a locally-running Unearth API when the Errors tab's
 * "Stage source" is set to Local (dev server proxy only - see vite.config.ts's
 * /unearth-local target).
 */
function getStageOrLocalPipelineCompaniesListUrl(
  source: ErrorBrowserStageSource,
): string {
  if (source === "local" && import.meta.env.DEV) {
    return `/unearth-local/api${PIPELINE_COMPANIES_LIST_PATH}`;
  }
  return getStagePipelineCompaniesListUrl();
}

export async function fetchStagePipelineCompanies(
  source: ErrorBrowserStageSource = "stage",
): Promise<Company[]> {
  return fetchPipelineCompanies(
    "Stage",
    getStageOrLocalPipelineCompaniesListUrl(source),
  );
}

export async function fetchProdPipelineCompanies(): Promise<Company[]> {
  return fetchPipelineCompanies("Prod", getProdPipelineCompaniesListUrl());
}

export async function fetchStageAndProdPipelineCompanies(
  source: ErrorBrowserStageSource = "stage",
): Promise<{
  stageCompanies: Company[];
  prodCompanies: Company[];
  stageUrl: string;
  prodUrl: string;
}> {
  const stageUrl = getStageOrLocalPipelineCompaniesListUrl(source);
  const prodUrl = getProdPipelineCompaniesListUrl();

  const [stageCompanies, prodCompanies] = await Promise.all([
    fetchStagePipelineCompanies(source),
    fetchProdPipelineCompanies(),
  ]);

  return { stageCompanies, prodCompanies, stageUrl, prodUrl };
}
