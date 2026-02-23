import React from 'react';
import { Company, CompanyRow, DataPointMetric, WorstCompany, DiscrepancyType, DATA_POINTS } from '../types';
import {
  getStageApiUrl,
  getProdApiUrl,
  pickReportingPeriodForYear,
  getDataPointValue,
  getDataPointVerified,
  classifyDiscrepancy,
  getUnitErrorFactor,
  companiesToMapById,
  reclassifyDiscrepancyForCategoryError,
  applyCategoryErrorToRows,
} from '../lib';

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
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      if (import.meta.env.DEV) console.error('useErrorBrowserData fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, []);

  // Build comparison rows for selected data point
  const comparisonRows = React.useMemo((): CompanyRow[] => {
    const stageMap = companiesToMapById(stageCompanies);
    const prodMap = companiesToMapById(prodCompanies);

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
      const unitErrorFactor = getUnitErrorFactor(stageValue, prodValue);
      const prodVerified = getDataPointVerified(prodRP?.emissions, selectedDataPoint);

      rows.push({
        wikidataId, name, stageValue, prodValue, discrepancy, diff,
        inStage: !!stageCompany, inProd: !!prodCompany, unitErrorFactor, prodVerified,
      });
    }

    const currentDP = DATA_POINTS.find(dp => dp.id === selectedDataPoint);
    if (currentDP) {
      const sameScopeDataPoints = DATA_POINTS.filter(
        dp => dp.scope === currentDP.scope && dp.id !== currentDP.id
      );
      if (sameScopeDataPoints.length > 0) {
        applyCategoryErrorToRows(rows, stageMap, prodMap, sameScopeDataPoints, selectedDataPoint, selectedYear);
      }
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [stageCompanies, prodCompanies, selectedYear, selectedDataPoint]);

  // Calculate metrics for ALL data points (for overview)
  const allDataPointMetrics = React.useMemo((): DataPointMetric[] => {
    if (stageCompanies.length === 0 || prodCompanies.length === 0) return [];

    const stageMap = companiesToMapById(stageCompanies);
    const prodMap = companiesToMapById(prodCompanies);

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
        discrepancy = reclassifyDiscrepancyForCategoryError(
          discrepancy,
          stageValue,
          prodValue,
          stageRP?.emissions,
          prodRP?.emissions,
          sameScopeDataPoints
        );

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

    const stageMap = companiesToMapById(stageCompanies);
    const prodMap = companiesToMapById(prodCompanies);

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
        const sameScopeDataPoints = DATA_POINTS.filter(
          other => other.scope === dp.scope && other.id !== dp.id
        );
        discrepancy = reclassifyDiscrepancyForCategoryError(
          discrepancy,
          stageValue,
          prodValue,
          stageRP.emissions,
          prodRP.emissions,
          sameScopeDataPoints
        );

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
    const stageMap = companiesToMapById(stageCompanies);
    const prodMap = companiesToMapById(prodCompanies);

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
