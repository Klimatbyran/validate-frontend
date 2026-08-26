import { describe, expect, it } from "vitest";

import {
  coverageEntryCrawlCompany,
  coverageEntryForSavedReport,
  groupRegistryReportsByYear,
  pickRegistryReportForYear,
  registryReportMenuLabel,
  registryReportPipelineUrl,
  registryReportYears,
  toRunReportListItem,
  unionRegistryReportPills,
} from "./coverage-registry-report-run";
import type { CoverageEntry } from "./coverage-types";

const entry: CoverageEntry = {
  id: "e1",
  name: "ABB Ltd",
  status: "matched",
  matchedCompany: {
    id: "c1",
    name: "ABB Ltd",
    wikidataId: "Q52825",
  },
  registryReports: [
    {
      reportId: "r1",
      reportYear: "2024",
      companyName: "ABB Ltd",
      wikidataId: "Q52825",
      url: "https://example.com/2024.pdf",
      sourceUrl: null,
      matchMethod: "wikidata",
      prodReady: false,
    },
    {
      reportId: "r2",
      reportYear: "2025",
      companyName: "ABB Ltd",
      wikidataId: "Q52825",
      url: "https://example.com/2025.pdf",
      sourceUrl: null,
      matchMethod: "wikidata",
      prodReady: true,
    },
  ],
};

describe("coverage-registry-report-run", () => {
  it("lists unique registry report years descending", () => {
    expect(registryReportYears(entry.registryReports)).toEqual([2025, 2024]);
  });

  it("ignores registry pills without a parseable year", () => {
    expect(
      registryReportYears([
        { ...entry.registryReports[0]!, reportYear: null },
        { ...entry.registryReports[0]!, reportId: "r-bad", reportYear: "n/a" },
      ]),
    ).toEqual([]);
  });

  it("prefers prod-ready report for a year", () => {
    const reports = [
      ...entry.registryReports,
      {
        ...entry.registryReports[0]!,
        reportId: "r3",
        prodReady: true,
        url: "https://example.com/2024-prod.pdf",
      },
    ];
    expect(pickRegistryReportForYear(reports, 2024)?.url).toBe(
      "https://example.com/2024-prod.pdf",
    );
  });

  it("matches registry years with trimmed non-canonical strings", () => {
    const reports = [
      {
        ...entry.registryReports[0]!,
        reportId: "r-trim",
        reportYear: " 2024 ",
        url: "https://example.com/trimmed-2024.pdf",
      },
    ];
    expect(registryReportYears(reports)).toEqual([2024]);
    expect(pickRegistryReportForYear(reports, 2024)?.url).toBe(
      "https://example.com/trimmed-2024.pdf",
    );
  });

  it("maps registry pill to run modal item", () => {
    const report = entry.registryReports[1]!;
    expect(toRunReportListItem(entry, report)).toEqual({
      id: "r2",
      url: "https://example.com/2025.pdf",
      companyId: "c1",
      companyName: "ABB Ltd",
      wikidataId: "Q52825",
      reportYear: "2025",
    });
  });

  it("uses registry url field for pipeline runs (same as Registry tab)", () => {
    const report = {
      ...entry.registryReports[1]!,
      url: "https://storage.googleapis.com/bucket/uploads/prod/abc.pdf",
      sourceUrl: "https://example.com/2025-dead.pdf",
    };
    expect(registryReportPipelineUrl(report)).toBe(
      "https://storage.googleapis.com/bucket/uploads/prod/abc.pdf",
    );
  });

  it("groups multiple report types under the same year", () => {
    const reports = [
      {
        ...entry.registryReports[1]!,
        reportId: "r-sust",
        reportTypeSlug: "sustainability-report",
        reportTypeLabel: "Sustainability report",
        prodReady: false,
      },
      {
        ...entry.registryReports[1]!,
        reportId: "r-annual",
        reportTypeSlug: "annual-report",
        reportTypeLabel: "Annual report",
        prodReady: true,
      },
    ];
    const groups = groupRegistryReportsByYear(reports);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.year).toBe(2025);
    expect(groups[0]?.prodReady).toBe(true);
    expect(groups[0]?.reports.map((report) => report.reportTypeSlug)).toEqual([
      "sustainability-report",
      "annual-report",
    ]);
  });

  it("appends the filename when a year has two reports of the same type", () => {
    const reports = [
      {
        ...entry.registryReports[1]!,
        reportId: "r-sust",
        url: "https://example.com/sustainability-2025.pdf",
        reportTypeSlug: "sustainability-report",
        reportTypeLabel: "Sustainability report",
      },
      {
        ...entry.registryReports[1]!,
        reportId: "r-sust-summary",
        url: "https://example.com/sustainability-2025-summary.pdf",
        reportTypeSlug: "sustainability-report",
        reportTypeLabel: "Sustainability report",
      },
    ];
    expect(
      registryReportMenuLabel(reports[0]!, reports, "Unknown type"),
    ).toBe("Sustainability report · sustainability-2025.pdf");
    expect(
      registryReportMenuLabel(reports[1]!, reports, "Unknown type"),
    ).toBe("Sustainability report · sustainability-2025-summary.pdf");
  });

  it("does not drop locally saved reports when a reload returns fewer pills", () => {
    const local = [
      {
        ...entry.registryReports[1]!,
        reportId: "r-sust",
        reportYear: "2025",
        reportTypeSlug: "sustainability-report",
      },
      {
        ...entry.registryReports[1]!,
        reportId: "r-annual",
        reportYear: "2025",
        reportTypeSlug: "annual-report",
      },
    ];
    const staleReload = [
      {
        ...local[0]!,
        prodReady: true,
      },
    ];
    const merged = unionRegistryReportPills(local, staleReload);
    expect(merged.map((report) => report.reportId).sort()).toEqual([
      "r-annual",
      "r-sust",
    ]);
    expect(merged.find((report) => report.reportId === "r-sust")?.prodReady).toBe(
      true,
    );
  });
});

describe("coverageEntryForSavedReport", () => {
  it("matches by wikidata id first", () => {
    const other: CoverageEntry = {
      ...entry,
      id: "e2",
      name: "Other",
      matchedCompany: {
        id: "c2",
        name: "Other Inc",
        wikidataId: "Q999",
      },
    };
    expect(
      coverageEntryForSavedReport([other, entry], {
        companyName: "Wrong name",
        wikidataId: "Q52825",
      })?.id,
    ).toBe("e1");
  });

  it("falls back to list or matched company name", () => {
    const unmatched: CoverageEntry = {
      id: "e3",
      name: "Acme list name",
      status: "missing",
      registryReports: [],
    };
    expect(
      coverageEntryForSavedReport([unmatched], {
        companyName: "Acme list name",
      })?.id,
    ).toBe("e3");
  });
});

describe("coverageEntryCrawlCompany", () => {
  it("prefers the matched Garbo name and wikidata id", () => {
    expect(coverageEntryCrawlCompany(entry)).toEqual({
      name: "ABB Ltd",
      wikidataId: "Q52825",
    });
  });
});
