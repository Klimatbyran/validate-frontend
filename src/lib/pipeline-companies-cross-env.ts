import {
  ApiAuthError,
  garboAuthFetch,
  throwIfAuthError,
} from "@/lib/garbo-auth-fetch";
import {
  getProdPipelineCompaniesListUrl,
  getStagePipelineCompaniesListUrl,
  prodPipelineCompaniesListUrlPointsAtStage,
} from "@/config/api-env";
import type { Company } from "@/tabs/errors/types";

/**
 * Stage + prod company lists for cross-env tabs (Error Browser, Overview prod→stage).
 * Always uses fixed stage/prod Unearth hosts (ignores VITE_UNEARTH_TARGET).
 *
 * Prod uses VITE_ERRORS_PROD_PIPELINE_URL when set (typically stage) until prod
 * exposes GET /api/pipeline/companies. Cross-env gaps are not meaningful until then.
 */
export function resolveCrossEnvProdPipelineCompaniesListUrl(): string {
  return getProdPipelineCompaniesListUrl();
}

/** True when prod is configured to the same URL as stage (pre-prod-deploy stub). */
export function crossEnvProdPipelineUrlUsesStageOverride(): boolean {
  return prodPipelineCompaniesListUrlPointsAtStage();
}

async function fetchPipelineCompanies(
  label: "Stage" | "Prod",
  url: string,
): Promise<Company[]> {
  const response = await garboAuthFetch(url, {
    headers: { Accept: "application/json" },
  });

  if (response.ok) {
    return response.json() as Promise<Company[]>;
  }

  throwIfAuthError(response.status);

  const body = await response.text().catch(() => "");
  throw new Error(
    `Failed to fetch ${label} pipeline companies (${response.status}) from ${url}${body ? `: ${body.slice(0, 200)}` : ""}`,
  );
}

export async function fetchStageAndProdPipelineCompanies(): Promise<{
  stageCompanies: Company[];
  prodCompanies: Company[];
  stageUrl: string;
  prodUrl: string;
}> {
  const stageUrl = getStagePipelineCompaniesListUrl();
  const prodUrl = resolveCrossEnvProdPipelineCompaniesListUrl();

  const [stageCompanies, prodCompanies] = await Promise.all([
    fetchPipelineCompanies("Stage", stageUrl),
    fetchPipelineCompanies("Prod", prodUrl),
  ]);

  return { stageCompanies, prodCompanies, stageUrl, prodUrl };
}

export { ApiAuthError };
