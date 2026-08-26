import { describe, expect, it } from "vitest";

import type { CompanyReport } from "./crawler-types";
import {
  labeledHitsToSelectedReports,
  withFallbackReportType,
} from "./crawler-utils";

const company = (
  name: string,
  results: CompanyReport["results"],
): CompanyReport => ({
  companyName: name,
  wikidataId: "Q1",
  results,
});

describe("labeledHitsToSelectedReports", () => {
  it("saves fetched PDFs with a year even when type or S3 is missing", () => {
    const selected = labeledHitsToSelectedReports([
      company("Acme", [
        {
          url: "https://example.com/csr-2024.pdf",
          reportYear: "2024",
          reportTypeSlug: "csr-report",
        },
        {
          url: "https://example.com/cdp-2025.pdf",
          reportYear: "2025",
        },
        {
          url: "https://example.com/report-2023.pdf",
          title: "Something 2023",
        },
      ]),
    ]);

    expect(selected.map((item) => item.url)).toEqual([
      "https://example.com/csr-2024.pdf",
      "https://example.com/report-2023.pdf",
    ]);
    expect(selected[1]?.reportYear).toBe("2023");
    expect(selected[1]?.reportTypeSlug).toBe("other");
  });

  it("skips CDP, 10-K, old archive years, and subsidiary filings", () => {
    const selected = labeledHitsToSelectedReports([
      company("Linde PLC", [
        {
          url: "https://example.com/sustainability-2025.pdf",
          reportYear: "2025",
          reportTypeSlug: "sustainability-report",
        },
        {
          url: "https://example.com/cdp-2025.pdf",
          reportYear: "2025",
        },
        {
          url: "https://www.verizon.com/about/sites/default/files/2025-Annual-Report-on-Form-10k.pdf",
          reportYear: "2025",
          reportTypeSlug: "annual-report",
        },
        {
          url: "https://example.com/sustainability-2016.pdf",
          reportYear: "2016",
          reportTypeSlug: "sustainability-report",
        },
        {
          url: "https://assets.linde.com/-/media/global/apac/linde-india-limited/la/linde_india_limited_brsr_2025-26.pdf",
          reportYear: "2025",
        },
      ]),
    ]);

    expect(selected.map((item) => item.url)).toEqual([
      "https://example.com/sustainability-2025.pdf",
    ]);
  });

  it("skips inaccessible PDFs and hits without a year", () => {
    const selected = labeledHitsToSelectedReports([
      company("Acme", [
        {
          url: "https://example.com/blocked.pdf",
          fetchFailed: true,
          reportYear: "2024",
          reportTypeSlug: "csr-report",
        },
        {
          url: "https://example.com/policy.pdf",
        },
      ]),
    ]);

    expect(selected).toEqual([]);
  });

  it("dedupes the same URL but keeps different PDFs for the same company, year, and type", () => {
    const selected = labeledHitsToSelectedReports([
      company("Acme", [
        {
          url: "https://example.com/csr-2024.pdf",
          reportYear: "2024",
          reportTypeSlug: "csr-report",
        },
        {
          url: "https://example.com/csr-2024.pdf",
          reportYear: "2024",
          reportTypeSlug: "csr-report",
        },
        {
          url: "https://example.com/csr-2024-summary.pdf",
          reportYear: "2024",
          reportTypeSlug: "csr-report",
        },
      ]),
    ]);

    expect(selected.map((item) => item.url)).toEqual([
      "https://example.com/csr-2024.pdf",
      "https://example.com/csr-2024-summary.pdf",
    ]);
  });
});

describe("withFallbackReportType", () => {
  it("labels unlabeled hits as other", () => {
    expect(
      withFallbackReportType({
        url: "https://example.com/cdp-2025.pdf",
        reportYear: "2025",
      }),
    ).toMatchObject({
      reportTypeSlug: "other",
      reportType: "Other",
    });
  });

  it("does not relabel inaccessible PDFs", () => {
    expect(
      withFallbackReportType({
        url: "https://example.com/blocked.pdf",
        fetchFailed: true,
      }),
    ).not.toHaveProperty("reportTypeSlug");
  });
});
