import { describe, expect, it } from "vitest";

import type { CompanyReport } from "./crawler-types";
import {
  CRAWL_UNREACHABLE_MESSAGE,
  SEARCH_REPORT_JOB_TIMEOUT_MESSAGE,
  sanitizeCrawlErrorMessage,
} from "./crawler-types";
import {
  labeledHitsToSelectedReports,
  mergeSaveReportsResponses,
  selectedReportFromHit,
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
  const now = new Date().getFullYear();
  const recent = String(now);
  const lastYear = String(now - 1);

  it("saves fetched PDFs with a year even when type or S3 is missing", () => {
    const selected = labeledHitsToSelectedReports([
      company("Acme", [
        {
          url: `https://example.com/csr-${recent}.pdf`,
          reportYear: recent,
          reportTypeSlug: "csr-report",
        },
        {
          url: `https://example.com/cdp-${recent}.pdf`,
          reportYear: recent,
        },
        {
          url: `https://example.com/report-${lastYear}.pdf`,
          title: `Something ${lastYear}`,
        },
      ]),
    ]);

    expect(selected.map((item) => item.url)).toEqual([
      `https://example.com/csr-${recent}.pdf`,
      `https://example.com/report-${lastYear}.pdf`,
    ]);
    expect(selected[1]?.reportYear).toBe(lastYear);
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

  it("keeps a parent company's own BRSR filing", () => {
    const selected = labeledHitsToSelectedReports([
      company("Infosys", [
        {
          url: "https://example.com/infosys-brsr-2025.pdf",
          reportYear: "2025",
          reportTypeSlug: "sustainability-report",
        },
      ]),
    ]);

    expect(selected.map((item) => item.url)).toEqual([
      "https://example.com/infosys-brsr-2025.pdf",
    ]);
  });

  it("infers a four-digit year from the URL when the hit year is not YYYY", () => {
    const selected = labeledHitsToSelectedReports([
      company("Acme", [
        {
          url: `https://example.com/csr-${recent}.pdf`,
          reportYear: `${recent}-${Number(recent) + 1}`,
          title: `FY${recent} CSR`,
        },
      ]),
    ]);

    expect(selected).toEqual([
      expect.objectContaining({
        url: `https://example.com/csr-${recent}.pdf`,
        reportYear: recent,
      }),
    ]);
  });

  it("pins auto-save to a requested crawl year instead of the recency window", () => {
    const selected = labeledHitsToSelectedReports([
      {
        companyName: "Acme",
        wikidataId: "Q1",
        reportYear: recent,
        results: [
          {
            url: `https://example.com/csr-${recent}.pdf`,
            reportYear: recent,
            reportTypeSlug: "csr-report",
          },
          {
            url: `https://example.com/csr-${lastYear}.pdf`,
            reportYear: lastYear,
            reportTypeSlug: "csr-report",
          },
        ],
      },
    ]);

    expect(selected.map((item) => item.url)).toEqual([
      `https://example.com/csr-${recent}.pdf`,
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

  it("does not overwrite a slug with Other when the label is missing", () => {
    expect(
      withFallbackReportType({
        url: "https://example.com/csr-2024.pdf",
        reportTypeSlug: "csr-report",
      }),
    ).toMatchObject({
      reportTypeSlug: "csr-report",
      reportType: "csr-report",
    });
  });

  it("keeps a label without inventing an other slug", () => {
    expect(
      withFallbackReportType({
        url: "https://example.com/sust.pdf",
        reportType: "Sustainability report",
      }),
    ).toMatchObject({
      reportType: "Sustainability report",
    });
    expect(
      withFallbackReportType({
        url: "https://example.com/sust.pdf",
        reportType: "Sustainability report",
      }),
    ).not.toHaveProperty("reportTypeSlug", "other");
  });
});

describe("selectedReportFromHit", () => {
  it("returns null when no four-digit year can be inferred", () => {
    expect(
      selectedReportFromHit({
        companyName: "Acme",
        url: "https://example.com/report.pdf",
      }),
    ).toBeNull();
  });

  it("omits reportTypeSlug when the hit has no classifier type", () => {
    expect(
      selectedReportFromHit({
        companyName: "Acme",
        url: "https://example.com/report-2025.pdf",
      }),
    ).toMatchObject({
      reportYear: "2025",
      reportTypeSlug: undefined,
    });
  });
});

describe("mergeSaveReportsResponses", () => {
  it("keeps earlier successes when a later company save fails", () => {
    const merged = mergeSaveReportsResponses(
      {
        message: "",
        successes: [
          {
            id: "1",
            companyName: "Acme",
            reportYear: "2025",
            url: "https://example.com/a.pdf",
          },
        ],
        failed: [],
      },
      {
        message: "Failed to save to registry",
        successes: [],
        failed: [
          {
            error: "unknown",
            companyName: "Beta",
            reportYear: "2025",
            message: "Failed to save to registry",
          },
        ],
      },
    );

    expect(merged.successes).toHaveLength(1);
    expect(merged.failed).toHaveLength(1);
    expect(merged.successes[0]?.companyName).toBe("Acme");
  });
});

describe("sanitizeCrawlErrorMessage", () => {
  it("keeps a 404 poll error readable and strips control characters", () => {
    expect(sanitizeCrawlErrorMessage("Search job not found (404)\n")).toBe(
      "Search job not found (404)",
    );
  });

  it("does not collapse timeout and unreachable copy into one string", () => {
    expect(SEARCH_REPORT_JOB_TIMEOUT_MESSAGE).not.toBe(
      CRAWL_UNREACHABLE_MESSAGE,
    );
  });
});
