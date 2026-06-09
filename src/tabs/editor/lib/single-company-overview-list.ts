import type { GarboCompanyListItem } from "./types";
import type { CompanyVerificationOverview } from "./verification";
import {
  companyMatchesTagFilter,
  companyPassesExcludeTagFilter,
} from "./editor-tag-and-payload-utils";
import {
  type CompanyReportRow,
  reportRowHasDataYears,
  reportRowMatchesReportYearFilter,
} from "./company-report-rows";

export type CompanySortId = "name-asc" | "name-desc" | "id-asc" | "id-desc";

export function companyMatchesSearch(
  company: GarboCompanyListItem,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (company.name ?? "").toLowerCase();
  const wikidataId = (company.wikidataId ?? "").toLowerCase();
  const internalId = (company.id ?? "").toLowerCase();
  const idPrefix = internalId.split("-")[0];
  return (
    name.includes(q) ||
    wikidataId.includes(q) ||
    internalId.includes(q) ||
    idPrefix.includes(q)
  );
}

export type FilterUnverifiedOption = "" | "emissions" | "all";

export type OverviewListFilterInput = {
  searchQuery: string;
  filterTags: string[];
  excludeFilterTags: string[];
  filterDataYears: string[];
  filterReportYears: string[];
  filterSector: string;
  filterUnverified: FilterUnverifiedOption;
  filterApplyUnverifiedToSelectedYears: boolean;
};

export function reportRowPassesOverviewFilters(
  row: CompanyReportRow,
  f: OverviewListFilterInput,
): boolean {
  const company = row.company;
  const overview = row.overview;

  if (!companyMatchesSearch(company, f.searchQuery)) return false;
  if (!companyMatchesTagFilter(company.tags, f.filterTags)) return false;
  if (!companyPassesExcludeTagFilter(company.tags, f.excludeFilterTags))
    return false;
  if (!reportRowHasDataYears(row, f.filterDataYears)) return false;
  if (!reportRowMatchesReportYearFilter(row, f.filterReportYears))
    return false;
  if (f.filterSector && (company.industry?.subIndustryCode ?? "") !== f.filterSector)
    return false;

  if (f.filterUnverified) {
    const scopedToYears =
      f.filterApplyUnverifiedToSelectedYears && f.filterDataYears.length > 0;

    if (scopedToYears) {
      const hasUnverifiedInYears = f.filterDataYears.some((year) => {
        const yearData = overview.perYear.find((p) => p.year === year);
        if (!yearData) return false;
        if (f.filterUnverified === "emissions")
          return yearData.emissions === "unverified";
        return (
          yearData.emissions === "unverified" ||
          yearData.economy === "unverified"
        );
      });
      if (!hasUnverifiedInYears) return false;
    } else {
      if (f.filterUnverified === "emissions" && !overview.hasUnverifiedEmissions)
        return false;
      if (f.filterUnverified === "all" && !overview.hasUnverifiedData)
        return false;
    }
  }

  return true;
}

export function sortCompanyReportRows(
  rows: CompanyReportRow[],
  sortId: CompanySortId,
): CompanyReportRow[] {
  const sorted = [...rows];
  const byName = (a: CompanyReportRow, b: CompanyReportRow) =>
    (a.company.name ?? "").localeCompare(b.company.name ?? "", undefined, {
      sensitivity: "base",
    });
  const byId = (a: CompanyReportRow, b: CompanyReportRow) =>
    (a.company.wikidataId ?? a.company.id).localeCompare(
      b.company.wikidataId ?? b.company.id,
    );
  const byReportYear = (a: CompanyReportRow, b: CompanyReportRow) => {
    const ay = a.reportYear ?? "";
    const by = b.reportYear ?? "";
    return by.localeCompare(ay);
  };

  switch (sortId) {
    case "name-desc":
      sorted.sort((a, b) => -byName(a, b) || byReportYear(a, b));
      break;
    case "id-asc":
      sorted.sort((a, b) => byId(a, b) || byReportYear(a, b));
      break;
    case "id-desc":
      sorted.sort((a, b) => -byId(a, b) || byReportYear(a, b));
      break;
    default:
      sorted.sort((a, b) => byName(a, b) || byReportYear(a, b));
  }
  return sorted;
}

export function computeOverviewFilterPeriodStats(
  filteredRows: CompanyReportRow[],
): { totalPeriods: number; verifiedEmissionsPeriods: number } {
  let totalPeriods = 0;
  let verifiedEmissionsPeriods = 0;
  for (const row of filteredRows) {
    for (const p of row.overview.perYear) {
      totalPeriods += 1;
      if (p.emissions === "verified") verifiedEmissionsPeriods += 1;
    }
  }
  return { totalPeriods, verifiedEmissionsPeriods };
}
