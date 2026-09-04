import React from "react";
import type { ApiTarget } from "@/config/api-env";
import { fetchPipelineCompaniesForTarget } from "@/lib/pipeline-companies-cross-env";
import type { Company } from "@/tabs/errors/types";
import { scanForSuspiciousData, type SuspicionScanResult } from "../lib/detect";

const EMPTY_SCAN: SuspicionScanResult = {
  findings: [],
  periodCount: 0,
  observationCount: 0,
  companyCount: 0,
};

/**
 * Loads the company list from the chosen environment and runs every suspicion
 * rule over it.
 *
 * Switching source refetches: the rules compare each value against its peers,
 * so a scan is only meaningful within a single environment's data.
 */
export function useSuspiciousData(source: ApiTarget) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const latestRequestId = React.useRef(0);

  const fetchData = React.useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const sourceCompanies = await fetchPipelineCompaniesForTarget(source);
      if (requestId !== latestRequestId.current) return;
      setCompanies(sourceCompanies);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      // Stale rows from the previous source would otherwise be scanned as if
      // they came from the one that just failed.
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

  return { isLoading, error, fetchData, scan };
}
