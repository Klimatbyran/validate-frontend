import { useCallback, useEffect, useState } from "react";
import { ApiAuthError } from "@/lib/garbo-auth-fetch";
import { fetchManualReviewSummary } from "../lib/manual-review-api";
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

  return { data, loading, error, authRequired, refresh };
}
