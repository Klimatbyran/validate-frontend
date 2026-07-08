import { describe, expect, it } from "vitest";
import {
  filterRegistryEntries,
  isSameRegistryEntrySelection,
  parseRegistrySearchTerms,
  registryEntryMatchesSearchTerm,
  registryEntrySelectionKey,
  resolveRegistryEntryReportTypeId,
} from "./registry-utils";
import type { RegistryEntry } from "./registry-types";

const sampleEntries: RegistryEntry[] = [
  {
    id: "1",
    companyName: "Skue Sparebank",
    wikidataId: "Q111",
    reportYear: "2024",
    url: "https://example.com/skue.pdf",
  },
  {
    id: "2",
    companyName: "Magnora ASA",
    wikidataId: "Q222",
    reportYear: "2024",
    url: "https://example.com/magnora.pdf",
  },
  {
    id: "3",
    companyName: "Tekna Holding ASA",
    wikidataId: "Q333",
    reportYear: "2023",
    url: "https://example.com/tekna.pdf",
  },
];

describe("parseRegistrySearchTerms", () => {
  it("splits newline-separated company names", () => {
    expect(
      parseRegistrySearchTerms(
        "Skue Sparebank\nMagnora ASA\nTekna Holding ASA",
      ),
    ).toEqual(["Skue Sparebank", "Magnora ASA", "Tekna Holding ASA"]);
  });

  it("splits tab-separated names from Excel row paste", () => {
    expect(parseRegistrySearchTerms("Skue Sparebank\tMagnora ASA")).toEqual([
      "Skue Sparebank",
      "Magnora ASA",
    ]);
  });

  it("dedupes terms case-insensitively", () => {
    expect(parseRegistrySearchTerms("Skue Sparebank\nskue sparebank")).toEqual([
      "Skue Sparebank",
    ]);
  });
});

describe("filterRegistryEntries", () => {
  it("matches a single term like before", () => {
    expect(filterRegistryEntries(sampleEntries, "Q222")).toEqual([
      sampleEntries[1],
    ]);
  });

  it("returns union of matches for multi-line paste", () => {
    const query = "Skue Sparebank\nTekna Holding ASA";
    const result = filterRegistryEntries(sampleEntries, query);
    expect(result.map((e) => e.id)).toEqual(["1", "3"]);
  });

  it("returns all entries when query is empty", () => {
    expect(filterRegistryEntries(sampleEntries, "")).toEqual(sampleEntries);
    expect(filterRegistryEntries(sampleEntries, "   \n  ")).toEqual(
      sampleEntries,
    );
  });
});

describe("registryEntrySelectionKey", () => {
  it("uses id when present so same wikidataId rows stay distinct", () => {
    const abb2023: RegistryEntry = {
      id: "report-2023",
      companyName: "ABB",
      wikidataId: "Q52846",
      reportYear: "2023",
      url: "https://example.com/abb-2023.pdf",
    };
    const abb2024: RegistryEntry = {
      id: "report-2024",
      companyName: "ABB",
      wikidataId: "Q52846",
      reportYear: "2024",
      url: "https://example.com/abb-2024.pdf",
    };

    expect(registryEntrySelectionKey(abb2023)).not.toBe(
      registryEntrySelectionKey(abb2024),
    );
    expect(isSameRegistryEntrySelection(abb2023, abb2024)).toBe(false);
  });

  it("falls back to url when id is missing", () => {
    const entry: RegistryEntry = {
      companyName: "ABB",
      wikidataId: "Q52846",
      url: "https://example.com/abb.pdf",
    };
    expect(registryEntrySelectionKey(entry)).toBe(
      "https://example.com/abb.pdf",
    );
  });
});

describe("resolveRegistryEntryReportTypeId", () => {
  it("prefers top-level reportTypeId", () => {
    const entry: RegistryEntry = {
      url: "https://example.com/a.pdf",
      reportTypeId: " top-id ",
      reportType: { id: "embedded-id", slug: "annual", label: "Annual" },
    };
    expect(resolveRegistryEntryReportTypeId(entry)).toBe("top-id");
  });

  it("falls back to embedded reportType.id when reportTypeId is missing", () => {
    const entry: RegistryEntry = {
      url: "https://example.com/a.pdf",
      reportType: { id: " embedded-id ", slug: "annual", label: "Annual" },
    };
    expect(resolveRegistryEntryReportTypeId(entry)).toBe("embedded-id");
  });

  it("returns empty string when no report type is set", () => {
    const entry: RegistryEntry = { url: "https://example.com/a.pdf" };
    expect(resolveRegistryEntryReportTypeId(entry)).toBe("");
  });
});

describe("registryEntryMatchesSearchTerm", () => {
  it("matches company name and wikidata id", () => {
    expect(registryEntryMatchesSearchTerm(sampleEntries[0]!, "skue")).toBe(
      true,
    );
    expect(registryEntryMatchesSearchTerm(sampleEntries[0]!, "Q111")).toBe(
      true,
    );
    expect(registryEntryMatchesSearchTerm(sampleEntries[0]!, "Q999")).toBe(
      false,
    );
  });
});
