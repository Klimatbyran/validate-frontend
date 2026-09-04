import { describe, expect, it } from "vitest";
import {
  availablePipelineCompaniesSources,
  getPipelineCompaniesListUrlForTarget,
  getProdPipelineCompaniesListUrl,
  getStagePipelineCompaniesListUrl,
} from "./api-env";

// Vitest runs with import.meta.env.DEV set, so these cover the dev proxy paths.
describe("getPipelineCompaniesListUrlForTarget", () => {
  it("routes each target to a distinct upstream", () => {
    const urls = (["local", "stage", "prod"] as const).map(
      getPipelineCompaniesListUrlForTarget,
    );

    expect(new Set(urls).size).toBe(3);
  });

  it("sends local through the dev proxy for a locally running Unearth API", () => {
    expect(getPipelineCompaniesListUrlForTarget("local")).toBe(
      "/unearth-local/api/internal-pipeline/companies",
    );
  });

  it("reuses the existing fixed stage and prod list URLs", () => {
    expect(getPipelineCompaniesListUrlForTarget("stage")).toBe(
      getStagePipelineCompaniesListUrl(),
    );
    expect(getPipelineCompaniesListUrlForTarget("prod")).toBe(
      getProdPipelineCompaniesListUrl(),
    );
  });
});

describe("availablePipelineCompaniesSources", () => {
  it("offers local only where the dev proxy exists", () => {
    expect(availablePipelineCompaniesSources()).toEqual([
      "local",
      "stage",
      "prod",
    ]);
  });
});
