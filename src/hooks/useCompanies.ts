import { useState, useEffect, useRef } from "react";
import {
  fetchCompaniesPage,
  fetchProcessById,
  fetchQueueStats,
} from "@/lib/api";
import type { CustomAPICompany } from "@/lib/types";

export function useCompanies() {
  const [companies, setCompanies] = useState<CustomAPICompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const isFetchingRef = useRef(false);
  const processPollersRef = useRef<
    Map<
      string,
      { interval: number; max: number; isPolling: boolean; stopped: boolean }
    >
  >(new Map());
  const PAGE_SIZE = 300;

  useEffect(() => {
    const SLOW_REFRESH_MS = 60000;
    let intervalId: number | undefined;

    const fetchAndEnhance = async () => {
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;

      try {
        setError(null);

        const firstPageCompanies = await fetchCompaniesPage(1, PAGE_SIZE);

        const data = Array.isArray(firstPageCompanies)
          ? [...firstPageCompanies]
          : [];

        setHasMorePages(data.length === PAGE_SIZE);
        setCurrentPage(1);
        setCompanies([...data]);

        startProcessPollers(data);
      } catch (err) {
        console.error("useCompanies - fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch companies"
        );
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    function startProcessPollers(currentCompanies: CustomAPICompany[]) {
      const pollers = processPollersRef.current;
      for (const company of currentCompanies) {
        for (const process of company.processes) {
          if (!process.id) continue;
          if (process.status !== "active" && process.status !== "waiting")
            continue;
          if (!pollers.has(process.id)) {
            pollers.set(process.id, {
              interval: 1000,
              max: 30000,
              isPolling: false,
              stopped: false,
            });
            pollProcess(process.id);
          }
        }
      }
    }

    async function pollProcess(processId: string) {
      const pollers = processPollersRef.current;
      const state = pollers.get(processId);
      if (!state || state.stopped || state.isPolling) return;

      state.isPolling = true;
      try {
        const updated = await fetchProcessById(processId);
        if (updated) {
          setCompanies((prev) => {
            const newCompanies = prev.map((c) => ({
              ...c,
              processes: c.processes.map((p) =>
                p.id === updated.id ? { ...p, ...updated } : p
              ),
            }));
            return newCompanies;
          });
          if (updated.status === "completed" || updated.status === "failed") {
            state.stopped = true;
            return;
          }
        }
      } catch (_) {
        // ignore errors, will backoff
      } finally {
        state.isPolling = false;
        const next = Math.min(Math.floor(state.interval * 1.5), state.max);
        state.interval = next;
        if (!state.stopped) {
          setTimeout(() => pollProcess(processId), state.interval);
        }
      }
    }

    const onKick = () => {
      fetchAndEnhance();
    };
    window.addEventListener("companies:refresh", onKick);

    setIsLoading(true);
    fetchAndEnhance();

    intervalId = window.setInterval(fetchAndEnhance, SLOW_REFRESH_MS);

    const onVisibility = () => {
      if (document.hidden) {
        if (intervalId) window.clearInterval(intervalId);
        intervalId = undefined;
      } else {
        intervalId = window.setInterval(fetchAndEnhance, SLOW_REFRESH_MS);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("companies:refresh", onKick);
      processPollersRef.current.forEach((state) => {
        state.stopped = true;
      });
    };
  }, []);

  async function loadMoreCompanies() {
    if (isLoadingMore || !hasMorePages) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const nextPage = currentPage + 1;
      const nextPageCompanies = await fetchCompaniesPage(nextPage, PAGE_SIZE);

      if (nextPageCompanies.length === 0) {
        setHasMorePages(false);
        return;
      }

      setCompanies((previousCompanies) => [
        ...previousCompanies,
        ...nextPageCompanies,
      ]);
      setCurrentPage(nextPage);

      if (nextPageCompanies.length < PAGE_SIZE) {
        setHasMorePages(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load more companies"
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    let timer: number | undefined;
    let busy = false;
    const prev = new Map<string, string>();

    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const stats = await fetchQueueStats();
        let changed = false;
        for (const s of stats) {
          const cur = JSON.stringify(s.status);
          const old = prev.get(s.name);
          if (cur !== old) changed = true;
          prev.set(s.name, cur);
        }
        if (changed) {
          window.dispatchEvent(new CustomEvent("companies:refresh"));
        }
      } catch {
        // ignore errors; next tick will retry
      } finally {
        busy = false;
      }
    };

    timer = window.setInterval(tick, 2000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return {
    companies,
    isLoading,
    error,
    loadMoreCompanies,
    isLoadingMore,
    hasMorePages,
  };
}
