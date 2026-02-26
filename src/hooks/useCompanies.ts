import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchCompaniesPage,
  fetchProcessById,
  fetchQueueStats,
} from "@/lib/api";
import type { CustomAPICompany } from "@/lib/types";

/** Single fetch size when API returns all companies (no real pagination). */
const FETCH_PAGE_SIZE = 10000;

export function useCompanies() {
  const [companies, setCompanies] = useState<CustomAPICompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const userRefreshRequestedRef = useRef(false);
  const fetchAndEnhanceRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const processPollersRef = useRef<
    Map<
      string,
      { interval: number; max: number; isPolling: boolean; stopped: boolean }
    >
  >(new Map());

  useEffect(() => {
    const SLOW_REFRESH_MS = 60000;
    let intervalId: number | undefined;

    const fetchAndEnhance = async () => {
      if (isFetchingRef.current) {
        userRefreshRequestedRef.current = false;
        return;
      }
      isFetchingRef.current = true;
      const isUserRefresh = userRefreshRequestedRef.current;
      userRefreshRequestedRef.current = false;
      if (isUserRefresh) setIsRefreshing(true);

      try {
        setError(null);

        const data = await fetchCompaniesPage(1, FETCH_PAGE_SIZE);
        const list = Array.isArray(data) ? [...data] : [];

        setCompanies(list);
        startProcessPollers(list);
      } catch (err) {
        console.error("useCompanies - fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch companies"
        );
      } finally {
        setIsLoading(false);
        if (isUserRefresh) setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    };
    fetchAndEnhanceRef.current = fetchAndEnhance;

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

  const refresh = useCallback(() => {
    userRefreshRequestedRef.current = true;
    fetchAndEnhanceRef.current();
  }, []);

  return {
    companies,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
}
