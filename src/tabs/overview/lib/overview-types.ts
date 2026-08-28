export const OVERVIEW_YEAR_RANGE_START = 2020;

export type OverviewViewMode = "summary" | "prodToStage" | "coverage";

export type OverviewWarning = {
  code: string;
  message: string;
};

export type ProdToStageFilters = {
  searchQuery: string;
  reportYears: string[];
  tagSlugs: string[];
  runnableOnly: boolean;
};

export function defaultProdToStageFilters(): ProdToStageFilters {
  return {
    searchQuery: "",
    reportYears: [],
    tagSlugs: [],
    runnableOnly: false,
  };
}

export function overviewYearRange(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear; year >= OVERVIEW_YEAR_RANGE_START; year--) {
    years.push(String(year));
  }
  return years;
}

export type ProdToStageRow = {
  key: string;
  companyName: string;
  wikidataId: string | null;
  prodCompanyId: string;
  prodCompanyReportId: string | null;
  prodReportLinked: boolean;
  reportYear: string | null;
  reportUrl: string | null;
  fullyVerifiedPeriodCount: number;
  stageCompanyId: string | null;
  tags: string[];
};

export type OverviewSummaryCompanyRef = {
  companyId: string;
  name: string;
  wikidataId: string | null;
  tags: string[];
  emissionsYearCount: number;
  emissionsYears: string[];
  companyReportCount: number;
};

export type OverviewDailyActivityResponse = {
  localEnv: "stage" | "prod";
  day: string;
  timeZone: "Europe/Stockholm";
  generatedAt: string;
  pipeline: {
    runsStarted: number;
    runsCompleted: number;
    runsFailed: number;
    runsStillRunning: number;
    companiesWithRuns: number;
    jobsFinished: number;
    jobsCompleted: number;
    jobsFailed: number;
    jobsByQueue: Array<{
      queueName: string;
      finished: number;
      completed: number;
      failed: number;
    }>;
  };
  data: {
    companyReportsCreated: number;
    companiesFirstReportCreated: number;
    batchesCreated: number;
    verifiedMetadataUpdates: number;
  };
};

export type OverviewSummaryResponse = {
  localEnv: "stage" | "prod";
  generatedAt: string;
  totals: {
    companies: number;
    withWikidata: number;
    withoutWikidata: number;
    withWebsiteUrl: number;
    withIndustry: number;
    withTags: number;
    withoutTags: number;
    withAnyReportingPeriod: number;
    withAnyEmissionsData: number;
    withoutEmissionsData: number;
    withAnyCompanyReport: number;
    companyReports: number;
    companyReportsLinkedToRegistry: number;
    companyReportsUnlinkedToRegistry: number;
    reportingPeriods: number;
    registryReports: number;
    registryReportsWithWikidata: number;
    registryReportsLinkedToCompanyReport: number;
  };
  emissionsCoverageByYear: Array<{
    year: string;
    companiesWithPeriod: number;
    companiesWithEmissions: number;
    companiesWithScope1: number;
    companiesWithScope2: number;
    companiesWithScope3: number;
    companiesWithStatedTotal: number;
  }>;
  companyReportsByYear: Array<{ year: string; count: number }>;
  registryReportsByYear: Array<{
    year: string;
    count: number;
    withWikidata: number;
    linkedToCompanyReport: number;
  }>;
  companiesByEmissionsYearCount: Array<{
    yearCount: number;
    companyCount: number;
  }>;
  companiesByCompanyReportCount: Array<{
    reportCount: number;
    companyCount: number;
  }>;
  companiesByTag: Array<{
    slug: string;
    label: string | null;
    companyCount: number;
  }>;
  yearDropoffs: Array<{
    fromYear: string;
    toYear: string;
    companiesLost: number;
  }>;
  gaps: {
    fewEmissionsYears: {
      maxYears: number;
      totalMatching: number;
      companies: OverviewSummaryCompanyRef[];
    };
    reportsWithoutEmissions: {
      totalMatching: number;
      companies: OverviewSummaryCompanyRef[];
    };
    missingLatestYear: {
      year: string;
      totalMatching: number;
      companies: OverviewSummaryCompanyRef[];
    };
    untagged: {
      totalMatching: number;
      companies: OverviewSummaryCompanyRef[];
    };
  };
};
