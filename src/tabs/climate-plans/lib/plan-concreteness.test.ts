import { describe, expect, it } from "vitest";
import { computePlanConcreteness } from "./plan-concreteness";
import type { ExploreMunicipalityRecord } from "./explore-types";
import type { Measure } from "./measures-types";

function measure(
  partial: Partial<Measure> & Pick<Measure, "measure_text">,
): Measure {
  return {
    activity: "transport",
    activity_shift_score: 4,
    activity_shifts: [],
    intervention_who: "none",
    intervention_when: "none",
    intervention_what: "none",
    intervention_how: "none",
    intervention_score: 3,
    intervention_reasoning: "",
    intervention_type: "direct",
    ...partial,
  };
}

function record(
  partial: Partial<ExploreMunicipalityRecord>,
): ExploreMunicipalityRecord {
  return {
    id: "x",
    name: "Test",
    regionName: "Västerbotten",
    measures: [],
    commitmentCount: 0,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: 0,
    climateCommitmentGroupCount: 0,
    adaptationCommitmentCount: 0,
    ownCommitmentCount: 0,
    companionReferenceCount: 0,
    markdownChars: 100,
    tefHits: [],
    documentTitle: null,
    adoptedYear: 2020,
    sourceUrl: null,
    county: null,
    dataSources: ["pipeline-measures"],
    ...partial,
  };
}

describe("plan concreteness", () => {
  it("treats a measure as explicit if any judged hit is explicit", () => {
    const m = measure({
      measure_text: "Buy electric buses",
      intervention_who: "municipality",
      intervention_what: "fleet",
      intervention_when: "2027",
      intervention_how: "procurement",
    });
    const result = computePlanConcreteness(
      record({
        measures: [m],
        tefHits: [
          {
            stableId: "a",
            shortLabel: "T-1",
            sectorPath: "Transport",
            group: "Transport",
            confidence: "high",
            measureText: "Buy electric buses",
            description: "",
            source: "official",
            explicit: false,
            shiftFrom: "diesel",
            shiftTo: "ev",
            need: "mobility",
            shiftScore: 5,
            interventionWho: "municipality",
            interventionWhat: "fleet",
            interventionHow: "procurement",
            interventionScore: 5,
          },
          {
            stableId: "b",
            shortLabel: "T-1B",
            sectorPath: "Transport",
            group: "Transport",
            confidence: "high",
            measureText: "Buy electric buses",
            description: "",
            source: "official",
            explicit: true,
            shiftFrom: "diesel",
            shiftTo: "ev",
            need: "mobility",
            shiftScore: 5,
            interventionWho: "municipality",
            interventionWhat: "fleet",
            interventionHow: "procurement",
            interventionScore: 5,
          },
        ],
      }),
    );
    expect(result.explicitMeasureCount).toBe(1);
    expect(result.broadMeasureCount).toBe(0);
    expect(result.fullSpecShare).toBe(1);
    expect(result.broadWordingShare).toBe(0);
  });

  it("counts broad-only measures and incomplete slots separately", () => {
    const result = computePlanConcreteness(
      record({
        measures: [
          measure({
            measure_text: "Promote sustainable travel",
            intervention_who: "municipality",
            intervention_what: "campaign",
          }),
          measure({
            measure_text: "Unrelated without TEF",
            intervention_who: "none",
          }),
        ],
        tefHits: [
          {
            stableId: "c",
            shortLabel: "T-1",
            sectorPath: "Transport",
            group: "Transport",
            confidence: "mid",
            measureText: "Promote sustainable travel",
            description: "",
            source: "official",
            explicit: false,
            shiftFrom: "car",
            shiftTo: "bike",
            need: "mobility",
            shiftScore: 3,
            interventionWho: "municipality",
            interventionWhat: "campaign",
            interventionHow: "none",
            interventionScore: 3,
          },
        ],
      }),
    );
    expect(result.judgedMeasureCount).toBe(1);
    expect(result.broadMeasureCount).toBe(1);
    expect(result.broadWordingShare).toBe(1);
    expect(result.whoCount).toBe(1);
    expect(result.whatCount).toBe(1);
    expect(result.whenCount).toBe(0);
    expect(result.fullSpecCount).toBe(0);
    expect(result.publicHeadlineEn).toMatch(/0 of 2 measures/);
  });
});
