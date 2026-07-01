import { describe, expect, it } from "vitest";
import {
  attachCompanyReportIdToPeriodPatch,
  getPeriodShellKey,
  groupPeriodsByReportShell,
  resolveCompanyReportId,
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

describe("resolveCompanyReportId", () => {
  it("prefers companyReportId over nested companyReport.id", () => {
    const period: GarboReportingPeriodSummary = {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      companyReportId: "top-level",
      companyReport: { id: "nested" },
    };

    expect(resolveCompanyReportId(period)).toBe("top-level");
  });

  it("returns undefined when no report link exists", () => {
    const period: GarboReportingPeriodSummary = {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    };

    expect(resolveCompanyReportId(period)).toBeUndefined();
  });
});

describe("attachCompanyReportIdToPeriodPatch", () => {
  it("adds companyReportId when the period is linked to a shell", () => {
    const period: GarboReportingPeriodSummary = {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      companyReportId: "shell-1",
    };

    expect(
      attachCompanyReportIdToPeriodPatch(period, {
        startDate: period.startDate,
        endDate: period.endDate,
      }),
    ).toEqual({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      companyReportId: "shell-1",
    });
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
