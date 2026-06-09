import { useCallback, useEffect, useState } from "react";
import { getGarboQueueArchiveUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { ArchiveRunsListResponse } from "../lib/archive-types";

export const ARCHIVE_RUNS_PAGE_SIZE = 30;

export function useArchiveRunsList() {
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [batchFilterIds, setBatchFilterIds] = useState<string[]>([]);
  const [data, setData] = useState<ArchiveRunsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(ARCHIVE_RUNS_PAGE_SIZE),
        });
        if (qApplied.trim()) params.set("q", qApplied.trim());
        if (batchFilterIds.length > 0) {
          params.set("batchDbIds", batchFilterIds.join(","));
        }
        const res = await garboAuthFetch(
          getGarboQueueArchiveUrl(`/runs?${params.toString()}`),
          { signal: ac.signal },
        );
        if (cancelled) return;
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        const json = (await res.json()) as ArchiveRunsListResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (
          cancelled ||
          (e instanceof DOMException && e.name === "AbortError")
        ) {
          return;
        }
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setData(null);
        }
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [page, qApplied, batchFilterIds]);

  const applySearch = useCallback(() => {
    setPage(1);
    setQApplied(qInput);
  }, [qInput]);

  const setBatchFilterIdsAndResetPage = useCallback((ids: string[]) => {
    setBatchFilterIds(ids);
    setPage(1);
  }, []);

  return {
    page,
    setPage,
    qInput,
    setQInput,
    batchFilterIds,
    setBatchFilterIds: setBatchFilterIdsAndResetPage,
    data,
    loading,
    error,
    applySearch,
    pageSize: ARCHIVE_RUNS_PAGE_SIZE,
  };
}
