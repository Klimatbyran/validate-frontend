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
  it("emits one slot per report shell for the same data year", () => {
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

    expect(slots).toHaveLength(2);
    expect(slots.map((slot) => slot.shellKey).sort()).toEqual([
      "catalog:2023:data:2024",
      "catalog:2024:data:2024",
    ]);
  });

  it("pairs stage and prod shells by stable identity, not env-local companyReportId", () => {
    const stageOnly = period({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      year: "2024",
      companyReportId: "stage-only",
      reportSha256: "abc123",
      companyReport: { id: "stage-only", reportYear: "2024" },
    });
    const prodOnly = period({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      year: "2024",
      companyReportId: "prod-only",
      reportSha256: "def456",
      companyReport: { id: "prod-only", reportYear: "2023" },
    });
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
      [stageOnly, sharedStage],
      [prodOnly, sharedProd],
      2024,
      null,
    );

    expect(slots).toHaveLength(3);

    const sharedSlot = slots.find(
      (slot) => slot.shellKey === "sha256:shared-hash",
    );
    expect(sharedSlot?.stagePeriod?.companyReportId).toBe("stage-shared");
    expect(sharedSlot?.prodPeriod?.companyReportId).toBe("prod-shared");

    const stageOnlySlot = slots.find(
      (slot) => slot.shellKey === "sha256:abc123",
    );
    expect(stageOnlySlot?.stagePeriod).toBeTruthy();
    expect(stageOnlySlot?.prodPeriod).toBeNull();
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
    const found = findReportingPeriodForShell(periods, 2024, null, shellKey);

    expect(found?.companyReportId).toBe("target-shell");
  });
});
