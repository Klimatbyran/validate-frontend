import { describe, expect, it } from "vitest";
import type { ReportingPeriod } from "@/tabs/errors/types";
import { buildProdToStageRows } from "./build-prod-to-stage-rows";

function verifiedScope1(total: number): ReportingPeriod["emissions"] {
  return {
    scope1: {
      total,
      metadata: { verifiedBy: { name: "validator" } },
    },
  };
}

function period(
  overrides: Partial<ReportingPeriod> &
    Pick<ReportingPeriod, "startDate" | "endDate">,
): ReportingPeriod {
  return {
    emissions: null,
    ...overrides,
  };
}

describe("buildProdToStageRows", () => {
  it("includes prod CompanyReports with verified emissions when stage has no matching report", () => {
    const rows = buildProdToStageRows({
      prodCompanies: [
        {
          id: "company-1",
          name: "Acme",
          wikidataId: "Q1",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "prod-report",
              companyReport: { id: "prod-report", reportYear: "2024" },
              reportURL: "https://example.com/acme-2024.pdf",
              emissions: verifiedScope1(100),
            }),
          ],
        },
      ],
      stageCompanies: [
        {
          id: "company-1",
          name: "Acme",
          wikidataId: "Q1",
          reportingPeriods: [],
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.prodCompanyReportId).toBe("prod-report");
  });

  it("matches companies by shared internal id like the error browser", () => {
    const rows = buildProdToStageRows({
      prodCompanies: [
        {
          id: "shared-id",
          name: "Acme Prod Name",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "prod-report",
              emissions: verifiedScope1(50),
            }),
          ],
        },
      ],
      stageCompanies: [
        {
          id: "shared-id",
          name: "Acme Stage Name",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "stage-report",
              emissions: { scope1: { total: 10 } },
            }),
          ],
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.stageCompanyId).toBe("shared-id");
    expect(rows[0]?.prodCompanyReportId).toBe("prod-report");
  });

  it("does not exclude a prod shell because another stage report shares only the PDF year", () => {
    const rows = buildProdToStageRows({
      prodCompanies: [
        {
          id: "company-1",
          name: "Acme",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "prod-2024",
              companyReport: { id: "prod-2024", reportYear: "2024" },
              reportURL: "https://example.com/acme-2024.pdf",
              emissions: verifiedScope1(100),
            }),
          ],
        },
      ],
      stageCompanies: [
        {
          id: "company-1",
          name: "Acme",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "stage-other",
              companyReport: { id: "stage-other", reportYear: "2024" },
              reportURL: "https://example.com/acme-other-2024.pdf",
              emissions: { scope1: { total: 200 } },
            }),
          ],
        },
      ],
    });

    expect(rows).toHaveLength(1);
  });

  it("skips unlinked prod shells without a CompanyReport id", () => {
    const rows = buildProdToStageRows({
      prodCompanies: [
        {
          id: "company-1",
          name: "Acme",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              emissions: verifiedScope1(80),
            }),
          ],
        },
      ],
      stageCompanies: [
        {
          id: "company-1",
          name: "Acme",
          reportingPeriods: [],
        },
      ],
    });

    expect(rows).toHaveLength(0);
  });

  it("still includes prod shells when stage has the matching report but no emissions data", () => {
    const sharedUrl = "https://example.com/shared.pdf";
    const rows = buildProdToStageRows({
      prodCompanies: [
        {
          id: "company-1",
          name: "Acme",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "prod-report",
              reportURL: sharedUrl,
              emissions: verifiedScope1(100),
            }),
          ],
        },
      ],
      stageCompanies: [
        {
          id: "company-1",
          name: "Acme",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "stage-report",
              reportURL: sharedUrl,
              emissions: null,
            }),
          ],
        },
      ],
    });

    expect(rows).toHaveLength(1);
  });

  it("excludes prod shells when the corresponding stage report already has emissions data", () => {
    const sharedUrl = "https://example.com/shared.pdf";
    const rows = buildProdToStageRows({
      prodCompanies: [
        {
          id: "company-1",
          name: "Acme",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "prod-report",
              reportURL: sharedUrl,
              emissions: verifiedScope1(100),
            }),
          ],
        },
      ],
      stageCompanies: [
        {
          id: "company-1",
          name: "Acme",
          reportingPeriods: [
            period({
              startDate: "2024-01-01",
              endDate: "2024-12-31",
              year: "2024",
              companyReportId: "stage-report",
              reportURL: sharedUrl,
              emissions: { scope1: { total: 100 } },
            }),
          ],
        },
      ],
    });

    expect(rows).toHaveLength(0);
  });
});
