import type { RegistryEntry } from "@/tabs/registry/lib/registry-types";

export const OVERVIEW_YEAR_RANGE_START = 2020;

export type OverviewViewMode =
  | "companyYears"
  | "registryReports"
  | "prodToStage";

export type OverviewStatusKind =
  | "ok"
  | "missing"
  | "warning"
  | "error"
  | "progress"
  | "partial";

export type CompanyYearStatusColumn =
  | "report"
  | "pipeline"
  | "pipelineErrors"
  | "stageData"
  | "prodData"
  | "prodVerified";

export type RegistryReportStatusColumn =
  | "wikidata"
  | "registryFile"
  | "companyReport"
  | "pipeline"
  | "pipelineErrors";

export type OverviewStatusColumn =
  | CompanyYearStatusColumn
  | RegistryReportStatusColumn;

export const COMPANY_YEAR_STATUS_COLUMNS: CompanyYearStatusColumn[] = [
  "report",
  "pipeline",
  "pipelineErrors",
  "stageData",
  "prodData",
  "prodVerified",
];

export const REGISTRY_REPORT_STATUS_COLUMNS: RegistryReportStatusColumn[] = [
  "wikidata",
  "registryFile",
  "companyReport",
  "pipeline",
  "pipelineErrors",
];

export type OverviewStatusLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type OverviewStatusDetail = {
  kind: OverviewStatusKind;
  summary: string;
  details: string[];
  links?: OverviewStatusLink[];
};

export type OverviewRow = {
  key: string;
  viewMode: OverviewViewMode;
  companyName: string;
  wikidataId: string | null;
  companyId: string | null;
  reportYear: string | null;
  companyReportId: string | null;
  tags: string[];
  registryEntry: RegistryEntry | null;
  runUrl: string | null;
  statuses: Partial<Record<OverviewStatusColumn, OverviewStatusDetail>>;
};

export type OverviewFilters = {
  searchQuery: string;
  reportYears: string[];
  tagSlugs: string[];
  statusFilters: OverviewStatusColumn[];
  missingRegistryOnly: boolean;
  missingCompanyReportOnly: boolean;
  notRunInPipelineOnly: boolean;
};

export function defaultOverviewFilters(): OverviewFilters {
  const currentYear = String(new Date().getFullYear());
  return {
    searchQuery: "",
    reportYears: [currentYear],
    tagSlugs: [],
    statusFilters: [],
    missingRegistryOnly: false,
    missingCompanyReportOnly: false,
    notRunInPipelineOnly: false,
  };
}

export type ProdToStageFilters = {
  searchQuery: string;
  reportYears: string[];
  tagSlugs: string[];
  runnableOnly: boolean;
};

export function defaultProdToStageFilters(): ProdToStageFilters {
  const currentYear = String(new Date().getFullYear());
  return {
    searchQuery: "",
    reportYears: [currentYear],
    tagSlugs: [],
    runnableOnly: false,
  };
}

export type OverviewStats = {
  totalRows: number;
  withReport?: number;
  pipelineCompleted: number;
  pipelineFailed: number;
  inStage?: number;
  inProd?: number;
  prodVerified?: number;
  missingWikidata?: number;
  linkedCompanyReport?: number;
};

export function overviewYearRange(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear; year >= OVERVIEW_YEAR_RANGE_START; year--) {
    years.push(String(year));
  }
  return years;
}

export function statusColumnsForView(
  viewMode: OverviewViewMode,
): OverviewStatusColumn[] {
  return viewMode === "companyYears"
    ? COMPANY_YEAR_STATUS_COLUMNS
    : REGISTRY_REPORT_STATUS_COLUMNS;
}

export type ProdToStageRow = {
  key: string;
  companyName: string;
  wikidataId: string | null;
  prodCompanyId: string;
  prodCompanyReportId: string;
  reportYear: string | null;
  reportUrl: string | null;
  validatedDataPointLabels: string[];
  stageCompanyId: string | null;
  tags: string[];
};

export function overviewFiltersAreActive(filters: OverviewFilters): boolean {
  const currentYear = String(new Date().getFullYear());
  return (
    Boolean(filters.searchQuery.trim()) ||
    filters.reportYears.length !== 1 ||
    filters.reportYears[0] !== currentYear ||
    filters.tagSlugs.length > 0 ||
    filters.statusFilters.length > 0 ||
    filters.missingRegistryOnly ||
    filters.missingCompanyReportOnly ||
    filters.notRunInPipelineOnly
  );
}
