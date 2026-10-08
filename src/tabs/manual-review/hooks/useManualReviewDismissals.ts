import { useCallback, useEffect, useState } from "react";
import { ApiAuthError } from "@/lib/garbo-auth-fetch";
import {
  fetchManualReviewDismissals,
  undoManualReviewDismissal,
} from "../lib/manual-review-api";
import type { ManualReviewFlagKey } from "../lib/flag-catalog";
import type {
  ManualReviewDismissal,
  ManualReviewDismissalsResponse,
} from "../types";

export function useManualReviewDismissals(options: {
  enabled: boolean;
  q: string;
  flagKey: ManualReviewFlagKey | "all";
}) {
  const { enabled, q, flagKey } = options;
  const [data, setData] = useState<ManualReviewDismissalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    try {
      const next = await fetchManualReviewDismissals({
        q,
        flagKey: flagKey === "all" ? undefined : flagKey,
        offset: 0,
        limit: 100,
      });
      setData(next);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        setAuthRequired(true);
        setData(null);
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to load dismissals",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, q, flagKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const undo = useCallback(
    async (dismissal: ManualReviewDismissal) => {
      setActionBusyId(dismissal.id);
      try {
        await undoManualReviewDismissal(dismissal.id);
        await refresh();
      } catch (err) {
        if (err instanceof ApiAuthError) setAuthRequired(true);
        else setError(err instanceof Error ? err.message : "Undo failed");
        throw err;
      } finally {
        setActionBusyId(null);
      }
    },
    [refresh],
  );

  return {
    data,
    loading,
    error,
    authRequired,
    actionBusyId,
    refresh,
    undo,
  };
}
