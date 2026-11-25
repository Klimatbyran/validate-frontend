import { useCallback, useEffect, useRef, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";

// Shadow-taxonomy rebuild -- see climate-plans-pipeline's
// src/lib/shadowRebuild.ts. Snapshot -> delete every shadow element ->
// rematch the commitments that were on one; the rematch report compares
// the result with that snapshot.

export type RematchOutcome =
  | "real_tef"
  | "recovered"
  | "shadow"
  | "no_match"
  | "pending"
  | "gone";

export interface RebuildPreview {
  shadowElements: {
    total: number;
    preliminary: number;
    promoted: number;
    rejected: number;
    merged: number;
    withComment: number;
  };
  attachedShifts: number;
  reattachedShifts: number;
  notACommitmentShifts: number;
  planCount: number;
}

export type RebuildStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  // The snapshot the run started from was restored afterwards.
  | "reverted";

export interface RebuildRun {
  id: string;
  snapshotRunId: string;
  status: RebuildStatus;
  includeReattached: boolean;
  totalShifts: number;
  doneShifts: number;
  outcomeCounts: Partial<Record<RematchOutcome, number>>;
  deletedShadowCount: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface RematchReportShift {
  shiftId: string;
  climatePlanId: string;
  municipalityName: string | null;
  measureText: string;
  activity: string;
  shiftFrom: string;
  shiftTo: string;
  before: {
    kind: "shadow" | "reattached";
    shadowElementId: string | null;
    shadowLabel: string | null;
    reattachedToLabel: string | null;
  };
  after: {
    outcome: RematchOutcome;
    realLabels: string[];
    recoveredLabel: string | null;
    shadowElementId: string | null;
    shadowLabel: string | null;
    aiReviewCategory: string | null;
    aiReviewExplanation: string | null;
  };
}

export interface RematchReportOldElement {
  originalId: string;
  shortLabel: string;
  description: string;
  status: string;
  qualityGrade: string;
  comment: string | null;
  counts: Record<RematchOutcome, number>;
  shifts: RematchReportShift[];
}

export interface RematchReportNewElement {
  id: string;
  shortLabel: string;
  description: string;
  qualityGrade: string;
  status: string;
  shiftCount: number;
  fromOldElements: {
    originalId: string | null;
    shortLabel: string;
    count: number;
  }[];
}

export interface RematchReport {
  snapshotRunId: string;
  snapshotLabel: string | null;
  snapshotTakenAt: string | null;
  run: {
    id: string;
    status: RebuildStatus;
    totalShifts: number;
    doneShifts: number;
    deletedShadowCount: number;
    startedAt: string | null;
    finishedAt: string | null;
  } | null;
  summary: {
    total: number;
    byOutcome: Record<RematchOutcome, number>;
    shadowElementsBefore: number;
    shadowElementsAfter: number;
  };
  oldElements: RematchReportOldElement[];
  reattachedBefore: RematchReportShift[];
  newElements: RematchReportNewElement[];
}

const base = () => `${getClimatePlansPipelineApiUrl()}/shadow-elements/rebuild`;

async function errorFrom(res: Response): Promise<Error> {
  const body = await res.json().catch(() => null);
  return new Error(body?.error ?? `${res.status} ${res.statusText}`);
}

export async function fetchRebuildPreview(): Promise<RebuildPreview> {
  const res = await garboAuthFetch(`${base()}/preview`);
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function startRebuild(input: {
  label?: string;
  includeReattached: boolean;
}): Promise<RebuildRun> {
  const res = await authenticatedFetch(base(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function resumeRebuild(runId: string): Promise<RebuildRun> {
  const res = await authenticatedFetch(
    `${base()}/runs/${encodeURIComponent(runId)}/resume`,
    { method: "POST" },
  );
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

const isActive = (run: RebuildRun | null | undefined) =>
  run?.status === "queued" || run?.status === "running";

/** Latest rebuild run; polls every few seconds while one is active.
 * onFinished fires once when an active run turns completed/failed, so the
 * caller can refresh the element list and snapshot views. */
export function useLatestRebuildRun(onFinished?: (run: RebuildRun) => void) {
  const [run, setRun] = useState<RebuildRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const wasActive = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const fetchRun = useCallback(async () => {
    try {
      const res = await garboAuthFetch(`${base()}/runs?limit=1`);
      if (!res.ok) return;
      const [latest] = (await res.json()) as RebuildRun[];
      setRun(latest ?? null);
      if (wasActive.current && latest && !isActive(latest)) {
        onFinishedRef.current?.(latest);
      }
      wasActive.current = isActive(latest);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRun();
  }, [fetchRun]);

  const active = isActive(run);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void fetchRun(), 4000);
    return () => window.clearInterval(timer);
  }, [active, fetchRun]);

  return { run, isActive: active, isLoading, refresh: fetchRun };
}

export function useRematchReport(
  snapshotRunId: string | null,
  refreshToken?: number,
) {
  const [report, setReport] = useState<RematchReport | null>(null);
  const [isLoading, setIsLoading] = useState(!!snapshotRunId);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!snapshotRunId) {
      setReport(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await garboAuthFetch(
        `${getClimatePlansPipelineApiUrl()}/snapshots/${encodeURIComponent(snapshotRunId)}/rematch-report`,
      );
      if (!res.ok) throw await errorFrom(res);
      setReport((await res.json()) as RematchReport);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load rematch report",
      );
    } finally {
      setIsLoading(false);
    }
  }, [snapshotRunId]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport, refreshToken]);

  return { report, isLoading, error, refresh: fetchReport };
}
