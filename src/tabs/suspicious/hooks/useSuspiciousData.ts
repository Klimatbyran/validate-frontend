import React from "react";
import { useAuth } from "@/hooks/useAuth";
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
 */
export function useSuspiciousData(source: SuspiciousDataSource) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const latestRequestId = React.useRef(0);

  const fetchData = React.useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);
    setCompanies([]);

    try {
      const sourceCompanies = await fetchPipelineCompaniesForSource(
        source,
        token,
      );
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
  }, [source, token]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scan = React.useMemo(
    () => (companies.length ? scanForSuspiciousData(companies) : EMPTY_SCAN),
    [companies],
  );

  return { isLoading, error, fetchData, scan, companies };
}
