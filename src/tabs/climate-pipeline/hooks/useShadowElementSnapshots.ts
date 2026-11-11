import { useCallback, useEffect, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { ShadowElementStatus, ShadowElementQuality } from "./useShadowElements";

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
