import React from 'react';
import { Company, CompanyRow, DataPointMetric, WorstCompany, DiscrepancyType, DATA_POINTS, GENERIC_DATA_POINTS } from './types';
import { getStageApiUrl, getProdApiUrl, pickReportingPeriodForYear, getDataPointValue, classifyDiscrepancy } from './utils';

export function useErrorBrowserData(selectedYear: number, selectedDataPoint: string) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stageCompanies, setStageCompanies] = React.useState<Company[]>([]);
  const [prodCompanies, setProdCompanies] = React.useState<Company[]>([]);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [stageResponse, prodResponse] = await Promise.all([
        fetch(getStageApiUrl(), { headers: { 'Cache-Control': 'no-cache' } }),
        fetch(getProdApiUrl(), { headers: { 'Cache-Control': 'no-cache' } }),
      ]);

      if (!stageResponse.ok) throw new Error(`Failed to fetch stage data: ${stageResponse.status}`);
      if (!prodResponse.ok) throw new Error(`Failed to fetch prod data: ${prodResponse.status}`);

      const stage: Company[] = await stageResponse.json();
      const prod: Company[] = await prodResponse.json();

      setStageCompanies(stage);
      setProdCompanies(prod);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, []);

  // Build comparison rows for selected data point
  const comparisonRows = React.useMemo((): CompanyRow[] => {
    const stageMap = new Map<string, Company>();
    stageCompanies.forEach(c => stageMap.set(c.wikidataId, c));

    const prodMap = new Map<string, Company>();
    prodCompanies.forEach(c => prodMap.set(c.wikidataId, c));

    const allIds = new Set([...stageMap.keys(), ...prodMap.keys()]);
    const rows: CompanyRow[] = [];

    for (const wikidataId of allIds) {
      const stageCompany = stageMap.get(wikidataId);
      const prodCompany = prodMap.get(wikidataId);

      const name = stageCompany?.name || prodCompany?.name || wikidataId;

      const stageRP = stageCompany ? pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear) : null;
      const prodRP = prodCompany ? pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear) : null;

      const stageValue = getDataPointValue(stageRP?.emissions, selectedDataPoint);
      const prodValue = getDataPointValue(prodRP?.emissions, selectedDataPoint);

      const discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);
      const diff = stageValue !== null && prodValue !== null ? stageValue - prodValue : null;

      // Detect unit error factor for display
      let unitErrorFactor: number | undefined;
      if (discrepancy === 'unit-error' && stageValue !== null && prodValue !== null) {
        const absS = Math.abs(stageValue);
        const absP = Math.abs(prodValue);
        const ratio = Math.max(absS, absP) / Math.min(absS, absP);
        for (const power of [10, 100, 1000, 10000, 100000, 1000000]) {
          if (Math.abs(ratio - power) / power <= 0.05) {
            unitErrorFactor = absS > absP ? power : 1 / power;
            break;
          }
        }
      }

      rows.push({
        wikidataId, name, stageValue, prodValue, discrepancy, diff,
        inStage: !!stageCompany, inProd: !!prodCompany, unitErrorFactor,
      });
    }

    // Detect category errors
    const currentDP = DATA_POINTS.find(dp => dp.id === selectedDataPoint);
    if (currentDP) {
      const sameScopeDataPoints = DATA_POINTS.filter(
        dp => dp.scope === currentDP.scope && dp.id !== currentDP.id
      );

      if (sameScopeDataPoints.length > 0) {
        for (const row of rows) {
          if (row.discrepancy === 'identical' || row.discrepancy === 'rounding' || row.discrepancy === 'both-null') continue;

          const stageCompany = stageMap.get(row.wikidataId);
          const prodCompany = prodMap.get(row.wikidataId);

          // error/small-error/hallucination: stage value found in another prod data point
          if ((row.discrepancy === 'error' || row.discrepancy === 'small-error' || row.discrepancy === 'hallucination') && row.stageValue !== null && prodCompany) {
            const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear);
            const stageRPForKind = stageCompany ? pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear) : null;
            for (const otherDP of sameScopeDataPoints) {
              const otherProdValue = getDataPointValue(prodRP?.emissions, otherDP.id);
              if (otherProdValue !== null && Math.abs(row.stageValue - otherProdValue) <= 0.5) {
                row.discrepancy = 'category-error';
                row.matchedDataPoint = otherDP.label;
                // Classify kind
                const otherStageValue = stageRPForKind ? getDataPointValue(stageRPForKind.emissions, otherDP.id) : null;
                if (otherStageValue !== null && Math.abs(row.stageValue! - otherStageValue) <= 0.5) {
                  row.categoryErrorKind = 'duplicating';
                } else if (row.prodValue !== null && otherStageValue !== null && Math.abs(otherStageValue - row.prodValue) <= 0.5) {
                  row.categoryErrorKind = 'swap';
                } else if (GENERIC_DATA_POINTS.has(selectedDataPoint)) {
                  row.categoryErrorKind = 'conservative';
                } else if (GENERIC_DATA_POINTS.has(otherDP.id)) {
                  row.categoryErrorKind = 'overcategorized';
                } else {
                  row.categoryErrorKind = 'mix-up';
                }
                break;
              }
            }
          }

          // missing: prod value found in another stage data point
          if (row.discrepancy === 'missing' && row.prodValue !== null && stageCompany) {
            const stageRP = pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear);
            for (const otherDP of sameScopeDataPoints) {
              const otherStageValue = getDataPointValue(stageRP?.emissions, otherDP.id);
              if (otherStageValue !== null && Math.abs(row.prodValue - otherStageValue) <= 0.5) {
                row.discrepancy = 'category-error';
                row.matchedDataPoint = otherDP.label;
                if (GENERIC_DATA_POINTS.has(otherDP.id)) {
                  row.categoryErrorKind = 'conservative';
                } else if (GENERIC_DATA_POINTS.has(selectedDataPoint)) {
                  row.categoryErrorKind = 'overcategorized';
                } else {
                  row.categoryErrorKind = 'mix-up';
                }
                break;
              }
            }
          }
        }
      }
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [stageCompanies, prodCompanies, selectedYear, selectedDataPoint]);

  // Calculate metrics for ALL data points (for overview)
  const allDataPointMetrics = React.useMemo((): DataPointMetric[] => {
    if (stageCompanies.length === 0 || prodCompanies.length === 0) return [];

    const stageMap = new Map<string, Company>();
    stageCompanies.forEach(c => stageMap.set(c.wikidataId, c));

    const prodMap = new Map<string, Company>();
    prodCompanies.forEach(c => prodMap.set(c.wikidataId, c));

    const allIds = Array.from(new Set([...stageMap.keys(), ...prodMap.keys()]));

    return DATA_POINTS.map(dp => {
      let identical = 0, rounding = 0, hallucination = 0, missing = 0;
      let unitError = 0, smallError = 0, errorCount = 0, categoryError = 0, bothNull = 0;

      const sameScopeDataPoints = DATA_POINTS.filter(
        other => other.scope === dp.scope && other.id !== dp.id
      );

      for (const wikidataId of allIds) {
        const stageCompany = stageMap.get(wikidataId);
        const prodCompany = prodMap.get(wikidataId);

        if (!stageCompany || !prodCompany) continue;

        const stageRP = pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear);
        const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear);

        if (!stageRP || !prodRP) continue;

        const stageValue = getDataPointValue(stageRP?.emissions, dp.id);
        const prodValue = getDataPointValue(prodRP?.emissions, dp.id);

        let discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);

        // Detect category errors
        if (discrepancy !== 'identical' && discrepancy !== 'rounding' && discrepancy !== 'both-null' && sameScopeDataPoints.length > 0) {
          if ((discrepancy === 'error' || discrepancy === 'small-error' || discrepancy === 'hallucination') && stageValue !== null) {
            for (const otherDP of sameScopeDataPoints) {
              const otherProdValue = getDataPointValue(prodRP?.emissions, otherDP.id);
              if (otherProdValue !== null && Math.abs(stageValue - otherProdValue) <= 0.5) {
                discrepancy = 'category-error';
                break;
              }
            }
          }
          if (discrepancy === 'missing' && prodValue !== null) {
            for (const otherDP of sameScopeDataPoints) {
              const otherStageValue = getDataPointValue(stageRP?.emissions, otherDP.id);
              if (otherStageValue !== null && Math.abs(prodValue - otherStageValue) <= 0.5) {
                discrepancy = 'category-error';
                break;
              }
            }
          }
        }

        switch (discrepancy) {
          case 'identical': identical++; break;
          case 'rounding': rounding++; break;
          case 'hallucination': hallucination++; break;
          case 'missing': missing++; break;
          case 'unit-error': unitError++; break;
          case 'small-error': smallError++; break;
          case 'error': errorCount++; break;
          case 'category-error': categoryError++; break;
          case 'both-null': bothNull++; break;
        }
      }

      const withAnyData = identical + rounding + hallucination + missing + unitError + smallError + errorCount + categoryError;
      const tolerantSuccess = identical + rounding + smallError;
      const tolerantRate = withAnyData > 0 ? (tolerantSuccess / withAnyData) * 100 : 0;

      return {
        id: dp.id,
        label: dp.label,
        shortLabel: dp.category ? `Cat ${dp.category}` : dp.label.split(' ').slice(0, 2).join(' '),
        tolerantRate,
        tolerantSuccess,
        withAnyData,
        breakdown: { identical, rounding, hallucination, missing, unitError, smallError, error: errorCount, categoryError, bothNull },
      };
    });
  }, [stageCompanies, prodCompanies, selectedYear]);

  // Worst companies: count errors across ALL data points
  const worstCompanies = React.useMemo((): WorstCompany[] => {
    if (stageCompanies.length === 0 || prodCompanies.length === 0) return [];

    const stageMap = new Map<string, Company>();
    stageCompanies.forEach(c => stageMap.set(c.wikidataId, c));

    const prodMap = new Map<string, Company>();
    prodCompanies.forEach(c => prodMap.set(c.wikidataId, c));

    const allIds = Array.from(new Set([...stageMap.keys(), ...prodMap.keys()]));
    const companyErrors: WorstCompany[] = [];

    for (const wikidataId of allIds) {
      const stageCompany = stageMap.get(wikidataId);
      const prodCompany = prodMap.get(wikidataId);

      if (!stageCompany || !prodCompany) continue;

      const stageRP = pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear);
      const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear);

      if (!stageRP || !prodRP) continue;

      const name = stageCompany.name || prodCompany.name || wikidataId;
      let errorCount = 0;
      let totalDataPoints = 0;
      const breakdown: Record<string, number> = {};
      const errorDataPoints: Array<{ label: string; discrepancy: DiscrepancyType }> = [];

      for (const dp of DATA_POINTS) {
        const stageValue = getDataPointValue(stageRP.emissions, dp.id);
        const prodValue = getDataPointValue(prodRP.emissions, dp.id);

        let discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);

        // Detect category errors
        const sameScopeDataPoints = DATA_POINTS.filter(
          other => other.scope === dp.scope && other.id !== dp.id
        );
        if (discrepancy !== 'identical' && discrepancy !== 'rounding' && discrepancy !== 'both-null' && sameScopeDataPoints.length > 0) {
          if ((discrepancy === 'error' || discrepancy === 'small-error' || discrepancy === 'hallucination') && stageValue !== null) {
            for (const otherDP of sameScopeDataPoints) {
              const otherProdValue = getDataPointValue(prodRP.emissions, otherDP.id);
              if (otherProdValue !== null && Math.abs(stageValue - otherProdValue) <= 0.5) {
                discrepancy = 'category-error';
                break;
              }
            }
          }
          if (discrepancy === 'missing' && prodValue !== null) {
            for (const otherDP of sameScopeDataPoints) {
              const otherStageValue = getDataPointValue(stageRP.emissions, otherDP.id);
              if (otherStageValue !== null && Math.abs(prodValue - otherStageValue) <= 0.5) {
                discrepancy = 'category-error';
                break;
              }
            }
          }
        }

        const isError = discrepancy !== 'identical' && discrepancy !== 'rounding' && discrepancy !== 'both-null';
        if (isError) {
          errorCount++;
          breakdown[discrepancy] = (breakdown[discrepancy] || 0) + 1;
          errorDataPoints.push({ label: dp.label, discrepancy });
        }
        if (stageValue !== null || prodValue !== null) {
          totalDataPoints++;
        }
      }

      if (errorCount > 0) {
        companyErrors.push({ wikidataId, name, errorCount, totalDataPoints, breakdown, errorDataPoints });
      }
    }

    return companyErrors.sort((a, b) => b.errorCount - a.errorCount);
  }, [stageCompanies, prodCompanies, selectedYear]);

  // Set of difficult company IDs (>=5 errors)
  const difficultCompanyIds = React.useMemo(() => {
    const ids = new Map<string, number>();
    for (const c of worstCompanies) {
      if (c.errorCount >= 5) ids.set(c.wikidataId, c.errorCount);
    }
    return ids;
  }, [worstCompanies]);

  // Total companies with reporting periods in both APIs (for histogram)
  const totalWithBothRPs = React.useMemo(() => {
    const stageMap = new Map<string, Company>();
    stageCompanies.forEach(c => stageMap.set(c.wikidataId, c));
    const prodMap = new Map<string, Company>();
    prodCompanies.forEach(c => prodMap.set(c.wikidataId, c));

    let count = 0;
    for (const id of new Set([...stageMap.keys(), ...prodMap.keys()])) {
      const s = stageMap.get(id);
      const p = prodMap.get(id);
      if (s && p) {
        const sRP = pickReportingPeriodForYear(s.reportingPeriods, selectedYear);
        const pRP = pickReportingPeriodForYear(p.reportingPeriods, selectedYear);
        if (sRP && pRP) count++;
      }
    }
    return count;
  }, [stageCompanies, prodCompanies, selectedYear]);

  return {
    isLoading,
    error,
    fetchData,
    comparisonRows,
    allDataPointMetrics,
    worstCompanies,
    difficultCompanyIds,
    totalWithBothRPs,
  };
}
