import { describe, expect, it } from "vitest";
import type { Company } from "../types";
import { buildPairedCompanyMaps } from "./company-cross-env-pairing";

function company(
  overrides: Partial<Company> & Pick<Company, "id" | "name">,
): Company {
  return {
    reportingPeriods: [],
    ...overrides,
  };
}

describe("buildPairedCompanyMaps", () => {
  it("pairs companies by wikidataId", () => {
    const stage = company({
      id: "stage-uuid",
      name: "Acme",
      wikidataId: "Q123",
    });
    const prod = company({
      id: "prod-uuid",
      name: "Acme AB",
      wikidataId: "Q123",
    });

    const { stageMap, prodMap, pairingMethods } = buildPairedCompanyMaps(
      [stage],
      [prod],
    );

    expect(stageMap.get("Q123")).toBe(stage);
    expect(prodMap.get("Q123")).toBe(prod);
    expect(pairingMethods.get("Q123")).toBe("wikidata");
  });

  it("pairs companies without wikidata when they share a report sha256", () => {
    const stage = company({
      id: "stage-uuid",
      name: "Acme",
      reportingPeriods: [
        {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
          reportSha256: "shared-pdf",
        },
      ],
    });
    const prod = company({
      id: "prod-uuid",
      name: "Acme AB",
      wikidataId: "Q999",
      reportingPeriods: [
        {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
          reportSha256: "shared-pdf",
        },
      ],
    });

    const { stageMap, prodMap, pairingMethods } = buildPairedCompanyMaps(
      [stage],
      [prod],
    );

    expect(stageMap.get("Q999")).toBe(stage);
    expect(prodMap.get("Q999")).toBe(prod);
    expect(pairingMethods.get("Q999")).toBe("report-identity");
  });

  it("falls back to report identity when wikidata is missing on one side", () => {
    const stage = company({
      id: "stage-uuid",
      name: "Acme",
      reportingPeriods: [
        {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
          reportURL: "https://example.com/sustainability-2024.pdf",
        },
      ],
    });
    const prod = company({
      id: "prod-uuid",
      name: "Acme AB",
      reportingPeriods: [
        {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
          reportURL: "https://example.com/sustainability-2024.pdf",
        },
      ],
    });

    const { stageMap, prodMap, pairingMethods } = buildPairedCompanyMaps(
      [stage],
      [prod],
    );

    const unifiedKey = "report:url:https://example.com/sustainability-2024.pdf";
    expect(stageMap.get(unifiedKey)).toBe(stage);
    expect(prodMap.get(unifiedKey)).toBe(prod);
    expect(pairingMethods.get(unifiedKey)).toBe("report-identity");
  });

  it("does not pair when report identity is ambiguous", () => {
    const stageA = company({
      id: "stage-a",
      name: "A",
      reportingPeriods: [
        {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
          reportSha256: "shared-pdf",
        },
      ],
    });
    const stageB = company({
      id: "stage-b",
      name: "B",
      reportingPeriods: [
        {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
          reportSha256: "shared-pdf",
        },
      ],
    });
    const prod = company({
      id: "prod-uuid",
      name: "Prod",
      reportingPeriods: [
        {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
          reportSha256: "shared-pdf",
        },
      ],
    });

    const { stageMap, prodMap } = buildPairedCompanyMaps(
      [stageA, stageB],
      [prod],
    );

    expect(stageMap.size).toBe(2);
    expect(prodMap.size).toBe(1);
    expect(stageMap.has("local:stage-a")).toBe(true);
    expect(stageMap.has("local:stage-b")).toBe(true);
  });
});
