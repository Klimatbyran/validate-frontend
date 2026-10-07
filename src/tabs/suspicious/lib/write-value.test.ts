import { describe, expect, it } from "vitest";
import type { Company, ReportingPeriod } from "@/tabs/errors/types";
import {
  buildEmissionsPatch,
  buildReportingPeriodWriteBody,
  findPeriodForFinding,
  isScope2DataPoint,
  isWritableDataPoint,
  parseInputNumber,
} from "./write-value";

const period: ReportingPeriod = {
  startDate: "2023-01-01",
  endDate: "2023-12-31",
  year: "2023",
  companyReportId: "report-1",
  reportURL: "https://example.com/report.pdf",
  emissions: { scope1: { total: 100 } },
};

describe("parseInputNumber", () => {
  it("accepts spaces and commas", () => {
    expect(parseInputNumber("1 234,5")).toBe(1234.5);
    expect(parseInputNumber("12.5")).toBe(12.5);
  });

  it("returns null for empty or invalid input", () => {
    expect(parseInputNumber("")).toBeNull();
    expect(parseInputNumber("abc")).toBeNull();
  });
});

describe("buildEmissionsPatch", () => {
  it("writes a single scope 2 field without the others", () => {
    expect(buildEmissionsPatch("scope2-mb", 12)).toEqual({
      scope2: { mb: 12, unit: "tCO2e", verified: true },
    });
  });

  it("writes a scope 3 category", () => {
    expect(buildEmissionsPatch("cat-1", 40)).toEqual({
      scope3: {
        categories: [{ category: 1, total: 40, unit: "tCO2e", verified: true }],
      },
    });
  });

  it("rejects calculated totals", () => {
    expect(buildEmissionsPatch("calculated-total", 1)).toBeNull();
    expect(isWritableDataPoint("calculated-total")).toBe(false);
    expect(isWritableDataPoint("scope1-total")).toBe(true);
  });
});

describe("isScope2DataPoint", () => {
  it("recognises the shared scope 2 fields", () => {
    expect(isScope2DataPoint("scope2-mb")).toBe(true);
    expect(isScope2DataPoint("scope2-lb")).toBe(true);
    expect(isScope2DataPoint("scope1-total")).toBe(false);
  });
});

describe("buildReportingPeriodWriteBody", () => {
  it("keeps period dates, year and report id", () => {
    const body = buildReportingPeriodWriteBody(
      period,
      "scope1-total",
      80,
      "Unit mix-up",
    );
    expect(body).toMatchObject({
      companyReportId: "report-1",
      metadata: { comment: "Unit mix-up" },
      reportingPeriods: [
        {
          startDate: "2023-01-01",
          endDate: "2023-12-31",
          year: "2023",
          companyReportId: "report-1",
          reportURL: "https://example.com/report.pdf",
          emissions: {
            scope1: { total: 80, unit: "tCO2e", verified: true },
          },
        },
      ],
    });
  });

  it("prefers top-level companyReportId over nested companyReport.id", () => {
    const conflicting: ReportingPeriod = {
      ...period,
      companyReportId: "top-level",
      companyReport: { id: "nested" },
    };
    const body = buildReportingPeriodWriteBody(
      conflicting,
      "scope1-total",
      80,
      "Fix",
    );
    expect(body?.companyReportId).toBe("top-level");
    expect(body?.reportingPeriods[0]?.companyReportId).toBe("top-level");
  });

  it("refuses to build a body without a comment", () => {
    expect(
      buildReportingPeriodWriteBody(period, "scope1-total", 80, "  "),
    ).toBeNull();
  });
});

describe("findPeriodForFinding", () => {
  it("picks the period for the finding year", () => {
    const companies: Company[] = [
      {
        id: "c1",
        name: "Acme",
        reportingPeriods: [period],
      },
    ];
    expect(
      findPeriodForFinding(companies, { companyId: "c1", dataYear: 2023 }),
    ).toBe(period);
    expect(
      findPeriodForFinding(companies, { companyId: "c1", dataYear: 2022 }),
    ).toBeNull();
  });
});
