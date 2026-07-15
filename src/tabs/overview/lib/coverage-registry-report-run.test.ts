import { describe, expect, it } from "vitest";

import {
  pickRegistryReportForYear,
  registryReportYears,
  toRunReportListItem,
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
      companyName: "ABB Ltd",
      wikidataId: "Q52825",
      reportYear: "2025",
    });
  });
});
