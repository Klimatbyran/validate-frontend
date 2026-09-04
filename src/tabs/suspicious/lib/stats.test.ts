import { describe, expect, it } from "vitest";
import {
  median,
  medianAbsoluteDeviation,
  powerOfTenFactor,
  ratioFactor,
  relativeDifference,
  robustZScore,
  safeLog10,
} from "./stats";

describe("median", () => {
  it("averages the middle pair for even-length input", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([3, 1, 2])).toBe(2);
  });

  it("returns null for an empty sample", () => {
    expect(median([])).toBeNull();
  });
});

describe("robustZScore", () => {
  it("returns null when the sample is degenerate", () => {
    const values = [5, 5, 5, 5];
    const center = median(values)!;
    expect(medianAbsoluteDeviation(values, center)).toBe(0);
    expect(robustZScore(500, center, 0)).toBeNull();
  });

  it("grows with distance from the centre", () => {
    const values = [1, 2, 3, 4, 5];
    const center = median(values)!;
    const mad = medianAbsoluteDeviation(values, center);
    const near = robustZScore(4, center, mad)!;
    const far = robustZScore(40, center, mad)!;
    expect(Math.abs(far)).toBeGreaterThan(Math.abs(near));
  });
});

describe("safeLog10", () => {
  it("rejects zero and negative values", () => {
    expect(safeLog10(0)).toBeNull();
    expect(safeLog10(-10)).toBeNull();
    expect(safeLog10(100)).toBe(2);
  });
});

describe("ratioFactor", () => {
  it("is direction-independent and always at least 1", () => {
    expect(ratioFactor(1000, 1)).toBe(1000);
    expect(ratioFactor(1, 1000)).toBe(1000);
    expect(ratioFactor(5, 5)).toBe(1);
  });

  it("returns null when either side is not positive", () => {
    expect(ratioFactor(0, 5)).toBeNull();
    expect(ratioFactor(-5, 5)).toBeNull();
  });
});

describe("powerOfTenFactor", () => {
  it("snaps near-power-of-ten factors within tolerance", () => {
    expect(powerOfTenFactor(1000, 0.05)).toBe(1000);
    expect(powerOfTenFactor(1020, 0.05)).toBe(1000);
    expect(powerOfTenFactor(0.001, 0.05)).toBeCloseTo(0.001);
  });

  it("rejects factors that are not close to a power of ten", () => {
    expect(powerOfTenFactor(1500, 0.05)).toBeNull();
    expect(powerOfTenFactor(1.2, 0.05)).toBeNull();
  });
});

describe("relativeDifference", () => {
  it("scales by the larger magnitude", () => {
    expect(relativeDifference(100, 110)).toBeCloseTo(10 / 110);
    expect(relativeDifference(0, 0)).toBe(0);
  });
});
