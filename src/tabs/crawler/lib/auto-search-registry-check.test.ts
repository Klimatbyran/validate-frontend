import { describe, expect, it } from "vitest";
import {
  buildFuzzyRegistrySearchTerms,
  fuzzyCompanyNamesMatch,
  normalizeCompanyNameForMatch,
  registryEntryMatchesAutoSearchCompany,
} from "./auto-search-registry-check";
import type { RegistryEntry } from "@/tabs/registry/lib/registry-types";

describe("normalizeCompanyNameForMatch", () => {
  it("strips legal suffixes and punctuation", () => {
    expect(normalizeCompanyNameForMatch("Volvo Car AB")).toBe("volvo car");
    expect(normalizeCompanyNameForMatch("Magnora ASA")).toBe("magnora");
  });
});

describe("fuzzyCompanyNamesMatch", () => {
  it("matches equivalent company names", () => {
    expect(fuzzyCompanyNamesMatch("Volvo Car AB", "Volvo Cars")).toBe(true);
    expect(fuzzyCompanyNamesMatch("HSBC Holdings plc", "HSBC Holdings")).toBe(
      true,
    );
  });

  it("rejects unrelated names", () => {
    expect(fuzzyCompanyNamesMatch("Volvo Car AB", "Ericsson AB")).toBe(false);
  });
});

describe("buildFuzzyRegistrySearchTerms", () => {
  it("includes full name and shorter variants", () => {
    expect(buildFuzzyRegistrySearchTerms("Volvo Car AB")).toEqual([
      "Volvo Car AB",
      "volvo car",
      "volvo",
    ]);
  });
});

describe("registryEntryMatchesAutoSearchCompany", () => {
  const entry: RegistryEntry = {
    id: "1",
    companyName: "Volvo Cars",
    wikidataId: "Q215539",
    reportYear: "2024",
    url: "https://example.com/volvo.pdf",
  };

  it("matches by wikidata id", () => {
    expect(
      registryEntryMatchesAutoSearchCompany(entry, "Volvo Car AB", "Q215539"),
    ).toBe(true);
  });

  it("matches by fuzzy company name", () => {
    expect(
      registryEntryMatchesAutoSearchCompany(entry, "Volvo Car AB"),
    ).toBe(true);
  });
});
