import { describe, expect, it } from "vitest";
import type { Company, ReportingPeriod } from "../types";
import {
  isProdCompanyFullyVerifiedForYear,
  isProdReportingPeriodFullyVerified,
} from "./verification";

const verifiedBy = { name: "Reviewer" };

function periodWithScope1(
  total: number | null,
  verified: boolean,
): ReportingPeriod {
  return {
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    year: "2024",
    companyReportId: "shell-a",
    emissions: {
      scope1: {
        total,
        metadata: verified ? { verifiedBy } : { verifiedBy: null },
      },
    },
  };
}

describe("isProdReportingPeriodFullyVerified", () => {
  it("returns true when non-null values are verified and nulls are ignored", () => {
    expect(
      isProdReportingPeriodFullyVerified(periodWithScope1(100, true)),
    ).toBe(true);
  });

  it("returns false when a non-null value is not verified", () => {
    expect(
      isProdReportingPeriodFullyVerified(periodWithScope1(100, false)),
    ).toBe(false);
  });

  it("returns false when emissions are missing", () => {
    expect(
      isProdReportingPeriodFullyVerified({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
      }),
    ).toBe(false);
  });
});

describe("isProdCompanyFullyVerifiedForYear", () => {
  it("requires every matching period in the filter to be fully verified", () => {
    const company: Company = {
      id: "company-1",
      wikidataId: "Q1",
      name: "Test Co",
      reportingPeriods: [
        periodWithScope1(100, true),
        {
          ...periodWithScope1(200, false),
          companyReportId: "shell-b",
          companyReport: { id: "shell-b", reportYear: "2023" },
        },
      ],
    };

    expect(isProdCompanyFullyVerifiedForYear(company, 2024)).toBe(false);
  });

  it("returns true when all matching periods are verified", () => {
    const company: Company = {
      id: "company-1",
      wikidataId: "Q1",
      name: "Test Co",
      reportingPeriods: [
        periodWithScope1(100, true),
        {
          ...periodWithScope1(200, true),
          companyReportId: "shell-b",
          companyReport: { id: "shell-b", reportYear: "2023" },
        },
      ],
    };

    expect(isProdCompanyFullyVerifiedForYear(company, 2024)).toBe(true);
  });
});
