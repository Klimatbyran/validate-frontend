import { describe, expect, it } from "vitest";
import {
  hitMatchesEvidenceFilter,
  hitMatchesImpliedFilter,
  summarizeTefHits,
} from "./tef-detail-summary";
import type { TefHit } from "./explore-types";

function hit(partial: Partial<TefHit>): TefHit {
  return {
    stableId: "tef-1",
    shortLabel: "T-1 - Rail",
    sectorPath: "Transport",
    group: "Transport",
    confidence: "high",
    measureText: "measure",
    description: "",
    shiftFrom: "car",
    shiftTo: "train",
    need: "mobility",
    shiftScore: 4,
    interventionWho: "municipality",
    interventionWhat: "bus",
    interventionHow: "none",
    interventionScore: 6,
    ...partial,
  };
}

describe("summarizeTefHits", () => {
  it("counts who/what/how fill and leans toward intervention when scores differ", () => {
    const summary = summarizeTefHits(
      [
        hit({ confidence: "high", explicit: true }),
        hit({
          confidence: "mid",
          interventionWho: "none",
          interventionWhat: "none",
          interventionHow: "none",
          shiftScore: 2,
          interventionScore: 2,
          explicit: false,
        }),
        hit({ confidence: "low" }),
      ],
      2,
    );
    expect(summary.whoFilled).toBe(2);
    expect(summary.whatFilled).toBe(2);
    expect(summary.howFilled).toBe(0);
    expect(summary.confidence.high).toBe(1);
    expect(summary.confidence.mid).toBe(1);
    expect(summary.avgShiftScore).toBeCloseTo(10 / 3);
    expect(summary.avgInterventionScore).toBeCloseTo(14 / 3);
    expect(summary.explicitCount).toBe(1);
    expect(summary.impliedCount).toBe(1);
    expect(summary.unknownExplicitCount).toBe(1);
  });
});

describe("hitMatchesEvidenceFilter", () => {
  it("filters by filled intervention fields and confidence", () => {
    const filled = hit({});
    const empty = hit({
      interventionWho: "none",
      interventionWhat: "none",
      interventionHow: "none",
      confidence: "low",
    });
    expect(hitMatchesEvidenceFilter(filled, "who")).toBe(true);
    expect(hitMatchesEvidenceFilter(empty, "who")).toBe(false);
    expect(hitMatchesEvidenceFilter(empty, "low")).toBe(true);
    expect(hitMatchesEvidenceFilter(filled, null)).toBe(true);
  });
});

describe("hitMatchesImpliedFilter", () => {
  it("keeps all, only implied, or everything not known-implied", () => {
    const explicit = hit({ explicit: true });
    const implied = hit({ explicit: false });
    const unknown = hit({});
    expect(hitMatchesImpliedFilter(explicit, "all")).toBe(true);
    expect(hitMatchesImpliedFilter(implied, "all")).toBe(true);
    expect(hitMatchesImpliedFilter(unknown, "all")).toBe(true);

    expect(hitMatchesImpliedFilter(explicit, "implied")).toBe(false);
    expect(hitMatchesImpliedFilter(implied, "implied")).toBe(true);
    expect(hitMatchesImpliedFilter(unknown, "implied")).toBe(false);

    expect(hitMatchesImpliedFilter(explicit, "exclude-implied")).toBe(true);
    expect(hitMatchesImpliedFilter(implied, "exclude-implied")).toBe(false);
    expect(hitMatchesImpliedFilter(unknown, "exclude-implied")).toBe(true);
  });
});
