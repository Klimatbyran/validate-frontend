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
