import { afterEach, describe, expect, it, vi } from "vitest";
import { companiesReportingPeriodsUrl } from "./write-api";

describe("companiesReportingPeriodsUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("routes prod and stage to the fixed Unearth proxies", () => {
    expect(companiesReportingPeriodsUrl("prod", "c1")).toBe(
      "/unearth/api/companies/c1/reporting-periods",
    );
    expect(companiesReportingPeriodsUrl("stage", "c1")).toBe(
      "/unearth-stage/api/companies/c1/reporting-periods",
    );
  });

  it("uses the local proxy in dev and falls back to stage outside it", () => {
    vi.stubEnv("DEV", true);
    expect(companiesReportingPeriodsUrl("local", "c1")).toBe(
      "/unearth-local/api/companies/c1/reporting-periods",
    );

    vi.stubEnv("DEV", false);
    expect(companiesReportingPeriodsUrl("local", "c1")).toBe(
      "/unearth-stage-api/api/companies/c1/reporting-periods",
    );
  });

  it("encodes the company id", () => {
    expect(companiesReportingPeriodsUrl("prod", "a/b")).toContain(
      "/companies/a%2Fb/reporting-periods",
    );
  });
});
