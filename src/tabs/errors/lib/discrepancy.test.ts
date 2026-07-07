import { describe, expect, it } from "vitest";
import {
  classifyDiscrepancy,
  classifySlotDiscrepancy,
  isExtractionComparisonDiscrepancy,
  isPipelineExtractionDiscrepancy,
} from "./discrepancy";

describe("classifySlotDiscrepancy", () => {
  it("returns report-absent when prod has the shell but stage does not", () => {
    expect(classifySlotDiscrepancy(100, null, false, true, 0.5)).toBe(
      "report-absent",
    );
    expect(classifySlotDiscrepancy(null, 500, false, true, 0.5)).toBe(
      "report-absent",
    );
  });

  it("returns report-extra when stage has the shell but prod does not", () => {
    expect(classifySlotDiscrepancy(null, 500, true, false, 0.5)).toBe(
      "report-extra",
    );
  });

  it("returns missing only when both shells exist and prod has the value", () => {
    expect(classifySlotDiscrepancy(null, 500, true, true, 0.5)).toBe("missing");
    expect(classifyDiscrepancy(null, 500, 0.5)).toBe("missing");
  });

  it("keeps value comparisons when both shells exist", () => {
    expect(classifySlotDiscrepancy(100, 100, true, true, 0.5)).toBe(
      "identical",
    );
    expect(classifySlotDiscrepancy(100, 200, true, true, 0.5)).toBe("error");
  });
});

describe("discrepancy helpers", () => {
  it("treats report coverage gaps separately from extraction comparisons", () => {
    expect(isExtractionComparisonDiscrepancy("missing")).toBe(true);
    expect(isExtractionComparisonDiscrepancy("report-absent")).toBe(false);
    expect(isPipelineExtractionDiscrepancy("report-absent")).toBe(false);
    expect(isPipelineExtractionDiscrepancy("missing")).toBe(true);
  });
});
