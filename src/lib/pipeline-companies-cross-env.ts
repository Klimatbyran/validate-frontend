import {
  ApiAuthError,
  garboAuthFetch,
  throwIfAuthError,
} from "@/lib/garbo-auth-fetch";
import {
  getProdPipelineCompaniesListUrl,
  getStagePipelineCompaniesListUrl,
} from "@/config/api-env";
import type { Company } from "@/tabs/errors/types";

/** Error Browser: staff pipeline company lists from fixed stage/prod Unearth hosts. */
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

export async function fetchStagePipelineCompanies(): Promise<Company[]> {
  return fetchPipelineCompanies("Stage", getStagePipelineCompaniesListUrl());
}

export async function fetchProdPipelineCompanies(): Promise<Company[]> {
  return fetchPipelineCompanies("Prod", getProdPipelineCompaniesListUrl());
}

export async function fetchStageAndProdPipelineCompanies(): Promise<{
  stageCompanies: Company[];
  prodCompanies: Company[];
  stageUrl: string;
  prodUrl: string;
}> {
  const stageUrl = getStagePipelineCompaniesListUrl();
  const prodUrl = getProdPipelineCompaniesListUrl();

  const [stageCompanies, prodCompanies] = await Promise.all([
    fetchStagePipelineCompanies(),
    fetchProdPipelineCompanies(),
  ]);

  return { stageCompanies, prodCompanies, stageUrl, prodUrl };
}

export { ApiAuthError };
