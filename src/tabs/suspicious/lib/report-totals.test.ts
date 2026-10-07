import { describe, expect, it } from "vitest";
import { makePeriod } from "./test-fixtures";
import {
  isPeriodTotalTrustworthy,
  periodTotalEmissions,
} from "./report-totals";

describe("periodTotalEmissions", () => {
  it("never returns a total smaller than the parts it should contain", () => {
    const period = makePeriod({
      dataYear: 2024,
      scope1: 5_000,
      scope2mb: 1_000,
      scope3StatedTotal: 4_000,
      statedTotal: 100,
    });

    expect(periodTotalEmissions(period.emissions)).toBe(10_000);
  });

  it("falls back to the sum of scopes when no total is stated", () => {
    const period = makePeriod({
      dataYear: 2024,
      scope1: 200,
      scope2mb: 300,
    });

    expect(periodTotalEmissions(period.emissions)).toBe(500);
  });

  it("returns null when there is nothing to add up", () => {
    const period = makePeriod({ dataYear: 2024 });
    expect(periodTotalEmissions(period.emissions)).toBeNull();
  });
});

describe("isPeriodTotalTrustworthy", () => {
  it("accepts a report whose parts and totals agree", () => {
    const period = makePeriod({
      dataYear: 2024,
      scope1: 100,
      scope2mb: 100,
      scope3StatedTotal: 800,
      statedTotal: 1_000,
      categories: { 1: 600, 2: 200 },
    });

    expect(isPeriodTotalTrustworthy(period.emissions)).toBe(true);
  });

  it("rejects a report whose scope 3 categories miss its scope 3 total", () => {
    const period = makePeriod({
      dataYear: 2024,
      scope3StatedTotal: 800,
      categories: { 1: 100, 2: 100 },
    });

    expect(isPeriodTotalTrustworthy(period.emissions)).toBe(false);
  });

  it("rejects a report whose scopes miss its stated total", () => {
    const period = makePeriod({
      dataYear: 2024,
      scope1: 100,
      scope2mb: 100,
      scope3StatedTotal: 800,
      statedTotal: 50_000,
      categories: { 1: 600, 2: 200 },
    });

    expect(isPeriodTotalTrustworthy(period.emissions)).toBe(false);
  });

  it("does not penalise a report that simply omits a total", () => {
    const period = makePeriod({ dataYear: 2024, scope1: 100, scope2mb: 50 });
    expect(isPeriodTotalTrustworthy(period.emissions)).toBe(true);
  });
});
