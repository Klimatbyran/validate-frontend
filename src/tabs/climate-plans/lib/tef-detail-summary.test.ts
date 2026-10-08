import { describe, expect, it } from "vitest";
import {
  hitMatchesEvidenceFilter,
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
        hit({ confidence: "high" }),
        hit({
          confidence: "mid",
          interventionWho: "none",
          interventionWhat: "none",
          interventionHow: "none",
          shiftScore: 2,
          interventionScore: 2,
        }),
      ],
      2,
    );
    expect(summary.whoFilled).toBe(1);
    expect(summary.whatFilled).toBe(1);
    expect(summary.howFilled).toBe(0);
    expect(summary.confidence.high).toBe(1);
    expect(summary.confidence.mid).toBe(1);
    expect(summary.avgShiftScore).toBeCloseTo(3);
    expect(summary.avgInterventionScore).toBeCloseTo(4);
    // (4) / (3+4) ≈ 0.57 — slightly intervention-leaning
    expect(summary.interventionLean).toBeCloseTo(4 / 7);
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
