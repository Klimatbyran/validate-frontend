import { useCallback, useEffect, useState } from "react";
import { ApiAuthError } from "@/lib/garbo-auth-fetch";
import {
  dismissManualReviewFlag,
  fetchManualReviewIssues,
  undoManualReviewDismissal,
} from "../lib/manual-review-api";
import type { ManualReviewFlagKey } from "../lib/flag-catalog";
import type {
  ManualReviewCompanyHit,
  ManualReviewDismissal,
  ManualReviewIssuesResponse,
} from "../types";

const PAGE_SIZE = 100;

function hitBusyKey(hit: ManualReviewCompanyHit): string {
  return `${hit.companyId}:${hit.evidenceFingerprint}`;
}

export function useManualReviewIssue(options: {
  flagKey: ManualReviewFlagKey | null;
  q: string;
  includeDismissed: boolean;
}) {
  const { flagKey, q, includeDismissed } = options;
  const [data, setData] = useState<ManualReviewIssuesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
        limit: PAGE_SIZE,
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

  const loadMore = useCallback(async () => {
    if (!flagKey || !data) return;
    if (data.companies.length >= data.totalMatching) return;
    setLoadingMore(true);
    setError(null);
    try {
      const next = await fetchManualReviewIssues({
        flagKey,
        q,
        includeDismissed,
        offset: data.companies.length,
        limit: PAGE_SIZE,
      });
      setData((prev) => {
        if (!prev) return next;
        return {
          ...next,
          companies: [...prev.companies, ...next.companies],
          offset: 0,
        };
      });
    } catch (err) {
      if (err instanceof ApiAuthError) setAuthRequired(true);
      else setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [flagKey, q, includeDismissed, data]);

  const dismiss = useCallback(
    async (
      hit: ManualReviewCompanyHit,
      note: string,
    ): Promise<ManualReviewDismissal> => {
      if (!flagKey) throw new Error("No flag selected");
      setActionBusyId(hitBusyKey(hit));
      try {
        const dismissal = await dismissManualReviewFlag({
          companyId: hit.companyId,
          flagKey,
          evidenceFingerprint: hit.evidenceFingerprint,
          note,
        });
        setData((prev) => {
          if (!prev) return prev;
          const companies = prev.companies
            .map((row) => {
              if (
                row.companyId !== hit.companyId ||
                row.evidenceFingerprint !== hit.evidenceFingerprint
              ) {
                return row;
              }
              return {
                ...row,
                dismissalId: dismissal.id,
                dismissedAt: dismissal.createdAt,
                dismissalNote: dismissal.note,
                dismissedByUserId: dismissal.userId,
                dismissedByName: dismissal.userName,
              };
            })
            .filter((row) =>
              includeDismissed ? true : row.dismissalId == null,
            );
          return {
            ...prev,
            companies,
            totalMatching: includeDismissed
              ? prev.totalMatching
              : Math.max(0, prev.totalMatching - 1),
            activeCount: Math.max(0, prev.activeCount - 1),
            dismissedCount: prev.dismissedCount + 1,
          };
        });
        return dismissal;
      } catch (err) {
        if (err instanceof ApiAuthError) setAuthRequired(true);
        else setError(err instanceof Error ? err.message : "Dismiss failed");
        throw err;
      } finally {
        setActionBusyId(null);
      }
    },
    [flagKey, includeDismissed],
  );

  const undo = useCallback(
    async (hit: ManualReviewCompanyHit) => {
      if (!hit.dismissalId) return;
      setActionBusyId(hitBusyKey(hit));
      try {
        await undoManualReviewDismissal(hit.dismissalId);
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            companies: prev.companies.map((row) => {
              if (
                row.companyId !== hit.companyId ||
                row.evidenceFingerprint !== hit.evidenceFingerprint
              ) {
                return row;
              }
              return {
                ...row,
                dismissalId: null,
                dismissedAt: null,
                dismissalNote: null,
                dismissedByUserId: null,
                dismissedByName: null,
              };
            }),
            activeCount: prev.activeCount + 1,
            dismissedCount: Math.max(0, prev.dismissedCount - 1),
          };
        });
      } catch (err) {
        if (err instanceof ApiAuthError) setAuthRequired(true);
        else setError(err instanceof Error ? err.message : "Undo failed");
        throw err;
      } finally {
        setActionBusyId(null);
      }
    },
    [],
  );

  const hasMore = Boolean(
    data && data.companies.length < data.totalMatching,
  );

  return {
    data,
    loading,
    loadingMore,
    hasMore,
    error,
    authRequired,
    actionBusyId,
    refresh,
    loadMore,
    dismiss,
    undo,
  };
}
