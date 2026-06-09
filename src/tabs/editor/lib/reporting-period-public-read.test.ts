import { describe, expect, it } from "vitest";
import type { GarboReportingPeriodSummary } from "./types";
import {
  pickOnePeriodPerDataYear,
  publicPeriodIdsForCompany,
} from "./reporting-period-public-read";

function period(
  overrides: Partial<GarboReportingPeriodSummary> &
    Pick<GarboReportingPeriodSummary, "id" | "startDate" | "endDate">,
): GarboReportingPeriodSummary & { id: string } {
  return {
    ...overrides,
  };
}

describe("pickOnePeriodPerDataYear", () => {
  it("keeps one period per data year", () => {
    const periods = [
      period({
        id: "p1",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "a",
        companyReport: { id: "a", reportYear: "2024" },
      }),
      period({
        id: "p2",
        startDate: "2023-01-01",
        endDate: "2023-12-31",
        year: "2023",
        companyReportId: "b",
        companyReport: { id: "b", reportYear: "2023" },
      }),
    ];

    const picked = pickOnePeriodPerDataYear(periods);

    expect(picked).toHaveLength(2);
    expect(picked.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  });

  it("prefers the period linked to the newer CompanyReport.reportYear", () => {
    const periods = [
      period({
        id: "older-report",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "old",
        companyReport: { id: "old", reportYear: "2023" },
      }),
      period({
        id: "newer-report",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "new",
        companyReport: { id: "new", reportYear: "2024" },
      }),
    ];

    const picked = pickOnePeriodPerDataYear(periods);

    expect(picked).toHaveLength(1);
    expect(picked[0]?.id).toBe("newer-report");
  });
});

describe("publicPeriodIdsForCompany", () => {
  it("returns ids from pickOnePeriodPerDataYear", () => {
    const periods = [
      period({
        id: "visible",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "new",
        companyReport: { id: "new", reportYear: "2024" },
      }),
      period({
        id: "hidden",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "old",
        companyReport: { id: "old", reportYear: "2023" },
      }),
    ];

    expect(publicPeriodIdsForCompany(periods)).toEqual(new Set(["visible"]));
  });
});
