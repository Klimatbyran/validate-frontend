import { useCallback, useEffect, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";

// One frozen row per ActivityShift as it stood at the moment a TEF
// matching snapshot was taken -- see climate-plans-pipeline's
// ActivityShiftMatchSnapshot / src/lib/snapshotTef.ts. Independent of the
// live row: survives any later rematch or full rerun.
export interface TefMatchSnapshot {
  id: string;
  snapshotRunId: string;
  snapshotLabel: string | null;
  snapshotTakenAt: string;
  activityShiftId: string;
  climatePlanId: string;
  measureText: string;
  activity: string;
  shiftFrom: string;
  shiftTo: string;
  need: string;
  type: string;
  transitionElementMatches: unknown;
  transitionElementCandidates: unknown;
  transitionElementSuggestedNew: unknown;
  transitionElementGateDomain: string | null;
  transitionElementGroupKind: string | null;
  transitionElementGroupLabel: string | null;
  aiReviewCategory: string | null;
  aiReviewExplanation: string | null;
  aiRecoveredMatch: unknown;
  shadowElementId: string | null;
  shadowElementShortLabel: string | null;
  shadowElementDescription: string | null;
  shadowElementStatus: string | null;
}

export function useTefMatchSnapshots(planId: string | null) {
  const [snapshots, setSnapshots] = useState<TefMatchSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    if (!planId) {
      setSnapshots([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await garboAuthFetch(
        `${getClimatePlansPipelineApiUrl()}/plans/${planId}/tef-match-snapshots`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setSnapshots((await res.json()) as TefMatchSnapshot[]);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load TEF match snapshots",
      );
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    void fetchSnapshots();
  }, [fetchSnapshots]);

  // Group by snapshotRunId so, if this plan was ever frozen more than
  // once, each freeze event is still distinguishable rather than shown as
  // one undifferentiated list.
  const byRun = new Map<string, TefMatchSnapshot[]>();
  for (const s of snapshots) {
    const list = byRun.get(s.snapshotRunId) ?? [];
    list.push(s);
    byRun.set(s.snapshotRunId, list);
  }

  return { snapshots, snapshotsByRun: byRun, isLoading, error, refresh: fetchSnapshots };
}
