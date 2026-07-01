import { describe, expect, it } from "vitest";
import {
  buildCompanyReportOverview,
  getReportCatalogYearMax,
  isValidReportCatalogYear,
  pickReportLink,
  registryYearMismatch,
} from "./company-report-overview";
import type { GarboCompanyReportSummary } from "./types";

describe("buildCompanyReportOverview", () => {
  it("lists shells from CompanyReport API and joins period data years", () => {
    const companyReports: GarboCompanyReportSummary[] = [
      {
        id: "cr-1",
        reportYear: "2025",
        registryReportId: "reg-1",
        report: {
          id: "reg-1",
          reportYear: "2024",
          url: "https://example.com/report.pdf",
        },
      },
    ];

    const rows = buildCompanyReportOverview(companyReports, [
      {
        id: "p1",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        year: "2024",
        companyReportId: "cr-1",
      },
      {
        id: "p2",
        startDate: "2023-01-01",
        endDate: "2023-12-31",
        year: "2023",
        companyReportId: "cr-1",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.companyReportId).toBe("cr-1");
    expect(rows[0]?.companyReportYear).toBe("2025");
    expect(rows[0]?.registryReportId).toBe("reg-1");
    expect(rows[0]?.periodCount).toBe(2);
    expect(rows[0]?.periodDataYears).toEqual(["2024", "2023"]);
    expect(registryYearMismatch(rows[0]!)).toBe(true);
    expect(pickReportLink(rows[0]!)).toBe("https://example.com/report.pdf");
  });

  it("includes orphan shells with zero periods", () => {
    const rows = buildCompanyReportOverview(
      [{ id: "cr-empty", reportYear: "2022", registryReportId: null }],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.periodCount).toBe(0);
    expect(rows[0]?.companyReportYear).toBe("2022");
  });

  it("adds an unlinked row for periods without companyReportId", () => {
    const rows = buildCompanyReportOverview(
      [],
      [
        {
          id: "p-unlinked",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
        },
      ],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.isUnlinked).toBe(true);
    expect(rows[0]?.periodIds).toEqual(["p-unlinked"]);
  });
});

describe("isValidReportCatalogYear", () => {
  it("accepts years in catalog range through current year", () => {
    expect(isValidReportCatalogYear("2024")).toBe(true);
    expect(isValidReportCatalogYear("1990")).toBe(true);
    expect(isValidReportCatalogYear(String(getReportCatalogYearMax()))).toBe(
      true,
    );
  });

  it("rejects invalid shapes and out-of-range years", () => {
    expect(isValidReportCatalogYear("24")).toBe(false);
    expect(isValidReportCatalogYear("1800")).toBe(false);
    expect(isValidReportCatalogYear("2200")).toBe(false);
    expect(
      isValidReportCatalogYear(String(getReportCatalogYearMax() + 1)),
    ).toBe(false);
  });
});
