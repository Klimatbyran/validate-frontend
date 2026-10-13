import { describe, expect, it } from "vitest";
import type { ExploreMunicipalityRecord } from "./explore-types";
import type { Measure } from "./measures-types";
import {
  sectorEmissionSharesForScope,
  sectorGateMatchRates,
  tefSectorFromGateDomain,
} from "./tef-sector-signals";

function measureWithGate(
  domain: string | null,
  matched: boolean,
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
        transition_element_matches: matched
          ? [
              {
                stable_id: "tef-1",
                short_label: "Shift",
                description: "",
                sector_path: "Transport",
                match_confidence: "high",
              },
            ]
          : [],
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

describe("sectorGateMatchRates", () => {
  it("counts gated shifts and how many got a confirmed match", () => {
    const rows = [
      record({
        name: "Nässjö",
        measures: [
          measureWithGate("Waste", true),
          measureWithGate("waste", false),
          measureWithGate("Transport", true),
          measureWithGate(null, true),
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
      matched: 1,
      rate: 0.5,
    });
    expect(bySector.transport.gated).toBe(1);
    expect(bySector.transport.matched).toBe(1);
    expect(bySector.industry.gated).toBe(0);
    expect(bySector.industry.rate).toBeNull();
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
