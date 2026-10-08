import { useCallback, useEffect, useState } from "react";
import { ApiAuthError } from "@/lib/garbo-auth-fetch";
import { fetchManualReviewSummary } from "../lib/manual-review-api";
import type { ManualReviewFlagKey } from "../lib/flag-catalog";
import type { ManualReviewSummaryResponse } from "../types";

export function useManualReviewSummary() {
  const [data, setData] = useState<ManualReviewSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    try {
      const next = await fetchManualReviewSummary();
      setData(next);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        setAuthRequired(true);
        setData(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load summary");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const adjustFlagCounts = useCallback(
    (
      flagKey: ManualReviewFlagKey,
      delta: { active: number; dismissed: number },
    ) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          flags: prev.flags.map((flag) => {
            if (flag.flagKey !== flagKey) return flag;
            return {
              ...flag,
              activeCount: Math.max(0, flag.activeCount + delta.active),
              dismissedCount: Math.max(
                0,
                flag.dismissedCount + delta.dismissed,
              ),
            };
          }),
        };
      });
    },
    [],
  );

  return { data, loading, error, authRequired, refresh, adjustFlagCounts };
}
