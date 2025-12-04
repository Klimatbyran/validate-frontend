import { useState, useEffect, useRef } from 'react';
import { fetchCompaniesPage, fetchProcessById, fetchQueueStats } from '@/lib/api';
import type { CustomAPICompany } from '@/lib/types';

export function useCompanies() {
  const [companies, setCompanies] = useState<CustomAPICompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const isFetchingRef = useRef(false);
  const processPollersRef = useRef<Map<string, { interval: number; max: number; isPolling: boolean; stopped: boolean }>>(new Map());
  const PAGE_SIZE = 300;

  useEffect(() => {
    const SLOW_REFRESH_MS = 60000;
    let intervalId: number | undefined;

    const fetchAndEnhance = async () => {
      console.log('useCompanies - fetchAndEnhance called, isFetchingRef.current:', isFetchingRef.current);
      
      if (isFetchingRef.current) {
        console.log('useCompanies - already fetching, skipping');
        return;
      }
      isFetchingRef.current = true;
      
      try {
        setError(null);

        console.log('useCompanies - fetching basic company data...');

        const firstPageCompanies = await fetchCompaniesPage(1, PAGE_SIZE);
        
        console.log('useCompanies - fetch completed successfully');
        console.log('useCompanies - raw fetch result length:', firstPageCompanies?.length);
        
        // Force a new array reference to ensure React detects the change
        const data = Array.isArray(firstPageCompanies) ? [...firstPageCompanies] : [];

        console.log('useCompanies - processed data length:', data.length);
        
        if (data.length > 0) {
          console.log('useCompanies - first company:', data[0]);
        }

        console.log('useCompanies - setting hasMorePages:', data.length === PAGE_SIZE);
        setHasMorePages(data.length === PAGE_SIZE);

        console.log('useCompanies - about to setCompanies with', data.length, 'companies');
        
        // Set companies with forced new reference - React will handle unmounted components gracefully
        setCompanies([...data]);
        
        console.log('useCompanies - setCompanies called successfully');
        
        startProcessPollers(data);
        
      } catch (err) {
        console.error('useCompanies - fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch companies');
      } finally {
        console.log('useCompanies - setting isLoading to false');
        setIsLoading(false);
        isFetchingRef.current = false;
        console.log('useCompanies - fetchAndEnhance complete');
      }
    };

    function startProcessPollers(currentCompanies: CustomAPICompany[]) {
      console.log('useCompanies - starting process pollers for', currentCompanies.length, 'companies');
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
        if (updated) {
          setCompanies((prev) => {
            const newCompanies = prev.map((c) => ({
              ...c,
              processes: c.processes.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            }));
            return newCompanies;
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
        if (!state.stopped) {
          setTimeout(() => pollProcess(processId), state.interval);
        }
      }
    }

    const onKick = () => {
      console.log('useCompanies - external refresh triggered');
      fetchAndEnhance();
    };
    window.addEventListener('companies:refresh', onKick);

    console.log('useCompanies - starting initial load');
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
    document.addEventListener('visibilitychange', onVisibility);

    // Cleanup function
    return () => {
      console.log('useCompanies - cleanup');
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('companies:refresh', onKick);
      // stop all per-process pollers
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

      setCompanies((previousCompanies) => [...previousCompanies, ...nextPageCompanies]);
      setCurrentPage(nextPage);

      if (nextPageCompanies.length < PAGE_SIZE) {
        setHasMorePages(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more companies');
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
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return { companies, isLoading, error, loadMoreCompanies, isLoadingMore, hasMorePages };
}