import { describe, expect, it } from "vitest";
import type { ReportingPeriod } from "../types";
import {
  buildReportingPeriodComparisonSlots,
  findReportingPeriodForShell,
  pickReportingPeriodsForFilters,
} from "./reporting-period-comparison";
import { UNLINKED_REPORT_SHELL_KEY } from "@/tabs/editor/lib/company-report-shells";
import { getCrossEnvPeriodShellKey } from "./cross-env-report-shell";

function period(
  overrides: Partial<ReportingPeriod> &
    Pick<ReportingPeriod, "startDate" | "endDate">,
): ReportingPeriod {
  return {
    emissions: { scope1: { total: 100 } },
    ...overrides,
  };
}

describe("pickReportingPeriodsForFilters", () => {
  it("matches data year from period.year, not only endDate", () => {
    const periods = [
      period({
        startDate: "2023-01-01",
        endDate: "2023-12-31",
        year: "2024",
        companyReportId: "report-a",
      }),
      period({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2023",
        companyReportId: "report-b",
      }),
    ];

    expect(pickReportingPeriodsForFilters(periods, 2024)).toHaveLength(1);
    expect(
      pickReportingPeriodsForFilters(periods, 2024)[0]?.companyReportId,
    ).toBe("report-a");
  });

  it("filters by PDF report year when provided", () => {
    const periods = [
      period({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "report-2024",
        companyReport: { id: "report-2024", reportYear: "2024" },
      }),
      period({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "report-2023",
        companyReport: { id: "report-2023", reportYear: "2023" },
      }),
    ];

    expect(pickReportingPeriodsForFilters(periods, 2024, 2024)).toHaveLength(1);
    expect(
      pickReportingPeriodsForFilters(periods, 2024, 2024)[0]?.companyReportId,
    ).toBe("report-2024");
  });
});

describe("buildReportingPeriodComparisonSlots", () => {
  it("collapses duplicate shells for the same data year to the public-pick winner", () => {
    // Same scenario as production: a company re-processed into a second
    // CompanyReport shell that also covers data year 2024. Only the period
    // the public API would serve (higher CompanyReport.reportYear) should
    // produce a slot - the losing duplicate must not show up as a separate
    // "missing" comparison row.
    const stagePeriods = [
      period({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "shell-a",
        companyReport: { id: "shell-a", reportYear: "2024" },
      }),
      period({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "shell-b",
        companyReport: { id: "shell-b", reportYear: "2023" },
      }),
    ];

    const slots = buildReportingPeriodComparisonSlots(
      stagePeriods,
      stagePeriods,
      2024,
      null,
    );

    expect(slots).toHaveLength(1);
    expect(slots[0]?.shellKey).toBe("catalog:2024:data:2024");
    expect(slots[0]?.stagePeriod?.companyReportId).toBe("shell-a");
  });

  it("pairs stage and prod periods by stable identity, not env-local companyReportId", () => {
    const sharedStage = period({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      year: "2024",
      companyReportId: "stage-shared",
      reportSha256: "shared-hash",
      companyReport: { id: "stage-shared", reportYear: "2022" },
    });
    const sharedProd = period({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      year: "2024",
      companyReportId: "prod-shared",
      reportSha256: "shared-hash",
      companyReport: { id: "prod-shared", reportYear: "2022" },
    });

    const slots = buildReportingPeriodComparisonSlots(
      [sharedStage],
      [sharedProd],
      2024,
      null,
    );

    expect(slots).toHaveLength(1);
    expect(slots[0]?.shellKey).toBe("sha256:shared-hash");
    expect(slots[0]?.stagePeriod?.companyReportId).toBe("stage-shared");
    expect(slots[0]?.prodPeriod?.companyReportId).toBe("prod-shared");
  });

  it("produces a stage-only slot when prod has no period for that shell", () => {
    const stageOnly = period({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      year: "2024",
      companyReportId: "stage-only",
      reportSha256: "abc123",
      companyReport: { id: "stage-only", reportYear: "2024" },
    });

    const slots = buildReportingPeriodComparisonSlots(
      [stageOnly],
      [],
      2024,
      null,
    );

    expect(slots).toHaveLength(1);
    expect(slots[0]?.shellKey).toBe("sha256:abc123");
    expect(slots[0]?.stagePeriod).toBeTruthy();
    expect(slots[0]?.prodPeriod).toBeNull();
  });

  it("pairs by shared URL when only stage has a populated sha256", () => {
    // Reproduces the bug where rerunning a company on stage backfills
    // Report.sha256 for the first time (e.g. via forceReindex), while prod's
    // copy of the same report - never reprocessed - still has sha256 null.
    // The two periods must still pair via their matching URL instead of
    // splitting into an unpaired stage-only + prod-only pair of slots.
    const stagePeriod = period({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      year: "2024",
      companyReportId: "stage-shell",
      reportSha256: "freshly-computed-hash",
      companyReport: {
        id: "stage-shell",
        reportYear: "2024",
        report: { url: "https://example.com/report.pdf" },
      },
    });
    const prodPeriod = period({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      year: "2024",
      companyReportId: "prod-shell",
      companyReport: {
        id: "prod-shell",
        reportYear: "2024",
        report: { url: "https://example.com/report.pdf", sha256: null },
      },
    });

    const slots = buildReportingPeriodComparisonSlots(
      [stagePeriod],
      [prodPeriod],
      2024,
      null,
    );

    expect(slots).toHaveLength(1);
    expect(slots[0]?.stagePeriod?.companyReportId).toBe("stage-shell");
    expect(slots[0]?.prodPeriod?.companyReportId).toBe("prod-shell");
  });

  it("maps unlinked periods to null companyReportId", () => {
    const unlinked = period({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      year: "2024",
    });

    const [slot] = buildReportingPeriodComparisonSlots(
      [unlinked],
      [],
      2024,
      null,
    );

    expect(slot.shellKey).toBe(`${UNLINKED_REPORT_SHELL_KEY}:2024`);
    expect(slot.companyReportId).toBeNull();
  });
});

describe("findReportingPeriodForShell", () => {
  it("returns the period for a matching cross-env shell key", () => {
    const periods = [
      period({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "target-shell",
        reportSha256: "target-hash",
        companyReport: { id: "target-shell", reportYear: "2024" },
      }),
    ];

    const shellKey = getCrossEnvPeriodShellKey(periods[0]!);
    const found = findReportingPeriodForShell(periods, 2024, null, [shellKey]);

    expect(found?.companyReportId).toBe("target-shell");
  });
});
