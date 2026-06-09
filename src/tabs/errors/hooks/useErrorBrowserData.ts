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
  buildProdCompanyVerifiedForYearMap,
  isProdCompanyFullyVerifiedForYear,
} from '../lib';
import type { ErrorBrowserSummaryStats } from '../components/SummaryView';

export function useErrorBrowserData(
  selectedYear: number,
  selectedDataPoint: string,
  selectedTags: string[],
  verifiedOnly: boolean
) {
  const prodCompanyVerifiedForYearMap = React.useCallback(
    (prodMap: Map<string, Company>, ids: Iterable<string>) =>
      buildProdCompanyVerifiedForYearMap(prodMap, ids, selectedYear),
    [selectedYear]
  );

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stageCompanies, setStageCompanies] = React.useState<Company[]>([]);
  const [prodCompanies, setProdCompanies] = React.useState<Company[]>([]);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [stageResponse, prodResponse] = await Promise.all([
        // Intentionally avoid custom request headers here. Adding non-simple headers
        // can trigger CORS preflight, which makes stage/prod comparisons flaky.
        fetch(getStageApiUrl()),
        fetch(getProdApiUrl()),
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
  }, [fetchData]);

  const tagFilteredCompanies = React.useMemo(() => {
    if (!selectedTags.length) {
      return { stage: stageCompanies, prod: prodCompanies };
    }

    const idsWithSelectedTag = new Set<string>();
    const matches = (tags?: string[]) =>
      (tags ?? []).some((t) => selectedTags.includes(t));

    stageCompanies.forEach((c) => {
      if (matches(c.tags)) idsWithSelectedTag.add(c.id);
    });
    prodCompanies.forEach((c) => {
      if (matches(c.tags)) idsWithSelectedTag.add(c.id);
    });

    return {
      stage: stageCompanies.filter((c) => idsWithSelectedTag.has(c.id)),
      prod: prodCompanies.filter((c) => idsWithSelectedTag.has(c.id)),
    };
  }, [stageCompanies, prodCompanies, selectedTags]);

  // Build comparison rows for selected data point
  const comparisonRows = React.useMemo((): CompanyRow[] => {
    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);

    const allIds = new Set([...stageMap.keys(), ...prodMap.keys()]);
    const rows: CompanyRow[] = [];

    const prodCompanyVerifiedForYear = prodCompanyVerifiedForYearMap(prodMap, allIds);

    for (const companyId of allIds) {
      const stageCompany = stageMap.get(companyId);
      const prodCompany = prodMap.get(companyId);

      const name = stageCompany?.name || prodCompany?.name || companyId;
      const tags = Array.from(
        new Set([...(stageCompany?.tags ?? []), ...(prodCompany?.tags ?? [])])
      );

      const stageRP = stageCompany ? pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear) : null;
      const prodRP = prodCompany ? pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear) : null;

      const stageValue = getDataPointValue(stageRP?.emissions, selectedDataPoint);
      const prodValue = getDataPointValue(prodRP?.emissions, selectedDataPoint);

      const discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);
      const diff = stageValue !== null && prodValue !== null ? stageValue - prodValue : null;
      const unitErrorFactor = getUnitErrorFactor(stageValue, prodValue);
      const prodVerified = getDataPointVerified(prodRP?.emissions, selectedDataPoint);

      rows.push({
        id: companyId,
        wikidataId: stageCompany?.wikidataId ?? prodCompany?.wikidataId ?? null,
        name,
        stageValue,
        prodValue,
        discrepancy,
        diff,
        tags,
        inStage: !!stageCompany,
        inProd: !!prodCompany,
        unitErrorFactor,
        prodVerified,
        prodCompanyVerifiedForYear: prodCompanyVerifiedForYear.get(companyId) ?? false,
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
  }, [tagFilteredCompanies, selectedYear, selectedDataPoint, prodCompanyVerifiedForYearMap]);

  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    stageCompanies.forEach((c) => (c.tags ?? []).forEach((t) => tags.add(t)));
    prodCompanies.forEach((c) => (c.tags ?? []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [stageCompanies, prodCompanies]);

  const summaryStats = React.useMemo((): ErrorBrowserSummaryStats => {
    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);
    const allIds = Array.from(new Set([...stageMap.keys(), ...prodMap.keys()]));

    let companiesInBothForYear = 0;
    let companiesStageOnlyForYear = 0;
    let companiesProdOnlyForYear = 0;
    let companiesNeitherForYear = 0;
    let companiesWithAnyEmissions = 0;
    let companiesWithNoEmissions = 0;
    let companiesWithNoReportingPeriods = 0;
    let companiesWithReportingPeriodForYear = 0;
    let companiesFullyVerifiedInProd = 0;

    const hasAnyReportingPeriods = (company: Company | undefined): boolean => {
      return !!company && Array.isArray(company.reportingPeriods) && company.reportingPeriods.length > 0;
    };

    const hasAnyValueForYear = (company: Company | undefined): boolean => {
      if (!company) return false;
      const rp = pickReportingPeriodForYear(company.reportingPeriods, selectedYear);
      if (!rp?.emissions) return false;
      return DATA_POINTS.some((dp) => getDataPointValue(rp.emissions, dp.id) !== null);
    };

    const hasReportingPeriodForYear = (company: Company | undefined): boolean => {
      if (!company) return false;
      return pickReportingPeriodForYear(company.reportingPeriods, selectedYear) != null;
    };

    const isFullyVerifiedInProdForYear = (company: Company | undefined): boolean =>
      isProdCompanyFullyVerifiedForYear(company, selectedYear);

    for (const id of allIds) {
      const s = stageMap.get(id);
      const p = prodMap.get(id);

      const hasAnyRP = hasAnyReportingPeriods(s) || hasAnyReportingPeriods(p);
      if (!hasAnyRP) companiesWithNoReportingPeriods++;

      const hasYearRP = hasReportingPeriodForYear(s) || hasReportingPeriodForYear(p);
      if (hasYearRP) companiesWithReportingPeriodForYear++;

      const hasStageYear = hasReportingPeriodForYear(s);
      const hasProdYear = hasReportingPeriodForYear(p);
      if (hasStageYear && hasProdYear) companiesInBothForYear++;
      else if (hasStageYear) companiesStageOnlyForYear++;
      else if (hasProdYear) companiesProdOnlyForYear++;
      else companiesNeitherForYear++;

      const hasAny = hasAnyValueForYear(s) || hasAnyValueForYear(p);
      if (hasAny) companiesWithAnyEmissions++;
      else companiesWithNoEmissions++;

      if (isFullyVerifiedInProdForYear(p)) companiesFullyVerifiedInProd++;
    }

    return {
      totalCompanies: allIds.length,
      companiesInBothForYear,
      companiesStageOnlyForYear,
      companiesProdOnlyForYear,
      companiesNeitherForYear,
      companiesWithAnyEmissions,
      companiesWithNoEmissions,
      companiesWithNoReportingPeriods,
      companiesWithReportingPeriodForYear,
      companiesFullyVerifiedInProd,
    };
  }, [tagFilteredCompanies, selectedYear]);

  // Calculate metrics for ALL data points (for overview)
  const allDataPointMetrics = React.useMemo((): DataPointMetric[] => {
    if (tagFilteredCompanies.stage.length === 0 || tagFilteredCompanies.prod.length === 0)
      return [];

    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);

    const allIds = Array.from(new Set([...stageMap.keys(), ...prodMap.keys()]));

    const prodCompanyVerifiedForYear = prodCompanyVerifiedForYearMap(prodMap, allIds);

    return DATA_POINTS.map(dp => {
      let identical = 0, rounding = 0, hallucination = 0, missing = 0;
      let unitError = 0, smallError = 0, errorCount = 0, categoryError = 0, bothNull = 0;

      const sameScopeDataPoints = DATA_POINTS.filter(
        other => other.scope === dp.scope && other.id !== dp.id
      );

      for (const companyId of allIds) {
        const stageCompany = stageMap.get(companyId);
        const prodCompany = prodMap.get(companyId);

        if (!stageCompany || !prodCompany) continue;

        const stageRP = pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear);
        const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear);

        if (!stageRP || !prodRP) continue;

        const stageValue = getDataPointValue(stageRP?.emissions, dp.id);
        const prodValue = getDataPointValue(prodRP?.emissions, dp.id);

        if (verifiedOnly) {
          const isVerified = getDataPointVerified(prodRP.emissions, dp.id);
          const isBothNull = stageValue === null && prodValue === null;
          const allowBothNull =
            isBothNull && (prodCompanyVerifiedForYear.get(companyId) ?? false);
          if (!isVerified && !allowBothNull) continue;
        }

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
  }, [tagFilteredCompanies, selectedYear, verifiedOnly, prodCompanyVerifiedForYearMap]);

  // Worst companies: count errors across ALL data points
  const worstCompanies = React.useMemo((): WorstCompany[] => {
    if (tagFilteredCompanies.stage.length === 0 || tagFilteredCompanies.prod.length === 0)
      return [];

    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);

    const allIds = Array.from(new Set([...stageMap.keys(), ...prodMap.keys()]));
    const companyErrors: WorstCompany[] = [];

    const prodCompanyVerifiedForYear = prodCompanyVerifiedForYearMap(prodMap, allIds);

    for (const companyId of allIds) {
      const stageCompany = stageMap.get(companyId);
      const prodCompany = prodMap.get(companyId);

      if (!stageCompany || !prodCompany) continue;

      const stageRP = pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear);
      const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear);

      if (!stageRP || !prodRP) continue;

      const name = stageCompany.name || prodCompany.name || companyId;
      let errorCount = 0;
      let totalDataPoints = 0;
      const breakdown: Record<string, number> = {};
      const errorDataPoints: Array<{ label: string; discrepancy: DiscrepancyType }> = [];

      for (const dp of DATA_POINTS) {
        const stageValue = getDataPointValue(stageRP.emissions, dp.id);
        const prodValue = getDataPointValue(prodRP.emissions, dp.id);

        if (verifiedOnly) {
          const isVerified = getDataPointVerified(prodRP.emissions, dp.id);
          const isBothNull = stageValue === null && prodValue === null;
          const allowBothNull =
            isBothNull && (prodCompanyVerifiedForYear.get(companyId) ?? false);
          if (!isVerified && !allowBothNull) continue;
        }

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
        // Keep denominator aligned with the same filter: count eligible non-null comparisons
        if (stageValue !== null || prodValue !== null) totalDataPoints++;
      }

      if (errorCount > 0) {
        companyErrors.push({
          id: companyId,
          wikidataId: stageCompany.wikidataId ?? prodCompany.wikidataId ?? null,
          name,
          errorCount,
          totalDataPoints,
          breakdown,
          errorDataPoints,
        });
      }
    }

    return companyErrors.sort((a, b) => b.errorCount - a.errorCount);
  }, [tagFilteredCompanies, selectedYear, verifiedOnly, prodCompanyVerifiedForYearMap]);

  // Set of difficult company IDs (>=5 errors)
  const difficultCompanyIds = React.useMemo(() => {
    const ids = new Map<string, number>();
    for (const c of worstCompanies) {
      if (c.errorCount >= 5) ids.set(c.id, c.errorCount);
    }
    return ids;
  }, [worstCompanies]);

  // Total companies with reporting periods in both APIs (for histogram)
  const totalWithBothRPs = React.useMemo(() => {
    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);

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
  }, [tagFilteredCompanies, selectedYear]);

  return {
    isLoading,
    error,
    fetchData,
    comparisonRows,
    availableTags,
    summaryStats,
    allDataPointMetrics,
    worstCompanies,
    difficultCompanyIds,
    totalWithBothRPs,
  };
}
