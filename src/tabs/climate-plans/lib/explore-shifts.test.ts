import { describe, expect, it } from "vitest";
import {
  buildShiftFlows,
  collectMeasurePoints,
  dimensionPresent,
  interventionTypeBuckets,
  summarizeMunicipalities,
} from "./explore-shifts";
import type { ExploreMunicipalityRecord } from "./explore-types";
import type { Measure } from "./measures-types";

function measure(partial: Partial<Measure>): Measure {
  return {
    measure_text: partial.measure_text ?? "measure",
    activity: partial.activity ?? "",
    activity_shift_score: partial.activity_shift_score ?? 1,
    activity_shifts: partial.activity_shifts ?? [],
    intervention_who: partial.intervention_who ?? "none",
    intervention_when: partial.intervention_when ?? "none",
    intervention_what: partial.intervention_what ?? "none",
    intervention_how: partial.intervention_how ?? "none",
    intervention_score: partial.intervention_score ?? 1,
    intervention_reasoning: partial.intervention_reasoning ?? "",
    intervention_type: partial.intervention_type ?? "none",
  };
}

function record(
  name: string,
  measures: Measure[],
): ExploreMunicipalityRecord {
  return {
    id: name.toLowerCase(),
    name,
    regionName: null,
    measures,
    commitmentCount: measures.length,
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
    adoptedYear: null,
    sourceUrl: null,
    county: null,
    dataSources: [],
  };
}

describe("dimensionPresent", () => {
  it("treats score > 1 as present", () => {
    expect(dimensionPresent(1)).toBe(false);
    expect(dimensionPresent(2)).toBe(true);
  });
});

describe("shift and intervention aggregates", () => {
  const records = [
    record("Nässjö", [
      measure({
        activity_shift_score: 4,
        intervention_score: 1,
        intervention_type: "none",
        activity_shifts: [
          {
            activity: "travel",
            shift_from: "car",
            shift_to: "train",
            need: "mobility",
            type: "Type Shift",
            type_reasoning: "",
            score: 4,
            reasoning: "",
            transition_element_matches: [
              {
                stable_id: "a",
                short_label: "T-1",
                description: "",
                sector_path: "Transport",
                match_confidence: "high",
              },
            ],
            transition_element_candidates: [],
          },
        ],
      }),
      measure({
        activity_shift_score: 1,
        intervention_score: 5,
        intervention_type: "direct",
        intervention_who: "municipality",
        intervention_what: "buy bikes",
      }),
    ]),
    record("Värnamo", [
      measure({
        activity_shift_score: 3,
        intervention_score: 2,
        intervention_type: "enabling",
        activity_shifts: [
          {
            activity: "travel",
            shift_from: "car",
            shift_to: "train",
            need: "mobility",
            type: "Type Shift",
            type_reasoning: "",
            score: 3,
            reasoning: "",
            transition_element_matches: [],
            transition_element_candidates: [],
          },
        ],
      }),
    ]),
  ];

  it("summarizes municipalities", () => {
    const rows = summarizeMunicipalities(records);
    expect(rows[0]?.municipalityName).toBe("Nässjö");
    expect(rows[0]?.shiftPresentCount).toBe(1);
    expect(rows[0]?.interventionPresentCount).toBe(1);
  });

  it("builds shift flows across municipalities", () => {
    const flows = buildShiftFlows(records);
    expect(flows[0]?.from).toBe("car");
    expect(flows[0]?.to).toBe("train");
    expect(flows[0]?.count).toBe(2);
    expect(flows[0]?.municipalities).toEqual(["Nässjö", "Värnamo"]);
    expect(flows[0]?.withTefMatch).toBe(1);
  });

  it("skips none→none flow noise", () => {
    const noisy = [
      record("X", [
        measure({
          activity_shifts: [
            {
              activity: "a",
              shift_from: "none",
              shift_to: "none",
              need: "",
              type: "",
              type_reasoning: "",
              score: 1,
              reasoning: "",
              transition_element_matches: [],
              transition_element_candidates: [],
            },
          ],
        }),
      ]),
    ];
    expect(buildShiftFlows(noisy)).toEqual([]);
  });

  it("buckets intervention types", () => {
    const buckets = interventionTypeBuckets(records);
    expect(buckets.find((b) => b.type === "direct")?.count).toBe(1);
    expect(buckets.find((b) => b.type === "enabling")?.count).toBe(1);
    expect(buckets.find((b) => b.type === "none")?.count).toBe(1);
  });

  it("collects measure points with component flags", () => {
    const points = collectMeasurePoints(records);
    expect(points).toHaveLength(3);
    const withWho = points.find((p) => p.hasWho);
    expect(withWho?.interventionType).toBe("direct");
    expect(withWho?.tefMatchCount).toBe(0);
  });
});
