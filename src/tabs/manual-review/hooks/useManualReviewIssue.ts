import { useCallback, useEffect, useState } from "react";
import { ApiAuthError } from "@/lib/garbo-auth-fetch";
import {
  dismissManualReviewFlag,
  fetchManualReviewIssues,
  undoManualReviewDismissal,
} from "../lib/manual-review-api";
import type { ManualReviewFlagKey } from "../lib/flag-catalog";
import type { ManualReviewCompanyHit, ManualReviewIssuesResponse } from "../types";

export function useManualReviewIssue(options: {
  flagKey: ManualReviewFlagKey | null;
  q: string;
  includeDismissed: boolean;
}) {
  const { flagKey, q, includeDismissed } = options;
  const [data, setData] = useState<ManualReviewIssuesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!flagKey) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    try {
      const next = await fetchManualReviewIssues({
        flagKey,
        q,
        includeDismissed,
        offset: 0,
        limit: 100,
      });
      setData(next);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        setAuthRequired(true);
        setData(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load issues");
      }
    } finally {
      setLoading(false);
    }
  }, [flagKey, q, includeDismissed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dismiss = useCallback(
    async (hit: ManualReviewCompanyHit) => {
      if (!flagKey) return;
      setActionBusyId(hit.companyId);
      try {
        await dismissManualReviewFlag({
          companyId: hit.companyId,
          flagKey,
          evidenceFingerprint: hit.evidenceFingerprint,
        });
        await refresh();
      } catch (err) {
        if (err instanceof ApiAuthError) setAuthRequired(true);
        else setError(err instanceof Error ? err.message : "Dismiss failed");
      } finally {
        setActionBusyId(null);
      }
    },
    [flagKey, refresh],
  );

  const undo = useCallback(
    async (hit: ManualReviewCompanyHit) => {
      if (!hit.dismissalId) return;
      setActionBusyId(hit.companyId);
      try {
        await undoManualReviewDismissal(hit.dismissalId);
        await refresh();
      } catch (err) {
        if (err instanceof ApiAuthError) setAuthRequired(true);
        else setError(err instanceof Error ? err.message : "Undo failed");
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
    dismiss,
    undo,
  };
}
