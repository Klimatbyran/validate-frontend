import { getGarboPipelineAutoRunUrl } from "@/config/api-env";
import { garboAuthFetch, throwIfAuthError } from "@/lib/garbo-auth-fetch";
import type { RunOnlyWorkerId } from "@/lib/run-only-workers";

export type PipelineAutoRunFilters = {
  reportTypeIds: string[];
  registryBatchIds: string[];
  coverageListIds: string[];
};

export type PipelineAutoRunOptions = {
  autoApprove: boolean;
  forceReindex: boolean;
  requireEmissionsPresence: boolean;
  runOnly?: string[];
  tags?: string[];
  /** Null clears a previously saved Jobbstatus batch. */
  batchId?: string | null;
};

export type PipelineAutoRunStatus = {
  enabled: boolean;
  maxConcurrent: number;
  filters: PipelineAutoRunFilters;
  runOptions: PipelineAutoRunOptions;
  consecutiveDoclingFailures: number;
  consecutiveReportFailures: number;
  pausedReason: string | null;
  disabledReason: string | null;
  lastTickAt: string | null;
  lastEnqueuedAt: string | null;
  lastError: string | null;
  updatedBy: string | null;
  updatedAt: string;
  activelyProcessing: number;
  parkedOnApproval: number;
  remainingEstimate: number | null;
  doclingReachable: boolean | null;
};

export type PipelineAutoRunPatch = {
  enabled?: boolean;
  maxConcurrent?: number;
  filters?: Partial<PipelineAutoRunFilters>;
  runOptions?: Partial<
    Omit<PipelineAutoRunOptions, "runOnly"> & {
      runOnly?: RunOnlyWorkerId[] | string[];
    }
  >;
  resetFailureCounters?: boolean;
};

async function parseStatus(
  response: Response,
  url: string,
): Promise<PipelineAutoRunStatus> {
  if (!response.ok) {
    throwIfAuthError(response.status);
    const body = await response.text().catch(() => "");
    throw new Error(
      `Pipeline auto-run request failed (${response.status})${
        body ? `: ${body.slice(0, 200)}` : ""
      } (${url})`,
    );
  }
  return (await response.json()) as PipelineAutoRunStatus;
}

export async function fetchPipelineAutoRunStatus(): Promise<PipelineAutoRunStatus> {
  const url = getGarboPipelineAutoRunUrl("");
  const response = await garboAuthFetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return parseStatus(response, url);
}

export async function patchPipelineAutoRun(
  patch: PipelineAutoRunPatch,
): Promise<PipelineAutoRunStatus> {
  const url = getGarboPipelineAutoRunUrl("");
  const response = await garboAuthFetch(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });
  return parseStatus(response, url);
}
