import { describe, expect, it } from "vitest";
import {
  groupTefHitsByMeasure,
  measureWeightedStrength,
  uniqueTefMeasureCount,
} from "./tef-measure-groups";
import type { TefHitLike } from "./tef-measure-groups";

function hit(
  partial: Partial<TefHitLike> & Pick<TefHitLike, "measureText">,
): TefHitLike {
  return {
    shiftFrom: "car",
    shiftTo: "train",
    need: "mobility",
    shiftScore: 4,
    confidence: "high",
    interventionWho: "municipality",
    interventionWhat: "bus",
    interventionHow: "procurement",
    interventionScore: 5,
    municipalityId: "n",
    municipalityName: "Nässjö",
    ...partial,
  };
}

describe("groupTefHitsByMeasure", () => {
  it("collapses multiple activity shifts for the same measure + place", () => {
    const groups = groupTefHitsByMeasure([
      hit({
        measureText: "Favor walking and cycling",
        shiftTo: "walking",
        confidence: "high",
        explicit: true,
      }),
      hit({
        measureText: "Favor walking and cycling",
        shiftTo: "cycling",
        confidence: "mid",
        explicit: true,
        shiftScore: 6,
      }),
      hit({
        measureText: "Other action",
        municipalityId: "n",
        shiftTo: "bus",
      }),
    ]);
    expect(groups).toHaveLength(2);
    const favor = groups.find(
      (g) => g.measureText === "Favor walking and cycling",
    );
    expect(favor?.hits).toHaveLength(2);
    expect(favor?.confidence).toBe("high");
    expect(favor?.avgShiftScore).toBeCloseTo(5);
    expect(uniqueTefMeasureCount(favor!.hits.concat(groups[1]!.hits))).toBe(2);
  });

  it("keeps the same measure text in different places separate", () => {
    const groups = groupTefHitsByMeasure([
      hit({
        measureText: "Same text",
        municipalityId: "a",
        municipalityName: "A",
      }),
      hit({
        measureText: "Same text",
        municipalityId: "b",
        municipalityName: "B",
      }),
    ]);
    expect(groups).toHaveLength(2);
    expect(measureWeightedStrength(groups.flatMap((g) => g.hits))).toBe(1);
  });
});
