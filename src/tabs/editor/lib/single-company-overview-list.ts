import type { GarboCompanyListItem } from "./types";
import type { CompanyVerificationOverview } from "./verification";
import {
  companyMatchesTagFilter,
  companyPassesExcludeTagFilter,
} from "./editor-tag-and-payload-utils";
import { getPeriodYear } from "./reporting-period-ui";

export type CompanySortId = "name-asc" | "name-desc" | "id-asc" | "id-desc";

export function companyHasPeriodsInYears(
  company: GarboCompanyListItem,
  years: string[],
): boolean {
  if (!years.length) return true;
  return years.every((y) =>
    (company.reportingPeriods ?? []).some((p) => getPeriodYear(p) === y),
  );
}

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
  filterYears: string[];
  filterSector: string;
  filterUnverified: FilterUnverifiedOption;
  filterApplyUnverifiedToSelectedYears: boolean;
  companyOverviewById: Map<string, CompanyVerificationOverview>;
};

export function companyPassesOverviewFilters(
  c: GarboCompanyListItem,
  f: OverviewListFilterInput,
): boolean {
  const overview = f.companyOverviewById.get(c.id);
  if (!companyMatchesSearch(c, f.searchQuery)) return false;
  if (!companyMatchesTagFilter(c.tags, f.filterTags)) return false;
  if (!companyPassesExcludeTagFilter(c.tags, f.excludeFilterTags)) return false;
  if (f.filterYears.length && !companyHasPeriodsInYears(c, f.filterYears))
    return false;
  if (f.filterSector && (c.industry?.subIndustryCode ?? "") !== f.filterSector)
    return false;

  if (f.filterUnverified) {
    const scopedToYears =
      f.filterApplyUnverifiedToSelectedYears && f.filterYears.length > 0;

    if (scopedToYears) {
      const hasUnverifiedInYears = f.filterYears.some((year) => {
        const yearData = overview?.perYear.find((p) => p.year === year);
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
      if (f.filterUnverified === "emissions" && !overview?.hasUnverifiedEmissions)
        return false;
      if (f.filterUnverified === "all" && !overview?.hasUnverifiedData)
        return false;
    }
  }

  return true;
}

export function sortGarboCompanyListRows(
  rows: GarboCompanyListItem[],
  sortId: CompanySortId,
): GarboCompanyListItem[] {
  const sorted = [...rows];
  const byName = (a: GarboCompanyListItem, b: GarboCompanyListItem) =>
    (a.name ?? "").localeCompare(b.name ?? "", undefined, {
      sensitivity: "base",
    });
  const byId = (a: GarboCompanyListItem, b: GarboCompanyListItem) =>
    (a.wikidataId ?? "").localeCompare(b.wikidataId ?? "");
  switch (sortId) {
    case "name-desc":
      sorted.sort((a, b) => -byName(a, b));
      break;
    case "id-asc":
      sorted.sort(byId);
      break;
    case "id-desc":
      sorted.sort((a, b) => -byId(a, b));
      break;
    default:
      sorted.sort(byName);
  }
  return sorted;
}

export function computeOverviewFilterPeriodStats(
  filteredCompanies: GarboCompanyListItem[],
  companyOverviewById: Map<string, CompanyVerificationOverview>,
): { totalPeriods: number; verifiedEmissionsPeriods: number } {
  let totalPeriods = 0;
  let verifiedEmissionsPeriods = 0;
  for (const c of filteredCompanies) {
    const overview = companyOverviewById.get(c.wikidataId);
    for (const p of overview?.perYear ?? []) {
      totalPeriods += 1;
      if (p.emissions === "verified") verifiedEmissionsPeriods += 1;
    }
  }
  return { totalPeriods, verifiedEmissionsPeriods };
}
