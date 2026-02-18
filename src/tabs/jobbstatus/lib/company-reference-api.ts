import React from "react";
import { getPublicApiUrl } from "@/lib/utils";

/**
 * Shared API helpers for fetching company reference data (used by scope sections
 * to compare job output against production API).
 */

export async function fetchCompanyById(
  companyId: string,
  signal: AbortSignal
): Promise<any> {
  const response = await fetch(
    getPublicApiUrl(`/api/companies/${encodeURIComponent(companyId)}`),
    { signal }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function getReportingPeriods(company: any): any[] {
  return Array.isArray(company?.reportingPeriods) ? company.reportingPeriods : [];
}

export function findPeriodEndingInYear(
  periods: any[],
  year: number
): any | undefined {
  return periods.find((period: any) => {
    const endDate = period?.endDate ? new Date(period.endDate) : null;
    return endDate && endDate.getFullYear() === year;
  });
}

export interface UseCompanyReferenceByYearsResult<T> {
  referenceByYear: Record<number, T>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches company by wikidata id, gets reporting periods, and builds a snapshot
 * per year using the provided builder. Used by EconomySection, Scope12Section, Scope3Section.
 */
export function useCompanyReferenceByYears<T>(
  wikidataId: string | undefined,
  years: number[],
  buildSnapshotFromPeriod: (period: any) => T
): UseCompanyReferenceByYearsResult<T> {
  const [referenceByYear, setReferenceByYear] = React.useState<
    Record<number, T>
  >({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const yearsKey = React.useMemo(() => years.join(","), [years]);
  const buildRef = React.useRef(buildSnapshotFromPeriod);
  buildRef.current = buildSnapshotFromPeriod;

  React.useEffect(() => {
    if (!wikidataId || years.length === 0) return;
    const abortController = new AbortController();
    let isMounted = true;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const company = await fetchCompanyById(
          wikidataId!,
          abortController.signal
        );
        const periods = getReportingPeriods(company);
        const nextMap: Record<number, T> = {};
        for (const y of years) {
          const period = findPeriodEndingInYear(periods, y);
          nextMap[y] = buildRef.current(period);
        }
        if (isMounted) {
          setReferenceByYear(nextMap);
          setIsLoading(false);
        }
      } catch (e: any) {
        if (isMounted && e?.name !== "AbortError") {
          setError(e?.message || "Kunde inte hämta referensdata");
          setIsLoading(false);
        }
      }
    }
    run();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [wikidataId, yearsKey]);

  return { referenceByYear, isLoading, error };
}
