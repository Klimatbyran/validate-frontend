import { describe, expect, it } from "vitest";
import {
  computeEmissionFocusGap,
  computeMainFocus,
  computeSincePlanTrend,
  conversationStartersEn,
  focusMatchPlainEn,
  measureCountsBySector,
} from "./website-kpis";
import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "./explore-types";
import type { Measure } from "./measures-types";

function measure(
  partial: Partial<Measure> & Pick<Measure, "measure_text">,
): Measure {
  return {
    activity: "transport",
    activity_shift_score: 4,
    activity_shifts: [],
    intervention_who: "municipality",
    intervention_when: "2026",
    intervention_what: "bus",
    intervention_how: "procurement",
    intervention_score: 5,
    intervention_reasoning: "",
    intervention_type: "direct",
    ...partial,
  };
}

function record(
  partial: Partial<ExploreMunicipalityRecord>,
): ExploreMunicipalityRecord {
  return {
    id: "bjurholm",
    name: "Bjurholm",
    regionName: "Västerbotten",
    measures: [],
    commitmentCount: 0,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: 0,
    climateCommitmentGroupCount: 0,
    adaptationCommitmentCount: 0,
    ownCommitmentCount: 0,
    companionReferenceCount: 0,
    markdownChars: 1000,
    tefHits: [],
    documentTitle: "Klimatplan",
    adoptedYear: 2021,
    sourceUrl: null,
    county: "Västerbottens län",
    dataSources: ["pipeline-measures"],
    ...partial,
  };
}

