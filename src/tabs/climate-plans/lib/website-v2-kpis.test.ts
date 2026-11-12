import { describe, expect, it } from "vitest";
import {
  exactTefHits,
  uniqueMeasureCount,
  focusMatchMapValue,
} from "./website-v2-kpis";
import type { ExploreMunicipalityRecord, TefHit } from "./explore-types";
import type { Measure } from "./measures-types";

function measure(text: string): Measure {
  return {
    measure_text: text,
    activity: "transport",
    activity_shift_score: 4,
    activity_shifts: [],
    intervention_who: "municipality",
    intervention_when: "2027",
    intervention_what: "fleet",
    intervention_how: "procurement",
    intervention_score: 5,
    intervention_reasoning: "",
    intervention_type: "direct",
  };
}

function hit(
  partial: Partial<TefHit> & Pick<TefHit, "stableId" | "explicit">,
): TefHit {
  return {
    shortLabel: "T-1A1b-TE-1 - Electric buses",
    sectorPath: "Transport",
    group: "Transport",
    confidence: "high",
    measureText: "Buy buses",
    description: "",
    source: "official",
    shiftFrom: "",
    shiftTo: "",
    need: "",
    shiftScore: 0,
    interventionWho: "",
    interventionWhat: "",
    interventionHow: "",
    interventionScore: 0,
    ...partial,
  };
}

function record(
  partial: Partial<ExploreMunicipalityRecord>,
): ExploreMunicipalityRecord {
  return {
    id: "x",
    name: "Test",
    regionName: null,
    measures: [],
    commitmentCount: 0,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: 0,
    climateCommitmentGroupCount: 2,
    adaptationCommitmentCount: 0,
    ownCommitmentCount: 0,
    companionReferenceCount: 0,
    markdownChars: null,
    tefHits: [],
    documentTitle: null,
    adoptedYear: null,
    sourceUrl: null,
    county: null,
    dataSources: ["pipeline-measures"],
    ...partial,
  };
}

describe("website v2 kpis", () => {
  it("counts pipeline measures as unique measures", () => {
    expect(
      uniqueMeasureCount(record({ measures: [measure("a"), measure("b")] })),
    ).toBe(2);
  });

  it("keeps only explicit official/proposed TEFs", () => {
    const hits = exactTefHits(
      record({
        measures: [measure("Buy buses")],
        tefHits: [
          hit({ stableId: "1", explicit: true, source: "official" }),
          hit({
            stableId: "2",
            explicit: true,
            source: "proposed",
            shortLabel: "STE-12 - New mobility hub",
          }),
          hit({ stableId: "3", explicit: false, source: "official" }),
          hit({
            stableId: "runtime-shadow:abc",
            explicit: true,
            source: "runtime-shadow",
          }),
        ],
      }),
    );
    expect(hits.map((h) => h.stableId).sort()).toEqual(["1", "2"]);
  });

  it("encodes focus match for the map", () => {
    expect(focusMatchMapValue("match")).toBe(1);
    expect(focusMatchMapValue("partial")).toBe(0.5);
    expect(focusMatchMapValue("miss")).toBe(0);
    expect(focusMatchMapValue("not-assessable")).toBeNull();
  });
});
