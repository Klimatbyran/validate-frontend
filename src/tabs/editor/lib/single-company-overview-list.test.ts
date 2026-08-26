import { describe, expect, it } from "vitest";
import type { CompanyReportRow } from "./company-report-rows";
import type { CompanyVerificationOverview } from "./verification";
import {
  reportRowHasNoEmissionsData,
  reportRowHasNoReportingPeriodData,
  reportRowPassesOverviewFilters,
  type OverviewListFilterInput,
} from "./single-company-overview-list";
import type { GarboCompanyListItem } from "./types";

function overview(
  partial: Partial<CompanyVerificationOverview>,
): CompanyVerificationOverview {
  return {
    emissions: "none",
    economy: "none",
    industry: "none",
    baseYear: "none",
    hasUnverifiedEmissions: false,
    hasUnverifiedData: false,
    perYear: [],
    ...partial,
  };
}

function row(
  overviewPartial: Partial<CompanyVerificationOverview>,
): CompanyReportRow {
  const company: GarboCompanyListItem = {
    id: "c1",
    name: "Acme",
    wikidataId: "Q1",
    tags: [],
  };
  return {
    rowKey: "c1:cr-1",
    company,
    companyReportId: "cr-1",
    reportYear: "2024",
    periods: [],
    overview: overview(overviewPartial),
  };
}

const emptyFilters: OverviewListFilterInput = {
  searchQuery: "",
  filterTags: [],
  excludeFilterTags: [],
  filterDataYears: [],
  filterReportYears: [],
  filterSector: "",
  filterUnverified: "",
  filterApplyUnverifiedToSelectedYears: false,
  filterMissingData: "",
};

describe("missing data filters", () => {
  it("detects no emissions when overview emissions is none", () => {
    expect(
      reportRowHasNoEmissionsData(
        row({ emissions: "none", economy: "verified" }),
      ),
    ).toBe(true);
    expect(
      reportRowHasNoEmissionsData(
        row({ emissions: "verified", economy: "none" }),
      ),
    ).toBe(false);
  });

  it("detects no reporting period data only when both emissions and economy are none", () => {
    expect(
      reportRowHasNoReportingPeriodData(
        row({ emissions: "none", economy: "none" }),
      ),
    ).toBe(true);
    expect(
      reportRowHasNoReportingPeriodData(
        row({ emissions: "none", economy: "verified" }),
      ),
    ).toBe(false);
    expect(
      reportRowHasNoReportingPeriodData(
        row({ emissions: "unverified", economy: "none" }),
      ),
    ).toBe(false);
  });

  it("filters report rows by no-emissions", () => {
    const noEmissions = row({ emissions: "none", economy: "verified" });
    const withEmissions = row({ emissions: "verified", economy: "none" });

    expect(
      reportRowPassesOverviewFilters(noEmissions, {
        ...emptyFilters,
        filterMissingData: "no-emissions",
      }),
    ).toBe(true);
    expect(
      reportRowPassesOverviewFilters(withEmissions, {
        ...emptyFilters,
        filterMissingData: "no-emissions",
      }),
    ).toBe(false);
  });

  it("filters report rows by no-reporting-period-data", () => {
    const empty = row({ emissions: "none", economy: "none" });
    const economyOnly = row({ emissions: "none", economy: "verified" });

    expect(
      reportRowPassesOverviewFilters(empty, {
        ...emptyFilters,
        filterMissingData: "no-reporting-period-data",
      }),
    ).toBe(true);
    expect(
      reportRowPassesOverviewFilters(economyOnly, {
        ...emptyFilters,
        filterMissingData: "no-reporting-period-data",
      }),
    ).toBe(false);
  });
});
