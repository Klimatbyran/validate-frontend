import {
  getProdPipelineCompaniesListUrl,
  getStagePipelineCompaniesListUrl,
} from "@/config/api-env";
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
