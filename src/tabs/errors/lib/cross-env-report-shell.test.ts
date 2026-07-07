import { describe, expect, it } from "vitest";
import type { ReportingPeriod } from "../types";
import { getCrossEnvPeriodShellKey } from "./cross-env-report-shell";
import { UNLINKED_REPORT_SHELL_KEY } from "@/tabs/editor/lib/company-report-shells";

function period(
  overrides: Partial<ReportingPeriod> &
    Pick<ReportingPeriod, "startDate" | "endDate">,
): ReportingPeriod {
  return {
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    year: "2024",
    ...overrides,
  };
}

describe("getCrossEnvPeriodShellKey", () => {
  it("prefers reportSha256 over env-local companyReportId", () => {
    const key = getCrossEnvPeriodShellKey(
      period({
        companyReportId: "stage-uuid",
        reportSha256: "same-pdf",
      }),
    );
    expect(key).toBe("sha256:same-pdf");
  });

  it("falls back to normalized report URL", () => {
    const key = getCrossEnvPeriodShellKey(
      period({
        companyReportId: "stage-uuid",
        reportURL: "https://Example.com/Reports/2024.PDF",
      }),
    );
    expect(key).toBe("url:https://example.com/Reports/2024.PDF");
  });

  it("uses catalog year plus data year when identity fields are missing", () => {
    const key = getCrossEnvPeriodShellKey(
      period({
        companyReportId: "stage-uuid",
        companyReport: { id: "stage-uuid", reportYear: "2024" },
      }),
    );
    expect(key).toBe("catalog:2024:data:2024");
  });

  it("matches the same logical report across different env-local ids", () => {
    const stageKey = getCrossEnvPeriodShellKey(
      period({
        companyReportId: "stage-uuid",
        reportSha256: "shared",
      }),
    );
    const prodKey = getCrossEnvPeriodShellKey(
      period({
        companyReportId: "prod-uuid",
        reportSha256: "shared",
      }),
    );
    expect(stageKey).toBe(prodKey);
  });

  it("uses unlinked bucket with data year when no shell exists", () => {
    const key = getCrossEnvPeriodShellKey(
      period({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
      }),
    );
    expect(key).toBe(`${UNLINKED_REPORT_SHELL_KEY}:2024`);
  });
});
