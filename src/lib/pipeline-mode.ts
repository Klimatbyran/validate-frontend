import type { TopLevelTabSegment } from "@/lib/top-level-routes";

export const PIPELINE_MODES = ["emissions", "climate-plans"] as const;

export type PipelineMode = (typeof PIPELINE_MODES)[number];

export const DEFAULT_PIPELINE_MODE: PipelineMode = "emissions";

export const PIPELINE_MODE_STORAGE_KEY = "validate.pipelineMode";

/** Always available regardless of pipeline mode. */
export const UNIVERSAL_TAB_SEGMENTS = [
  "crawler",
  "registry",
  "upload",
  "access",
] as const satisfies readonly TopLevelTabSegment[];

export type UniversalTabSegment = (typeof UNIVERSAL_TAB_SEGMENTS)[number];

/** Secondary tabs shown after a pipeline is selected. */
export const PIPELINE_TAB_SEGMENTS = {
  emissions: [
    "overview",
    "jobbstatus",
    "workflow",
    "debug",
    "errors",
    "editor",
  ],
  "climate-plans": ["climate-plans", "climate-pipeline", "climate-qa-reviews"],
} as const satisfies Record<PipelineMode, readonly TopLevelTabSegment[]>;

export const DEFAULT_TAB_FOR_PIPELINE_MODE = {
  emissions: "overview",
  "climate-plans": "climate-plans",
} as const satisfies Record<PipelineMode, TopLevelTabSegment>;

export function isPipelineMode(value: string): value is PipelineMode {
  return (PIPELINE_MODES as readonly string[]).includes(value);
}

export function isUniversalTab(tab: TopLevelTabSegment): boolean {
  return (UNIVERSAL_TAB_SEGMENTS as readonly string[]).includes(tab);
}

export function pipelineModeForTab(
  tab: TopLevelTabSegment,
): PipelineMode | null {
  if ((PIPELINE_TAB_SEGMENTS.emissions as readonly string[]).includes(tab)) {
    return "emissions";
  }
  if (
    (PIPELINE_TAB_SEGMENTS["climate-plans"] as readonly string[]).includes(tab)
  ) {
    return "climate-plans";
  }
  return null;
}

export function readStoredPipelineMode(): PipelineMode | null {
  try {
    const raw = localStorage.getItem(PIPELINE_MODE_STORAGE_KEY);
    return raw && isPipelineMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredPipelineMode(mode: PipelineMode): void {
  try {
    localStorage.setItem(PIPELINE_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore quota / private-mode failures; in-memory mode still works.
  }
}

export function resolveInitialPipelineMode(
  tab: TopLevelTabSegment,
): PipelineMode {
  return (
    pipelineModeForTab(tab) ?? readStoredPipelineMode() ?? DEFAULT_PIPELINE_MODE
  );
}
