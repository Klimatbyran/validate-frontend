/**
 * Shared pipeline worker definitions for runOnly (upload) and rerun-by-worker (jobstatus).
 * Keys must match the strings sent in the runOnly array / rerun-and-save scopes to the pipeline API.
 * See: Summary for the FE (when not run all) – do not use 'scope1+2'.
 */

export const RUN_ONLY_WORKER_IDS = [
  "industryGics",
  "scope1",
  "scope2",
  "scope3",
  "biogenic",
  "economy",
  "goals",
  "initiatives",
  "baseYear",
  "lei",
  "descriptions",
] as const;

export type RunOnlyWorkerId = (typeof RUN_ONLY_WORKER_IDS)[number];

export interface RunOnlyWorker {
  id: RunOnlyWorkerId;
  label: string;
}

export const RUN_ONLY_WORKERS: RunOnlyWorker[] = [
  { id: "industryGics", label: "Industry GICS" },
  { id: "scope1", label: "Scope 1" },
  { id: "scope2", label: "Scope 2" },
  { id: "scope3", label: "Scope 3" },
  { id: "biogenic", label: "Biogenic" },
  { id: "economy", label: "Economy" },
  { id: "goals", label: "Goals" },
  { id: "initiatives", label: "Initiatives" },
  { id: "baseYear", label: "Base year" },
  { id: "lei", label: "LEI" },
  { id: "descriptions", label: "Descriptions" },
];

/** Scope key for API is the worker id. Used by jobstatus rerun-and-save. */
export const RUN_ONLY_TO_SCOPE_KEY: Record<RunOnlyWorkerId, string> =
  Object.fromEntries(RUN_ONLY_WORKER_IDS.map((id) => [id, id])) as Record<
    RunOnlyWorkerId,
    string
  >;

/** Default runOnly selection for upload (scope 1–3). */
export const DEFAULT_RUN_ONLY: RunOnlyWorkerId[] = [
  "scope1",
  "scope2",
  "scope3",
];
