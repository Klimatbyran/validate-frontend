import { describe, expect, it } from "vitest";
import {
  getPeriodShellKey,
  groupPeriodsByReportShell,
  UNLINKED_REPORT_SHELL_KEY,
} from "./company-report-shells";
import type { GarboReportingPeriodSummary } from "./types";

describe("getPeriodShellKey", () => {
  it("uses companyReportId when present", () => {
    const period: GarboReportingPeriodSummary = {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      companyReportId: "report-123",
    };

    expect(getPeriodShellKey(period)).toBe("report-123");
  });

  it("falls back to unlinked key when no report id", () => {
    const period: GarboReportingPeriodSummary = {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    };

    expect(getPeriodShellKey(period)).toBe(UNLINKED_REPORT_SHELL_KEY);
  });
});

describe("groupPeriodsByReportShell", () => {
  it("groups periods and sorts newest report year first", () => {
    const periods: GarboReportingPeriodSummary[] = [
      {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "old",
        companyReport: { id: "old", reportYear: "2023" },
      },
      {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "new",
        companyReport: { id: "new", reportYear: "2024" },
      },
    ];

    const groups = groupPeriodsByReportShell(periods);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.shellKey).toBe("new");
    expect(groups[0]?.periods).toHaveLength(1);
  });
});
