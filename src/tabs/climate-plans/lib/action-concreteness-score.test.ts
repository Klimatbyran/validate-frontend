import { describe, expect, it } from "vitest";
import {
  computeActionConcreteness,
  IMPLIED_ONLY_BROADNESS_FACTOR,
  scoreMeasureConcreteness,
  SLOT_WEIGHTS,
} from "./action-concreteness-score";
import type { ExploreMunicipalityRecord, TefHit } from "./explore-types";
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

function hit(
  partial: Partial<TefHit> & Pick<TefHit, "measureText" | "explicit">,
): TefHit {
  return {
    stableId: "a",
    shortLabel: "T-1A1b-TE-1 - Electric buses",
    sectorPath: "Transport > Mobility",
    group: "Transport",
    confidence: "high",
    description: "",
    source: "official",
    shiftFrom: "diesel",
    shiftTo: "ev",
    need: "mobility",
    shiftScore: 5,
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

describe("action concreteness score", () => {
  it("returns null score when there are no measures (blank, not zero)", () => {
    const result = computeActionConcreteness(record({ measures: [] }));
    expect(result.score).toBeNull();
    expect(result.band).toBe("unscored");
  });

  it("zeros a measure with no what even if other slots are filled", () => {
    const m = measure({
      measure_text: "Emissions down by 2030",
      intervention_who: "municipality",
      intervention_when: "2030",
      intervention_what: "none",
      intervention_how: "none",
    });
    const scored = scoreMeasureConcreteness(m, []);
    expect(scored.score).toBe(0);
    expect(scored.what).toBe(0);
  });

  it("scores full slots at 100 without TEF judgment", () => {
    const m = measure({
      measure_text: "Buy electric buses",
      intervention_who: "Tekniska förvaltningen",
      intervention_what: "fleet replacement",
      intervention_when: "2027",
      intervention_how: "procurement",
    });
    const scored = scoreMeasureConcreteness(m, []);
    expect(scored.score).toBe(100);
    expect(scored.wording).toBe("no-tef");
  });

  it("keeps primary score at full slots; trims only experimental combined", () => {
    const m = measure({
      measure_text: "Promote sustainable travel",
      intervention_who: "municipality",
      intervention_what: "campaign",
      intervention_when: "2026",
      intervention_how: "information",
    });
    const scored = scoreMeasureConcreteness(m, [
      hit({ measureText: "Promote sustainable travel", explicit: false }),
    ]);
    expect(scored.wording).toBe("implied-only");
    expect(scored.score).toBe(100);
    expect(scored.combinedScore).toBeCloseTo(
      100 * IMPLIED_ONLY_BROADNESS_FACTOR,
    );
  });

  it("treats any explicit hit as explicit (not implied-only)", () => {
    const m = measure({
      measure_text: "Buy electric buses",
      intervention_who: "municipality",
      intervention_what: "fleet",
      intervention_when: "2027",
      intervention_how: "procurement",
    });
    const scored = scoreMeasureConcreteness(m, [
      hit({ measureText: "Buy electric buses", explicit: false }),
      hit({
        measureText: "Buy electric buses",
        explicit: true,
        stableId: "b",
      }),
    ]);
    expect(scored.wording).toBe("explicit");
    expect(scored.score).toBe(100);
    expect(scored.combinedScore).toBe(100);
  });

  it("averages unique measures and reports slot weights plus siblings", () => {
    const full = measure({
      measure_text: "Buy electric buses",
      intervention_who: "municipality",
      intervention_what: "fleet",
      intervention_when: "2027",
      intervention_how: "procurement",
    });
    const whatOnly = measure({
      measure_text: "Promote cycling",
      intervention_what: "campaign",
    });
    const result = computeActionConcreteness(
      record({
        measures: [full, whatOnly],
        tefHits: [
          hit({ measureText: "Buy electric buses", explicit: true }),
          hit({ measureText: "Promote cycling", explicit: false }),
        ],
      }),
    );
    // full = 100; what-only = 35
    expect(result.score).toBeCloseTo((100 + SLOT_WEIGHTS.what * 100) / 2);
    expect(result.combinedScore).toBeCloseTo(
      (100 + SLOT_WEIGHTS.what * 100 * IMPLIED_ONLY_BROADNESS_FACTOR) / 2,
    );
    expect(result.directWordingShare).toBeCloseTo(0.5);
    expect(result.fullSpecShare).toBeCloseTo(0.5);
    expect(result.measureCount).toBe(2);
    expect(result.whatRate).toBe(1);
    expect(result.whoRate).toBe(0.5);
  });

  it("marks provisional when TEF label coverage is thin", () => {
    const measures = ["a", "b", "c"].map((text) =>
      measure({
        measure_text: text,
        intervention_what: "x",
        intervention_who: "y",
        intervention_when: "z",
        intervention_how: "w",
      }),
    );
    const unlabeled = (text: string): TefHit => {
      const base = hit({ measureText: text, explicit: true });
      const { explicit, ...rest } = base;
      void explicit;
      return rest;
    };
    const result = computeActionConcreteness(
      record({
        measures,
        tefHits: [
          hit({ measureText: "a", explicit: true }),
          unlabeled("b"),
          unlabeled("c"),
        ],
      }),
    );
    expect(result.judgedCoverageShare).toBeCloseTo(1 / 3);
    expect(result.provisional).toBe(true);
  });
});
