import { describe, expect, it } from "vitest";
import {
  VOLUME_AXIS_FULL_AT,
  buildStrengthTriangleModel,
  normalizeActionDetailStrength,
  normalizeActionsFoundStrength,
  normalizeBiggestSourceStrength,
  strengthPolygonPoints,
} from "./website-v2-strength-triangle";

describe("website v2 strength triangle", () => {
  it("normalizes each KPI onto 0–1 independently", () => {
    expect(normalizeActionDetailStrength(50)).toBeCloseTo(0.5);
    expect(normalizeActionDetailStrength(null)).toBeNull();
    expect(normalizeBiggestSourceStrength("match")).toBe(1);
    expect(normalizeBiggestSourceStrength("partial")).toBe(0.5);
    expect(normalizeBiggestSourceStrength("miss")).toBe(0);
    expect(normalizeBiggestSourceStrength("not-assessable")).toBeNull();
    expect(normalizeActionsFoundStrength(0)).toBe(0);
    expect(normalizeActionsFoundStrength(VOLUME_AXIS_FULL_AT)).toBe(1);
    expect(normalizeActionsFoundStrength(VOLUME_AXIS_FULL_AT * 2)).toBe(1);
    expect(normalizeActionsFoundStrength(10)).toBeCloseTo(0.5);
  });

  it("builds a model that never claims a single quality score", () => {
    const model = buildStrengthTriangleModel({
      concretenessScore: 80,
      focusVerdict: "partial",
      focusShortLabel: "Partly",
      uniqueMeasureCount: 10,
    });
    expect(model.axes).toHaveLength(3);
    expect(model.axes[0]?.strength).toBeCloseTo(0.8);
    expect(model.axes[1]?.strength).toBeCloseTo(0.5);
    expect(model.axes[2]?.strength).toBeCloseTo(0.5);
    expect(model.axes[2]?.volumeOnly).toBe(true);
    expect(model.hasAnyStrength).toBe(true);
  });

  it("emits a closed polygon even when one axis is unscored", () => {
    const points = strengthPolygonPoints([0.8, null, 0.25]);
    expect(points.split(" ")).toHaveLength(3);
    expect(points).toContain(",");
  });
});
