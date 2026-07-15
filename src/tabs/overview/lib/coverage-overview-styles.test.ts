import { describe, expect, it } from "vitest";

import {
  coveragePercentCardClass,
  coveragePercentTextClass,
  coveragePercentTone,
} from "./coverage-overview-styles";

describe("coverage-overview-styles", () => {
  it("classifies coverage percent into tone bands", () => {
    expect(coveragePercentTone(95)).toBe("high");
    expect(coveragePercentTone(80)).toBe("high");
    expect(coveragePercentTone(65)).toBe("medium");
    expect(coveragePercentTone(50)).toBe("medium");
    expect(coveragePercentTone(12)).toBe("low");
  });

  it("maps tone to text and card classes", () => {
    expect(coveragePercentTextClass(90)).toContain("green");
    expect(coveragePercentTextClass(60)).toContain("yellow");
    expect(coveragePercentTextClass(10)).toContain("orange");
    expect(coveragePercentCardClass(90)).toContain("green");
  });
});
