import React from "react";
import { fetchProdPipelineCompanies } from "@/lib/pipeline-companies-cross-env";
import type { Company } from "@/tabs/errors/types";
import { scanForSuspiciousData, type SuspicionScanResult } from "../lib/detect";

const EMPTY_SCAN: SuspicionScanResult = {
  findings: [],
  periodCount: 0,
  observationCount: 0,
  companyCount: 0,
};

/**
 * Loads the production company list and runs every suspicion rule over it.
 *
 * Production is the only source here: this tab reviews what is live on
 * klimatkollen.se, not what a pipeline run produced on stage.
 */
export function useSuspiciousData() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const latestRequestId = React.useRef(0);

  const fetchData = React.useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const prodCompanies = await fetchProdPipelineCompanies();
      if (requestId !== latestRequestId.current) return;
      setCompanies(prodCompanies);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err instanceof Error ? err.message : "Unknown error");
      if (import.meta.env.DEV) {
        console.error("useSuspiciousData fetch error:", err);
      }
    } finally {
      if (requestId === latestRequestId.current) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scan = React.useMemo(
    () => (companies.length ? scanForSuspiciousData(companies) : EMPTY_SCAN),
    [companies],
  );

  return { isLoading, error, fetchData, scan };
}
