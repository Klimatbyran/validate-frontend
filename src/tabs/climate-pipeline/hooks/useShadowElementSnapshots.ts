import { useCallback, useEffect, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { ShadowElementStatus, ShadowElementQuality } from "./useShadowElements";

export interface TefFreezeStatus {
  exists: boolean;
  snapshotRunId: string | null;
  snapshotLabel: string | null;
  snapshotTakenAt: string | null;
  activityShiftCount: number;
  shadowElementCount: number;
}

// One frozen row per ShadowTransitionElement as it stood at the moment a
// snapshot was taken -- see climate-plans-pipeline's
// ShadowTransitionElementSnapshot / src/lib/snapshotTef.ts. Independent of
// the live row: survives any later promote/reject/merge/delete.
export interface ShadowElementSnapshot {
  id: string;
  snapshotRunId: string;
  snapshotLabel: string | null;
  snapshotTakenAt: string;
  originalId: string;
  shortLabel: string;
  description: string;
  activityShiftCategory: string;
  sectorPath: string | null;
  status: ShadowElementStatus;
  qualityGrade: ShadowElementQuality;
  comment: string | null;
  sourceShiftId: string | null;
  originClimatePlanId: string | null;
  mergedIntoId: string | null;
}

export function useShadowElementSnapshots() {
  const [snapshots, setSnapshots] = useState<ShadowElementSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await garboAuthFetch(
        `${getClimatePlansPipelineApiUrl()}/shadow-element-snapshots`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setSnapshots((await res.json()) as ShadowElementSnapshot[]);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load shadow taxonomy snapshots",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSnapshots();
  }, [fetchSnapshots]);

  const byRun = new Map<string, ShadowElementSnapshot[]>();
  for (const s of snapshots) {
    const list = byRun.get(s.snapshotRunId) ?? [];
    list.push(s);
    byRun.set(s.snapshotRunId, list);
  }

  return { snapshots, snapshotsByRun: byRun, isLoading, error, refresh: fetchSnapshots };
}

export function useTefFreezeStatus() {
  const [status, setStatus] = useState<TefFreezeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await garboAuthFetch(
        `${getClimatePlansPipelineApiUrl()}/snapshots/tef-freeze/status`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setStatus((await res.json()) as TefFreezeStatus);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load snapshot status",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return { status, isLoading, error, refresh: fetchStatus };
}

export async function createTefFreeze(
  label?: string,
): Promise<{ snapshotRunId: string; activityShiftCount: number; shadowElementCount: number }> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/snapshots/tef-freeze`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteTefFreeze(): Promise<void> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/snapshots/tef-freeze`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}