describe("website KPI prototypes", () => {
  it("counts measures by gate domain / TEF sector", () => {
    const measures = [
      measure({
        measure_text: "buses",
        activity_shifts: [
          {
            activity: "mobility",
            shift_from: "car",
            shift_to: "bus",
            need: "mobility",
            type: "Type Shift",
            type_reasoning: "",
            score: 5,
            reasoning: "",
            transition_element_matches: [
              {
                stable_id: "bus",
                short_label: "T-1A1b-TE-1 - Electric buses",
                description: "",
                sector_path: "Transport > Mobility",
                match_confidence: "high",
                explicit: true,
              },
            ],
            transition_element_candidates: [],
            transition_element_gate_domain: "Transport",
          },
        ],
      }),
    ];
    expect(measureCountsBySector(measures).transport).toBe(1);
    expect(measureCountsBySector(measures).afolu).toBe(0);
  });

  it("reports emission focus gap for missing agriculture & land use measures", () => {
    const emissions: SectorYearEmissions[] = [
      {
        municipalityName: "Bjurholm",
        byYear: {
          "2024": {
            Transporter: 40,
            Jordbruk: 60,
          },
        },
      },
    ];
    const row = record({
      measures: [
        measure({
          measure_text: "only transport",
          activity_shifts: [
            {
              activity: "mobility",
              shift_from: "car",
              shift_to: "bus",
              need: "mobility",
              type: "Type Shift",
              type_reasoning: "",
              score: 5,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
              transition_element_gate_domain: "Transport",
            },
          ],
        }),
      ],
    });
    const gap = computeEmissionFocusGap(row, emissions);
    expect(gap.gapShare).toBeCloseTo(0.6);
    expect(gap.missingSectors).toEqual(["afolu"]);
    expect(gap.focusMatch).toBe("miss");
  });

  it("builds a main-focus sentence from enough TEF evidence", () => {
    const hits = Array.from({ length: 6 }, (_, i) => ({
      stableId: `ev-${i}`,
      shortLabel: "T-1A1a-TE-1 - Shift to electric cars",
      sectorPath: "Transport > Mobility > Road",
      group: "Transport",
      confidence: "high" as const,
      measureText: `EV measure ${i}`,
      description: "",
      source: "official" as const,
      explicit: true,
      shiftFrom: "petrol",
      shiftTo: "ev",
      need: "mobility",
      shiftScore: 5,
      interventionWho: "municipality",
      interventionWhat: "fleet",
      interventionHow: "procurement",
      interventionScore: 5,
    }));
    const result = computeMainFocus(record({ tefHits: hits }));
    expect(result.sentenceEn).toMatch(/electrified vehicles/i);
    expect(result.sentenceSv).toBeTruthy();
  });

  it("uses plain yes/partly/not-really instead of focus-match jargon", () => {
    const plain = focusMatchPlainEn("miss", "Agriculture & land use");
    expect(plain.question).toMatch(/biggest emissions source/i);
    expect(plain.shortLabel).toBe("Not really");
    expect(plain.answer).toMatch(/Agriculture & land use/i);
    expect(plain.answer).toMatch(/no actions/i);
  });

  it("marks biggest-source match when top sector is tied and ≥25% of actions", () => {
    const emissions = [
      {
        municipalityName: "Bjurholm",
        byYear: {
          "2024": {
            Transporter: 50,
            Industri: 50,
            Jordbruk: 10,
          },
        },
      },
    ];
    const row = record({
      measures: [
        measure({
          measure_text: "transport a",
          activity_shifts: [
            {
              activity: "mobility",
              shift_from: "car",
              shift_to: "bus",
              need: "mobility",
              type: "Type Shift",
              type_reasoning: "",
              score: 5,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
              transition_element_gate_domain: "Transport",
            },
          ],
        }),
        measure({
          measure_text: "industry a",
          activity_shifts: [
            {
              activity: "industry",
              shift_from: "oil",
              shift_to: "electric",
              need: "process",
              type: "Type Shift",
              type_reasoning: "",
              score: 5,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
              transition_element_gate_domain: "Industry",
            },
          ],
        }),
      ],
    });
    const gap = computeEmissionFocusGap(row, emissions);
    // Industry and transport tie on emissions; stable sectorId sort picks industry
    // first alphabetically among equal tonnes? Sort is emission then sectorId —
    // Industri 50 vs Transporter 50 → afolu not in play; industry vs transport:
    // industry id "industry", transport "transport" → industry first as largest.
    expect(gap.largestSectorId).toBe("industry");
    expect(gap.focusMatch).toBe("match");
  });

  it("marks partial when biggest source has actions but under 25% share", () => {
    const agHeavy = [
      {
        municipalityName: "Bjurholm",
        byYear: {
          "2024": {
            Jordbruk: 80,
            Transporter: 20,
          },
        },
      },
    ];
    const row = record({
      measures: [
        measure({
          measure_text: "farm",
          activity_shifts: [
            {
              activity: "ag",
              shift_from: "a",
              shift_to: "b",
              need: "food",
              type: "Type Shift",
              type_reasoning: "",
              score: 5,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
              transition_element_gate_domain: "Agriculture",
            },
          ],
        }),
        measure({
          measure_text: "t1",
          activity_shifts: [
            {
              activity: "mobility",
              shift_from: "car",
              shift_to: "bus",
              need: "mobility",
              type: "Type Shift",
              type_reasoning: "",
              score: 5,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
              transition_element_gate_domain: "Transport",
            },
          ],
        }),
        measure({
          measure_text: "t2",
          activity_shifts: [
            {
              activity: "mobility",
              shift_from: "car",
              shift_to: "bike",
              need: "mobility",
              type: "Type Shift",
              type_reasoning: "",
              score: 5,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
              transition_element_gate_domain: "Transport",
            },
          ],
        }),
        measure({
          measure_text: "t3",
          activity_shifts: [
            {
              activity: "mobility",
              shift_from: "car",
              shift_to: "walk",
              need: "mobility",
              type: "Type Shift",
              type_reasoning: "",
              score: 5,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
              transition_element_gate_domain: "Transport",
            },
          ],
        }),
        measure({
          measure_text: "t4",
          activity_shifts: [
            {
              activity: "mobility",
              shift_from: "diesel",
              shift_to: "ev",
              need: "mobility",
              type: "Type Shift",
              type_reasoning: "",
              score: 5,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
              transition_element_gate_domain: "Transport",
            },
          ],
        }),
      ],
    });
    const gap = computeEmissionFocusGap(row, agHeavy);
    expect(gap.largestSectorId).toBe("afolu");
    expect(gap.focusMatch).toBe("partial");
  });

  it("builds conversation starters from gap and miss signals", () => {
    const gap = computeEmissionFocusGap(
      record({
        measures: [
          measure({
            measure_text: "only transport",
            activity_shifts: [
              {
                activity: "mobility",
                shift_from: "car",
                shift_to: "bus",
                need: "mobility",
                type: "Type Shift",
                type_reasoning: "",
                score: 5,
                reasoning: "",
                transition_element_matches: [],
                transition_element_candidates: [],
                transition_element_gate_domain: "Transport",
              },
            ],
          }),
        ],
      }),
      [
        {
          municipalityName: "Bjurholm",
          byYear: {
            "2023": {
              Transporter: 40,
              Jordbruk: 60,
            },
          },
        },
      ],
    );
    const starters = conversationStartersEn({
      placeName: "Bjurholm",
      gap,
      sincePlan: {
        annualChangePercent: null,
        fromYear: null,
        toYear: null,
        observationCount: 0,
        status: "no-plan-year",
        noteEn: "",
      },
      adoptedYear: 2018,
    });
    expect(starters.length).toBeGreaterThan(0);
    expect(
      starters.some((s) => /Agriculture & land use|biggest source/i.test(s)),
    ).toBe(true);
  });

  it("marks since-plan trends as too-new with few years", () => {
    const emissions: SectorYearEmissions[] = [
      {
        municipalityName: "Bjurholm",
        byYear: {
          "2023": { Transporter: 10 },
          "2024": { Transporter: 9 },
        },
      },
    ];
    const trend = computeSincePlanTrend(
      record({ adoptedYear: 2023 }),
      emissions,
    );
    expect(trend.status).toBe("too-new");
    expect(trend.annualChangePercent).toBeNull();
  });
});
