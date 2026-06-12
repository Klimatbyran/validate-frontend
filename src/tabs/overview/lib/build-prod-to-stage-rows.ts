import {
  getPeriodShellKey,
  UNLINKED_REPORT_SHELL_KEY,
} from "@/tabs/editor/lib/company-report-shells";
import {
  getPeriodDataYear,
  getPeriodReportYear,
} from "@/tabs/editor/lib/reporting-period-ui";
import type { Company, ReportingPeriod } from "@/tabs/errors/types";
import { isWikidataIdPresent } from "@/tabs/registry/lib/registry-table-utils";
import { normalizeReportUrl } from "./archive-run-match";
import {
  collectVerifiedDataPointLabels,
  periodHasAnyEmissionsData,
  periodsHaveAnyVerifiedEmissions,
} from "./prod-verified-emissions";

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

function normalizeCompanyName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

function periodReportUrls(period: ReportingPeriod): string[] {
  return [
    (period as { sourceUrl?: string | null }).sourceUrl,
    (period as { reportURL?: string | null }).reportURL,
    (period as { s3Url?: string | null }).s3Url,
    (period as { reportS3Url?: string | null }).reportS3Url,
  ].filter((url): url is string => Boolean(url));
}

export function pickPipelineReportUrl(
  periods: ReportingPeriod[],
): string | null {
  const httpUrls = periods
    .flatMap((period) => periodReportUrls(period))
    .filter((url) => /^https?:\/\//i.test(url));
  const nonStorage = httpUrls.find(
    (url) => !/amazonaws|\.s3\./i.test(url),
  );
  return nonStorage ?? httpUrls[0] ?? null;
}

type StageCompanyIndex = {
  byId: Map<string, Company>;
  byWikidata: Map<string, Company>;
  byName: Map<string, Company>;
};

function buildStageCompanyIndex(stageCompanies: Company[]): StageCompanyIndex {
  const byId = new Map<string, Company>();
  const byWikidata = new Map<string, Company>();
  const byName = new Map<string, Company>();

  for (const company of stageCompanies) {
    byId.set(company.id, company);
    if (isWikidataIdPresent(company.wikidataId)) {
      byWikidata.set(company.wikidataId!.trim(), company);
    }
    const normalizedName = normalizeCompanyName(company.name);
    if (normalizedName) byName.set(normalizedName, company);
  }

  return { byId, byWikidata, byName };
}

/** Match stage company the same way as the error browser (id), with wikidata/name fallback. */
function findStageCompany(
  prodCompany: Company,
  index: StageCompanyIndex,
): Company | undefined {
  const byId = index.byId.get(prodCompany.id);
  if (byId) return byId;

  if (isWikidataIdPresent(prodCompany.wikidataId)) {
    const wikidataMatch = index.byWikidata.get(prodCompany.wikidataId!.trim());
    if (wikidataMatch) return wikidataMatch;
  }

  return index.byName.get(normalizeCompanyName(prodCompany.name));
}

function groupProdPeriodsByShell(
  company: Company,
): Map<string, ReportingPeriod[]> {
  const groups = new Map<string, ReportingPeriod[]>();
  for (const period of company.reportingPeriods ?? []) {
    const shellKey = getPeriodShellKey(period);
    const bucket = groups.get(shellKey) ?? [];
    bucket.push(period);
    groups.set(shellKey, bucket);
  }
  return groups;
}

function reportYearForShell(periods: ReportingPeriod[]): string | null {
  for (const period of periods) {
    const year = getPeriodReportYear(period);
    if (year) return year;
  }
  return null;
}

function dataYearsForShell(periods: ReportingPeriod[]): Set<string> {
  const years = new Set<string>();
  for (const period of periods) {
    const dataYear = getPeriodDataYear(period);
    if (dataYear) years.add(dataYear);
  }
  return years;
}

function stagePeriodsMatchingProdShell(
  stageCompany: Company | undefined,
  prodShellKey: string,
  prodShellPeriods: ReportingPeriod[],
): ReportingPeriod[] {
  if (!stageCompany?.reportingPeriods?.length) return [];

  const prodUrlKeys = new Set(
    prodShellPeriods
      .flatMap((period) => periodReportUrls(period))
      .map((url) => normalizeReportUrl(url))
      .filter(Boolean),
  );
  const prodReportYear = reportYearForShell(prodShellPeriods);
  const prodDataYears = dataYearsForShell(prodShellPeriods);

  return stageCompany.reportingPeriods.filter((period) => {
    const stageShellKey = getPeriodShellKey(period);
    if (
      prodShellKey !== UNLINKED_REPORT_SHELL_KEY &&
      stageShellKey === prodShellKey
    ) {
      return true;
    }

    const periodUrls = periodReportUrls(period)
      .map((url) => normalizeReportUrl(url))
      .filter(Boolean);
    if (
      prodUrlKeys.size > 0 &&
      periodUrls.some((url) => prodUrlKeys.has(url))
    ) {
      return true;
    }

    if (prodUrlKeys.size === 0 && prodReportYear) {
      const periodReportYear = getPeriodReportYear(period);
      const periodDataYear = getPeriodDataYear(period);
      if (
        periodReportYear === prodReportYear &&
        periodDataYear &&
        prodDataYears.has(periodDataYear)
      ) {
        return true;
      }
    }

    return false;
  });
}

function shellKeyToRowId(shellKey: string): string {
  return shellKey === UNLINKED_REPORT_SHELL_KEY ? UNLINKED_REPORT_SHELL_KEY : shellKey;
}

function stageMatchingReportHasEmissionsData(
  stagePeriods: ReportingPeriod[],
): boolean {
  return stagePeriods.some((period) => {
    if (getPeriodShellKey(period) === UNLINKED_REPORT_SHELL_KEY) return false;
    return periodHasAnyEmissionsData(period);
  });
}

export type ProdToStageBuildDiagnostics = {
  prodShells: number;
  skippedUnlinked: number;
  skippedNoVerifiedOnProd: number;
  skippedStageHasEmissions: number;
  included: number;
};

export function diagnoseProdToStageBuild(input: {
  stageCompanies: Company[];
  prodCompanies: Company[];
}): ProdToStageBuildDiagnostics {
  const diagnostics: ProdToStageBuildDiagnostics = {
    prodShells: 0,
    skippedUnlinked: 0,
    skippedNoVerifiedOnProd: 0,
    skippedStageHasEmissions: 0,
    included: 0,
  };
  const stageIndex = buildStageCompanyIndex(input.stageCompanies);

  for (const prodCompany of input.prodCompanies) {
    const shellGroups = groupProdPeriodsByShell(prodCompany);
    const stageCompany = findStageCompany(prodCompany, stageIndex);

    for (const [prodShellKey, prodPeriods] of shellGroups) {
      diagnostics.prodShells += 1;
      if (prodShellKey === UNLINKED_REPORT_SHELL_KEY) {
        diagnostics.skippedUnlinked += 1;
        continue;
      }
      if (!periodsHaveAnyVerifiedEmissions(prodPeriods)) {
        diagnostics.skippedNoVerifiedOnProd += 1;
        continue;
      }

      const stagePeriods = stagePeriodsMatchingProdShell(
        stageCompany,
        prodShellKey,
        prodPeriods,
      );
      if (stageMatchingReportHasEmissionsData(stagePeriods)) {
        diagnostics.skippedStageHasEmissions += 1;
        continue;
      }

      diagnostics.included += 1;
    }
  }

  return diagnostics;
}

export function buildProdToStageRows(input: {
  stageCompanies: Company[];
  prodCompanies: Company[];
}): ProdToStageRow[] {
  const rows: ProdToStageRow[] = [];
  const stageIndex = buildStageCompanyIndex(input.stageCompanies);

  for (const prodCompany of input.prodCompanies) {
    const shellGroups = groupProdPeriodsByShell(prodCompany);
    const stageCompany = findStageCompany(prodCompany, stageIndex);

    for (const [prodShellKey, prodPeriods] of shellGroups) {
      if (prodShellKey === UNLINKED_REPORT_SHELL_KEY) continue;
      if (!periodsHaveAnyVerifiedEmissions(prodPeriods)) continue;

      const stagePeriods = stagePeriodsMatchingProdShell(
        stageCompany,
        prodShellKey,
        prodPeriods,
      );
      if (stageMatchingReportHasEmissionsData(stagePeriods)) continue;

      const validatedDataPointLabels =
        collectVerifiedDataPointLabels(prodPeriods);
      const reportUrl = pickPipelineReportUrl(prodPeriods);
      const rowShellId = shellKeyToRowId(prodShellKey);

      rows.push({
        key: `${prodCompany.id}:${rowShellId}`,
        companyName: prodCompany.name,
        wikidataId: isWikidataIdPresent(prodCompany.wikidataId)
          ? prodCompany.wikidataId!.trim()
          : null,
        prodCompanyId: prodCompany.id,
        prodCompanyReportId: rowShellId,
        reportYear: reportYearForShell(prodPeriods),
        reportUrl,
        validatedDataPointLabels,
        stageCompanyId: stageCompany?.id ?? null,
        tags: prodCompany.tags ?? [],
      });
    }
  }

  return rows.sort((a, b) => {
    const nameCompare = a.companyName.localeCompare(b.companyName);
    if (nameCompare !== 0) return nameCompare;
    return (b.reportYear ?? "").localeCompare(a.reportYear ?? "");
  });
}

export function prodToStageRowMatchesFilters(
  row: ProdToStageRow,
  filters: {
    searchQuery: string;
    reportYears: string[];
    tagSlugs: string[];
    runnableOnly: boolean;
  },
): boolean {
  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    const haystack = [
      row.companyName,
      row.wikidataId ?? "",
      row.prodCompanyId,
      row.prodCompanyReportId,
      row.reportYear ?? "",
      row.reportUrl ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (
    filters.reportYears.length > 0 &&
    row.reportYear &&
    !filters.reportYears.includes(row.reportYear)
  ) {
    return false;
  }

  if (filters.tagSlugs.length > 0) {
    const tagSet = new Set(row.tags.map((tag) => tag.toLowerCase()));
    if (!filters.tagSlugs.some((tag) => tagSet.has(tag.toLowerCase()))) {
      return false;
    }
  }

  if (filters.runnableOnly && !row.reportUrl) return false;

  return true;
}
