import { useState, useEffect, useRef } from 'react';
import { fetchProcessesByCompany, fetchProcessById, fetchQueueStats } from '@/lib/api';
import type { CustomAPICompany } from '@/lib/types';

// Per-job details are fetched on demand in dialogs; no helper needed here

// On-demand enhancement removed from startup; details are fetched per-dialog

// Delta enhancement removed; details are fetched on demand in dialogs

export function useCompanies() {
  const [companies, setCompanies] = useState<CustomAPICompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const isFetchingRef = useRef(false);
  // no delta enhancement state needed
  const processPollersRef = useRef<Map<string, { interval: number; max: number; isPolling: boolean; stopped: boolean }>>(new Map());

  useEffect(() => {
    let isMounted = true;

    // Slow refresh interval (ms) - just to discover new processes occasionally
    const SLOW_REFRESH_MS = 60000;
    let intervalId: number | undefined;

    const fetchAndEnhance = async () => {
      if (isFetchingRef.current) {
        return; // Skip if a previous cycle is still running
      }
      isFetchingRef.current = true;
      try {
        // Only show loading spinner on first load
        setError(null);

        if (import.meta.env.DEV) console.log('useCompanies - fetching basic company data...');
        const data = await fetchProcessesByCompany();

        if (!isMounted) return;

        if (import.meta.env.DEV) {
          console.log('useCompanies - fetched companies:', data.length);
          if (data.length > 0) {
            console.log('useCompanies - first company:', data[0]);
          }
        }

        // Initial load: render fast and start process pollers (no per-job enhancement)
        if (data.length > 0 && !hasLoadedOnce) {
          setCompanies(data);
          setHasLoadedOnce(true);
          startProcessPollers(data);
        } else if (data.length > 0) {
          // Subsequent slow refresh: update base data only (on-demand details elsewhere)
          if (!isMounted) return;
          setCompanies(data);
          startProcessPollers(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch companies');
          console.error('useCompanies - error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
        isFetchingRef.current = false;
      }
    };

    function startProcessPollers(currentCompanies: CustomAPICompany[]) {
      const pollers = processPollersRef.current;
      for (const company of currentCompanies) {
        for (const process of company.processes) {
          if (!process.id) continue;
          if (process.status !== 'active' && process.status !== 'waiting') continue;
          if (!pollers.has(process.id)) {
            pollers.set(process.id, { interval: 1000, max: 30000, isPolling: false, stopped: false });
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
        if (!isMounted) {
          state.stopped = true;
          return;
        }
        if (updated) {
          // Merge the updated process into the local companies state
          setCompanies((prev) => {
            return prev.map((c) => ({
              ...c,
              processes: c.processes.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            }));
          });
          if (updated.status === 'completed' || updated.status === 'failed') {
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
        if (isMounted && !state.stopped) {
          setTimeout(() => pollProcess(processId), state.interval);
        }
      }
    }

    // Allow external triggers to force an immediate refresh (e.g., after creating runs)
    const onKick = () => {
      fetchAndEnhance();
    };
    window.addEventListener('companies:refresh', onKick);

    // Initial load
    setIsLoading(true);
    fetchAndEnhance();

    // Slow refresh to discover new processes
    intervalId = window.setInterval(fetchAndEnhance, SLOW_REFRESH_MS);

    // Pause polling when tab is hidden; resume when visible
    const onVisibility = () => {
      if (document.hidden) {
        if (intervalId) window.clearInterval(intervalId);
        intervalId = undefined;
      } else {
        // Resume slow refresh without immediate fetch
        intervalId = window.setInterval(fetchAndEnhance, SLOW_REFRESH_MS);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isMounted = false;
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('companies:refresh', onKick);
      // stop all per-process pollers
      processPollersRef.current.forEach((state) => {
        state.stopped = true;
      });
    };
  }, []);

  // Lightweight trigger: poll queue stats and refresh companies only if counts changed
  useEffect(() => {
    let isMounted = true;
    let timer: number | undefined;
    let busy = false;
    const prev = new Map<string, string>();

    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const stats = await fetchQueueStats();
        if (!isMounted) return;
        let changed = false;
        for (const s of stats) {
          const cur = JSON.stringify(s.status);
          const old = prev.get(s.name);
          if (cur !== old) changed = true;
          prev.set(s.name, cur);
        }
        if (changed) {
          // ask the main effect to refresh now
          window.dispatchEvent(new CustomEvent('companies:refresh'));
        }
      } catch {
        // ignore errors; next tick will retry
      } finally {
        busy = false;
      }
    };

    timer = window.setInterval(tick, 2000);
    return () => {
      isMounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return { companies, isLoading, error };
}
