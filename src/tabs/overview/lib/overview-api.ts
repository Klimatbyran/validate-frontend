import { getUnearthApiBaseUrl } from "@/config/api-env";
import type {
  OverviewDailyActivityResponse,
  OverviewSummaryResponse,
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

export type ProdToStageBuildDiagnostics = {
  prodShells: number;
  skippedUnlinked: number;
  skippedNoFullyVerifiedOnProd: number;
  skippedStageHasEmissions: number;
  includedWithoutReportUrl: number;
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

export async function fetchOverviewSummary(): Promise<OverviewSummaryResponse> {
  return fetchOverviewJson(`${overviewBaseUrl()}/summary`);
}

export async function fetchOverviewDailyActivity(
  day: string,
): Promise<OverviewDailyActivityResponse> {
  const params = new URLSearchParams();
  appendQuery(params, "day", day);
  return fetchOverviewJson(
    `${overviewBaseUrl()}/summary/activity?${params.toString()}`,
  );
}

export async function fetchProdToStageOverview(
  filters: ProdToStageFilters,
  page: number,
  pageSize = OVERVIEW_PAGE_SIZE,
): Promise<ProdToStageOverviewResponse> {
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
  appendCsv(params, "tagSlugs", filters.tagSlugs);
  if (filters.runnableOnly) params.set("runnableOnly", "true");

  return fetchOverviewJson(
    `${overviewBaseUrl()}/prod-to-stage?${params.toString()}`,
  );
}

export { OVERVIEW_PAGE_SIZE };
