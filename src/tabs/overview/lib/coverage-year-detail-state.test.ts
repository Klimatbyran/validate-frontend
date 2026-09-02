import { describe, expect, it } from "vitest";
import { formatElapsedMs } from "@/lib/format-elapsed-ms";
import { mergeCoverageMatchUpdate } from "@/tabs/overview/lib/coverage-year-detail-state";
import type {
  CoverageEntry,
  CoverageYearDetail,
} from "@/tabs/overview/lib/coverage-types";
import {
  registrySaveResponseStatusClassName,
  registrySaveResponseType,
} from "@/tabs/overview/lib/registry-save-response-status";

function entry(
  partial: Pick<CoverageEntry, "id" | "name" | "status"> &
    Partial<CoverageEntry>,
): CoverageEntry {
  return {
    matchMethod: null,
    matchedCompany: null,
    registryReports: [],
    ...partial,
  };
}

function yearDetail(
  entries: CoverageEntry[],
  overrides: Partial<CoverageYearDetail> = {},
): CoverageYearDetail {
  return {
    listId: "list-1",
    listName: "List",
    year: 2024,
    totalNames: entries.length,
    matchedCount: entries.filter((item) => item.status === "matched").length,
    ambiguousCount: entries.filter((item) => item.status === "ambiguous")
      .length,
    coveragePercent: 0,
    hasAnyReportCount: 0,
    prodReadyCount: 0,
    noReportCount: entries.length,
    registryRefreshedAt: null,
    registryRefreshInProgress: false,
    entries,
    filteredCount: entries.length,
    offset: 0,
    limit: 100,
    hasMore: false,
    ...overrides,
  };
}

describe("formatElapsedMs", () => {
  it("formats minutes and seconds", () => {
    expect(formatElapsedMs(0)).toBe("0:00");
    expect(formatElapsedMs(65_000)).toBe("1:05");
  });
});

describe("registrySaveResponseType", () => {
  it("classifies save outcomes", () => {
    expect(registrySaveResponseType(null)).toBeNull();
    expect(
      registrySaveResponseType({ message: "", successes: [], failed: [] }),
    ).toBe("empty");
    expect(
      registrySaveResponseType({
        message: "",
        successes: [
          {
            id: "1",
            companyName: "A",
            reportYear: 2024,
            url: "https://example.com",
          },
        ],
        failed: [],
      }),
    ).toBe("success");
    expect(registrySaveResponseStatusClassName("partial")).toBe(
      "text-yellow-400",
    );
  });
});

describe("mergeCoverageMatchUpdate", () => {
  it("removes entries that leave the active status filter", () => {
    const previous = yearDetail([
      entry({ id: "a", name: "A", status: "missing" }),
      entry({ id: "b", name: "B", status: "missing" }),
    ]);
    const updated = yearDetail([
      entry({
        id: "a",
        name: "A",
        status: "matched",
        matchMethod: "manual",
        matchedCompany: { id: "c1", name: "A Co", wikidataId: null },
      }),
    ]);

    const merged = mergeCoverageMatchUpdate(previous, updated, "missing");
    expect(merged.entries.map((item) => item.id)).toEqual(["b"]);
    expect(merged.filteredCount).toBe(1);
  });
});
