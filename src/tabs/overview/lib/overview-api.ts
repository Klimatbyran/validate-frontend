import { getUnearthApiBaseUrl } from "@/config/api-env";
import type {
  OverviewFilters,
  OverviewRow,
  OverviewStats,
  OverviewWarning,
  ProdToStageFilters,
  ProdToStageRow,
} from "@/tabs/overview/lib/overview-types";

const OVERVIEW_PAGE_SIZE = 50;

export type { OverviewWarning };

export type OverviewPageMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CompanyYearsOverviewResponse = OverviewPageMeta & {
  rows: OverviewRow[];
  stats: OverviewStats;
  reportYears: string[];
  warnings?: OverviewWarning[];
  localEnv?: "stage" | "prod";
};

export type RegistryReportsOverviewResponse = CompanyYearsOverviewResponse;

export type ProdToStageBuildDiagnostics = {
  prodShells: number;
  skippedUnlinked: number;
  skippedNoFullyVerifiedOnProd: number;
  skippedStageHasEmissions: number;
  included: number;
};

export type ProdToStageOverviewResponse = OverviewPageMeta & {
  rows: ProdToStageRow[];
  stats: { totalRows: number; runnable: number };
  diagnostics: ProdToStageBuildDiagnostics;
  stageCompanyCount: number;
  prodCompanyCount: number;
  reportYears: string[];
  warnings?: OverviewWarning[];
  localEnv?: "stage" | "prod";
};

function overviewBaseUrl(): string {
  return `${getUnearthApiBaseUrl()}/internal-validate-overview`;
}

function appendQuery(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value?.trim()) params.set(key, value.trim());
}

function appendCsv(
  params: URLSearchParams,
  key: string,
  values: string[],
): void {
  if (values.length > 0) params.set(key, values.join(","));
}

function sharedOverviewParams(
  filters: { searchQuery: string; reportYears: string[] },
  page: number,
  pageSize: number,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  appendQuery(params, "searchQuery", filters.searchQuery);
  if (filters.reportYears.length > 0) {
    appendCsv(params, "reportYears", filters.reportYears);
  } else {
    params.set("allYears", "true");
  }
  return params;
}

async function fetchOverviewJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    credentials: "omit",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Overview request failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return response.json() as Promise<T>;
}

export async function fetchCompanyYearsOverview(
  filters: OverviewFilters,
  page: number,
  pageSize = OVERVIEW_PAGE_SIZE,
): Promise<CompanyYearsOverviewResponse> {
  const params = sharedOverviewParams(filters, page, pageSize);
  appendCsv(params, "tagSlugs", filters.tagSlugs);
  appendCsv(params, "statusFilters", filters.statusFilters);
  if (filters.missingRegistryOnly) params.set("missingRegistryOnly", "true");
  if (filters.missingCompanyReportOnly) {
    params.set("missingCompanyReportOnly", "true");
  }
  if (filters.notRunInPipelineOnly) params.set("notRunInPipelineOnly", "true");

  return fetchOverviewJson(
    `${overviewBaseUrl()}/company-years?${params.toString()}`,
  );
}

export async function fetchRegistryReportsOverview(
  filters: OverviewFilters,
  page: number,
  pageSize = OVERVIEW_PAGE_SIZE,
): Promise<RegistryReportsOverviewResponse> {
  const params = sharedOverviewParams(filters, page, pageSize);
  appendCsv(params, "statusFilters", filters.statusFilters);
  if (filters.missingRegistryOnly) params.set("missingRegistryOnly", "true");
  if (filters.missingCompanyReportOnly) {
    params.set("missingCompanyReportOnly", "true");
  }
  if (filters.notRunInPipelineOnly) params.set("notRunInPipelineOnly", "true");

  return fetchOverviewJson(
    `${overviewBaseUrl()}/registry-reports?${params.toString()}`,
  );
}

export async function fetchProdToStageOverview(
  filters: ProdToStageFilters,
  page: number,
  pageSize = OVERVIEW_PAGE_SIZE,
): Promise<ProdToStageOverviewResponse> {
  const params = sharedOverviewParams(filters, page, pageSize);
  appendCsv(params, "tagSlugs", filters.tagSlugs);
  if (filters.runnableOnly) params.set("runnableOnly", "true");

  return fetchOverviewJson(
    `${overviewBaseUrl()}/prod-to-stage?${params.toString()}`,
  );
}

export { OVERVIEW_PAGE_SIZE };
