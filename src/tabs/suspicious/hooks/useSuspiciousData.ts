import React from "react";
import { scanForSuspiciousData, type SuspicionScanResult } from "../lib/detect";
import {
  fetchPipelineCompaniesForSource,
  type SuspiciousDataSource,
} from "../lib/pipeline-source";
import type { Company } from "@/tabs/errors/types";

const EMPTY_SCAN: SuspicionScanResult = {
  findings: [],
  periodCount: 0,
  observationCount: 0,
  companyCount: 0,
};

/**
 * Loads the company list for the chosen environment and runs every suspicion
 * rule over it. Switching source clears previous rows before the new scan
 * lands, because the rules only mean anything within a single environment.
 * Refresh/refetch keeps the previous list until the new one arrives so an open
 * finding dialog does not flash "period missing".
 */
export function useSuspiciousData(source: SuspiciousDataSource) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const latestRequestId = React.useRef(0);

  React.useEffect(() => {
    setCompanies([]);
    setError(null);
  }, [source]);

  const fetchData = React.useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const sourceCompanies = await fetchPipelineCompaniesForSource(source);
      if (requestId !== latestRequestId.current) return;
      setCompanies(sourceCompanies);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setCompanies([]);
      setError(err instanceof Error ? err.message : "Unknown error");
      if (import.meta.env.DEV) {
        console.error("useSuspiciousData fetch error:", err);
      }
    } finally {
      if (requestId === latestRequestId.current) setIsLoading(false);
    }
  }, [source]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scan = React.useMemo(
    () => (companies.length ? scanForSuspiciousData(companies) : EMPTY_SCAN),
    [companies],
  );

  return { isLoading, error, fetchData, scan, companies };
}
