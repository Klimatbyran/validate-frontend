import { describe, expect, it } from "vitest";
import {
  filterRegistryEntries,
  parseRegistrySearchTerms,
  registryEntryMatchesSearchTerm,
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
      parseRegistrySearchTerms("Skue Sparebank\nMagnora ASA\nTekna Holding ASA"),
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

describe("registryEntryMatchesSearchTerm", () => {
  it("matches company name and wikidata id", () => {
    expect(registryEntryMatchesSearchTerm(sampleEntries[0]!, "skue")).toBe(true);
    expect(registryEntryMatchesSearchTerm(sampleEntries[0]!, "Q111")).toBe(true);
    expect(registryEntryMatchesSearchTerm(sampleEntries[0]!, "Q999")).toBe(
      false,
    );
  });
});
