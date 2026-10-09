import { describe, expect, it } from "vitest";
import {
  isUniversalTab,
  pipelineModeForTab,
  resolveInitialPipelineMode,
} from "./pipeline-mode";

describe("pipelineModeForTab", () => {
  it("maps emissions tabs", () => {
    expect(pipelineModeForTab("jobbstatus")).toBe("emissions");
    expect(pipelineModeForTab("editor")).toBe("emissions");
    expect(pipelineModeForTab("errors")).toBe("emissions");
  });

  it("maps climate-plans tabs", () => {
    expect(pipelineModeForTab("climate-plans")).toBe("climate-plans");
    expect(pipelineModeForTab("climate-pipeline")).toBe("climate-plans");
    expect(pipelineModeForTab("climate-qa-reviews")).toBe("climate-plans");
  });

  it("returns null for universal tabs", () => {
    expect(pipelineModeForTab("upload")).toBeNull();
  });
});

describe("isUniversalTab", () => {
  it("recognizes universal tabs", () => {
    expect(isUniversalTab("upload")).toBe(true);
    expect(isUniversalTab("jobbstatus")).toBe(false);
  });
});

describe("resolveInitialPipelineMode", () => {
  it("prefers mode implied by the active tab", () => {
    expect(resolveInitialPipelineMode("climate-pipeline")).toBe(
      "climate-plans",
    );
    expect(resolveInitialPipelineMode("errors")).toBe("emissions");
  });

  it("falls back to emissions for universal tabs without storage", () => {
    expect(resolveInitialPipelineMode("upload")).toBe("emissions");
  });
});
