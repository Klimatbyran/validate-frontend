import { describe, expect, it } from "vitest";
import {
  DEFAULT_TAB_FOR_PIPELINE_MODE,
  isUniversalTab,
  PIPELINE_TAB_SEGMENTS,
  pipelineModeForTab,
  resolveInitialPipelineMode,
  UNIVERSAL_TAB_SEGMENTS,
} from "./pipeline-mode";
import { DEFAULT_TOP_LEVEL_PATH } from "./top-level-routes";

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

describe("tab segment lists after Goffer migration slim", () => {
  it("keeps upload as the only universal tab and default path", () => {
    expect([...UNIVERSAL_TAB_SEGMENTS]).toEqual(["upload"]);
    expect(DEFAULT_TOP_LEVEL_PATH).toBe("/upload");
    expect(DEFAULT_TAB_FOR_PIPELINE_MODE.emissions).toBe("upload");
    expect(DEFAULT_TAB_FOR_PIPELINE_MODE["climate-plans"]).toBe(
      "climate-plans",
    );
  });

  it("keeps the reduced emissions secondary tabs", () => {
    expect([...PIPELINE_TAB_SEGMENTS.emissions]).toEqual([
      "jobbstatus",
      "workflow",
      "debug",
      "errors",
      "editor",
    ]);
  });

  it("keeps climate-plans secondary tabs", () => {
    expect([...PIPELINE_TAB_SEGMENTS["climate-plans"]]).toEqual([
      "climate-plans",
      "climate-pipeline",
      "climate-qa-reviews",
      "municipality-sources",
    ]);
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
