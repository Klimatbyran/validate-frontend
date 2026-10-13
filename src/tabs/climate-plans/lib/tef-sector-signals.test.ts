import { describe, expect, it } from "vitest";
import type { ExploreMunicipalityRecord } from "./explore-types";
import type { Measure } from "./measures-types";
import {
  filterRecordsByScope,
  sectorEmissionSharesForScope,
  sectorGateMatchRates,
  tefSectorFromGateDomain,
  tefSectorFromMatch,
} from "./tef-sector-signals";

function measureWithGate(
  domain: string | null,
  matchSectorPath: string | null,
): Measure {
  return {
    measure_text: "measure",
    activity: "road",
    activity_shift_score: 4,
    activity_shifts: [
      {
        activity: "commuting",
        shift_from: "car",
        shift_to: "train",
        need: "mobility",
        type: "Type Shift",
        type_reasoning: "",
        score: 4,
        reasoning: "",
        transition_element_matches:
          matchSectorPath == null
            ? []
            : [
                {
                  stable_id: "tef-1",
                  short_label: "Shift",
                  description: "",
                  sector_path: matchSectorPath,
                  match_confidence: "high",
                },
              ],
        transition_element_candidates: [],
        transition_element_gate_domain: domain,
      },
    ],
    intervention_who: "municipality",
    intervention_when: "2026",
    intervention_what: "bus",
    intervention_how: "procurement",
    intervention_score: 5,
    intervention_reasoning: "",
    intervention_type: "direct",
  };
}

function record(
  partial: Partial<ExploreMunicipalityRecord> &
    Pick<ExploreMunicipalityRecord, "name">,
): ExploreMunicipalityRecord {
  return {
    id: partial.name.toLowerCase(),
    name: partial.name,
    regionName: "Jönköping",
    measures: [],
    commitmentCount: 0,
    commitmentSource: "measures-as-proxy",
    climateRelevantCommitmentCount: null,
    climateCommitmentGroupCount: null,
    markdownChars: null,
    tefHits: [],
    goals: [],
    hasQuantifiedTargets: null,
    parisMentioned: null,
    onePointFiveMentioned: null,
    carbonBudgetReferenced: null,
    documentTitle: null,
    documentType: null,
    adoptionDate: null,
    planPeriodStart: null,
    planPeriodEnd: null,
    primaryFocus: null,
    adoptedYear: 2022,
    sourceUrl: null,
    county: "Jönköpings län",
    dataSources: [],
    ...partial,
  };
}

describe("tefSectorFromGateDomain", () => {
  it("accepts labels, aliases, and T-n codes", () => {
    expect(tefSectorFromGateDomain("Waste")).toBe("waste");
    expect(tefSectorFromGateDomain("transport")).toBe("transport");
    expect(tefSectorFromGateDomain("T-6")).toBe("waste");
    expect(tefSectorFromGateDomain("T-3A1-TE-2")).toBe("afolu");
    expect(tefSectorFromGateDomain("mystery")).toBeNull();
    expect(tefSectorFromGateDomain(null)).toBeNull();
  });
});

describe("tefSectorFromMatch", () => {
  it("prefers catalogue index then sector_path group", () => {
    expect(
      tefSectorFromMatch({
        short_label: "T-6A1-TE-1 - Recycling",
        sector_path: "Waste > Solids",
      }),
    ).toBe("waste");
    expect(
      tefSectorFromMatch({
        short_label: "Shift",
        sector_path: "Transport > Road",
      }),
    ).toBe("transport");
  });
});

describe("sectorGateMatchRates", () => {
  it("counts only same-domain confirmed matches", () => {
    const rows = [
      record({
        name: "Nässjö",
        measures: [
          // Waste gated, but match is Transport → not a waste match
          measureWithGate("Waste", "Transport > Road"),
          measureWithGate("waste", null),
          measureWithGate("Transport", "Transport > Road"),
          measureWithGate(null, "Transport > Road"),
        ],
      }),
    ];
    const { bySector, hasAnyGateData } = sectorGateMatchRates(
      rows,
      "all",
      null,
    );
    expect(hasAnyGateData).toBe(true);
    expect(bySector.waste).toEqual({
      sectorId: "waste",
      gated: 2,
      matched: 0,
      rate: 0,
    });
    expect(bySector.transport.gated).toBe(1);
    expect(bySector.transport.matched).toBe(1);
    expect(bySector.industry.gated).toBe(0);
    expect(bySector.industry.rate).toBeNull();
  });

  it("returns empty aggregates when scoped without a place", () => {
    const rows = [
      record({
        name: "Nässjö",
        measures: [measureWithGate("Waste", "Waste > Solids")],
      }),
    ];
    const { bySector, hasAnyGateData } = sectorGateMatchRates(
      rows,
      "municipality",
      null,
    );
    expect(hasAnyGateData).toBe(false);
    expect(bySector.waste.gated).toBe(0);
  });
});

describe("filterRecordsByScope", () => {
  it("does not fall back to all records when place is missing", () => {
    const rows = [record({ name: "Nässjö" }), record({ name: "Vaggeryd" })];
    expect(filterRecordsByScope(rows, "region", null)).toEqual([]);
    expect(filterRecordsByScope(rows, "municipality", "Nässjö")).toHaveLength(
      1,
    );
  });
});

describe("sectorEmissionSharesForScope", () => {
  it("aggregates latest-year mapped buckets into TEF sector shares", () => {
    const rows = [
      record({ name: "Nässjö" }),
      record({ name: "Vaggeryd", regionName: "Jönköping" }),
    ];
    const emissions = [
      {
        municipalityName: "Nässjö",
        byYear: {
          "2022": { Transporter: 80, Industri: 20, Avfall: 10 },
          "2023": { Transporter: 70, Industri: 30, Avfall: 0 },
        },
      },
      {
        municipalityName: "Vaggeryd",
        byYear: {
          "2023": { Transporter: 30, Industri: 70 },
        },
      },
    ];
    const { bySector, totalTonnes } = sectorEmissionSharesForScope(
      rows,
      emissions,
      "all",
      null,
    );
    // Latest years: Nässjö 70+30+0, Vaggeryd 30+70 → transport 100, industry 100
    expect(totalTonnes).toBe(200);
    expect(bySector.transport.tonnes).toBe(100);
    expect(bySector.industry.tonnes).toBe(100);
    expect(bySector.transport.share).toBeCloseTo(0.5);
    expect(bySector.waste.tonnes).toBe(0);
  });
});
