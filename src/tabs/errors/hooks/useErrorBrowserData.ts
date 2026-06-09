import React from 'react';
import { ApiAuthError, garboAuthFetch, throwIfAuthError } from '@/lib/garbo-auth-fetch';
import { Company, CompanyRow, DataPointMetric, WorstCompany, DiscrepancyType, DATA_POINTS } from '../types';
import {
  getStagePipelineCompaniesListUrl,
  getProdPipelineCompaniesListUrl,
  getDataPointValue,
  getDataPointVerified,
  classifyDiscrepancy,
  getUnitErrorFactor,
  companiesToMapById,
  reclassifyDiscrepancyForCategoryError,
  applyCategoryErrorToRows,
  isProdCompanyFullyVerifiedForYear,
  isProdReportingPeriodFullyVerified,
  buildReportingPeriodComparisonSlots,
  pickReportingPeriodsForFilters,
  getPeriodReportYearFromApi,
} from '../lib';
import type { ErrorBrowserSummaryStats } from '../components/SummaryView';

export function useErrorBrowserData(
  selectedDataYear: number,
  selectedReportYear: number | null,
  selectedDataPoint: string,
  selectedTags: string[],
  verifiedOnly: boolean,
) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAuthError, setIsAuthError] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stageCompanies, setStageCompanies] = React.useState<Company[]>([]);
  const [prodCompanies, setProdCompanies] = React.useState<Company[]>([]);

  const fetchPipelineCompanies = React.useCallback(
    async (label: 'Stage' | 'Prod', url: string): Promise<Company[]> => {
      const response = await garboAuthFetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        return response.json() as Promise<Company[]>;
      }

      throwIfAuthError(response.status);

      const body = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch ${label} pipeline companies (${response.status}) from ${url}${body ? `: ${body.slice(0, 200)}` : ''}`,
      );
    },
    [],
  );

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsAuthError(false);

    const stageUrl = getStagePipelineCompaniesListUrl();
    const prodUrl = getProdPipelineCompaniesListUrl();

    try {
      const [stage, prod] = await Promise.all([
        fetchPipelineCompanies('Stage', stageUrl),
        fetchPipelineCompanies('Prod', prodUrl),
      ]);

      setStageCompanies(stage);
      setProdCompanies(prod);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        setIsAuthError(true);
        setStageCompanies([]);
        setProdCompanies([]);
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        if (import.meta.env.DEV) console.error('useErrorBrowserData fetch error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchPipelineCompanies]);

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

  const comparisonRows = React.useMemo((): CompanyRow[] => {
    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);

    const allIds = new Set([...stageMap.keys(), ...prodMap.keys()]);
    const rows: CompanyRow[] = [];

    for (const companyId of allIds) {
      const stageCompany = stageMap.get(companyId);
      const prodCompany = prodMap.get(companyId);

      const name = stageCompany?.name || prodCompany?.name || companyId;
      const tags = Array.from(
        new Set([...(stageCompany?.tags ?? []), ...(prodCompany?.tags ?? [])]),
      );

      const slots = buildReportingPeriodComparisonSlots(
        stageCompany?.reportingPeriods,
        prodCompany?.reportingPeriods,
        selectedDataYear,
        selectedReportYear,
      );

      const slotRows =
        slots.length > 0
          ? slots
          : [
              {
                shellKey: '',
                companyReportId: null,
                reportYear: null,
                stagePeriod: null,
                prodPeriod: null,
              },
            ];

      for (const slot of slotRows) {
        const stageValue = getDataPointValue(
          slot.stagePeriod?.emissions,
          selectedDataPoint,
        );
        const prodValue = getDataPointValue(
          slot.prodPeriod?.emissions,
          selectedDataPoint,
        );

        const discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);
        const diff =
          stageValue !== null && prodValue !== null ? stageValue - prodValue : null;
        const unitErrorFactor = getUnitErrorFactor(stageValue, prodValue);
        const prodVerified = getDataPointVerified(
          slot.prodPeriod?.emissions,
          selectedDataPoint,
        );
        const rowKey = slot.shellKey
          ? `${companyId}:${slot.shellKey}`
          : companyId;

        rows.push({
          rowKey,
          id: companyId,
          wikidataId: stageCompany?.wikidataId ?? prodCompany?.wikidataId ?? null,
          name,
          shellKey: slot.shellKey || undefined,
          reportYear: slot.reportYear,
          companyReportId: slot.companyReportId,
          stageValue,
          prodValue,
          discrepancy,
          diff,
          tags,
          inStage: !!stageCompany,
          inProd: !!prodCompany,
          unitErrorFactor,
          prodVerified,
          prodCompanyVerifiedForYear: isProdReportingPeriodFullyVerified(
            slot.prodPeriod,
          ),
        });
      }
    }

    const currentDP = DATA_POINTS.find((dp) => dp.id === selectedDataPoint);
    if (currentDP) {
      const sameScopeDataPoints = DATA_POINTS.filter(
        (dp) => dp.scope === currentDP.scope && dp.id !== currentDP.id,
      );
      if (sameScopeDataPoints.length > 0) {
        applyCategoryErrorToRows(
          rows,
          stageMap,
          prodMap,
          sameScopeDataPoints,
          selectedDataPoint,
          selectedDataYear,
          selectedReportYear,
        );
      }
    }

    return rows.sort((a, b) => {
      const nameCmp = a.name.localeCompare(b.name);
      if (nameCmp !== 0) return nameCmp;
      return (b.reportYear ?? 0) - (a.reportYear ?? 0);
    });
  }, [tagFilteredCompanies, selectedDataYear, selectedReportYear, selectedDataPoint]);

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
      const periods = pickReportingPeriodsForFilters(
        company.reportingPeriods,
        selectedDataYear,
        selectedReportYear,
      );
      return periods.some(
        (rp) =>
          rp.emissions != null &&
          DATA_POINTS.some((dp) => getDataPointValue(rp.emissions, dp.id) !== null),
      );
    };

    const hasReportingPeriodForYear = (company: Company | undefined): boolean => {
      if (!company) return false;
      return (
        pickReportingPeriodsForFilters(
          company.reportingPeriods,
          selectedDataYear,
          selectedReportYear,
        ).length > 0
      );
    };

    const isFullyVerifiedInProdForYear = (company: Company | undefined): boolean =>
      isProdCompanyFullyVerifiedForYear(company, selectedDataYear, selectedReportYear);

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
  }, [tagFilteredCompanies, selectedDataYear, selectedReportYear]);

  const availableReportYears = React.useMemo(() => {
    const years = new Set<number>();
    const collect = (companies: Company[]) => {
      for (const company of companies) {
        for (const period of company.reportingPeriods ?? []) {
          const y = getPeriodReportYearFromApi(period);
          if (y != null) years.add(y);
        }
      }
    };
    collect(stageCompanies);
    collect(prodCompanies);
    return Array.from(years).sort((a, b) => b - a);
  }, [stageCompanies, prodCompanies]);

  const allDataPointMetrics = React.useMemo((): DataPointMetric[] => {
    if (tagFilteredCompanies.stage.length === 0 || tagFilteredCompanies.prod.length === 0)
      return [];

    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);

    const allIds = Array.from(new Set([...stageMap.keys(), ...prodMap.keys()]));

    return DATA_POINTS.map((dp) => {
      let identical = 0,
        rounding = 0,
        hallucination = 0,
        missing = 0;
      let unitError = 0,
        smallError = 0,
        errorCount = 0,
        categoryError = 0,
        bothNull = 0;

      const sameScopeDataPoints = DATA_POINTS.filter(
        (other) => other.scope === dp.scope && other.id !== dp.id,
      );

      for (const companyId of allIds) {
        const stageCompany = stageMap.get(companyId);
        const prodCompany = prodMap.get(companyId);

        if (!stageCompany || !prodCompany) continue;

        const slots = buildReportingPeriodComparisonSlots(
          stageCompany.reportingPeriods,
          prodCompany.reportingPeriods,
          selectedDataYear,
          selectedReportYear,
        );

        for (const slot of slots) {
          if (!slot.stagePeriod || !slot.prodPeriod) continue;

          const stageValue = getDataPointValue(slot.stagePeriod.emissions, dp.id);
          const prodValue = getDataPointValue(slot.prodPeriod.emissions, dp.id);

          if (verifiedOnly) {
            const isVerified = getDataPointVerified(slot.prodPeriod.emissions, dp.id);
            const isBothNull = stageValue === null && prodValue === null;
            const allowBothNull =
              isBothNull && isProdReportingPeriodFullyVerified(slot.prodPeriod);
            if (!isVerified && !allowBothNull) continue;
          }

          let discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);
          discrepancy = reclassifyDiscrepancyForCategoryError(
            discrepancy,
            stageValue,
            prodValue,
            slot.stagePeriod.emissions,
            slot.prodPeriod.emissions,
            sameScopeDataPoints,
          );

          switch (discrepancy) {
            case 'identical':
              identical++;
              break;
            case 'rounding':
              rounding++;
              break;
            case 'hallucination':
              hallucination++;
              break;
            case 'missing':
              missing++;
              break;
            case 'unit-error':
              unitError++;
              break;
            case 'small-error':
              smallError++;
              break;
            case 'error':
              errorCount++;
              break;
            case 'category-error':
              categoryError++;
              break;
            case 'both-null':
              bothNull++;
              break;
          }
        }
      }

      const withAnyData =
        identical +
        rounding +
        hallucination +
        missing +
        unitError +
        smallError +
        errorCount +
        categoryError;
      const tolerantSuccess = identical + rounding + smallError;
      const tolerantRate = withAnyData > 0 ? (tolerantSuccess / withAnyData) * 100 : 0;

      return {
        id: dp.id,
        label: dp.label,
        tolerantRate,
        tolerantSuccess,
        withAnyData,
        breakdown: {
          identical,
          rounding,
          hallucination,
          missing,
          unitError,
          smallError,
          error: errorCount,
          categoryError,
          bothNull,
        },
      };
    });
  }, [tagFilteredCompanies, selectedDataYear, selectedReportYear, verifiedOnly]);

  const worstCompanies = React.useMemo((): WorstCompany[] => {
    if (tagFilteredCompanies.stage.length === 0 || tagFilteredCompanies.prod.length === 0)
      return [];

    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);

    const allIds = Array.from(new Set([...stageMap.keys(), ...prodMap.keys()]));
    const companyErrors: WorstCompany[] = [];

    for (const companyId of allIds) {
      const stageCompany = stageMap.get(companyId);
      const prodCompany = prodMap.get(companyId);

      if (!stageCompany || !prodCompany) continue;

      const slots = buildReportingPeriodComparisonSlots(
        stageCompany.reportingPeriods,
        prodCompany.reportingPeriods,
        selectedDataYear,
        selectedReportYear,
      );

      const name = stageCompany.name || prodCompany.name || companyId;
      let errorCount = 0;
      let totalDataPoints = 0;
      const breakdown: Record<string, number> = {};
      const errorDataPoints: Array<{ label: string; discrepancy: DiscrepancyType }> = [];

      for (const slot of slots) {
        if (!slot.stagePeriod || !slot.prodPeriod) continue;

        for (const dp of DATA_POINTS) {
          const stageValue = getDataPointValue(slot.stagePeriod.emissions, dp.id);
          const prodValue = getDataPointValue(slot.prodPeriod.emissions, dp.id);

          if (verifiedOnly) {
            const isVerified = getDataPointVerified(slot.prodPeriod.emissions, dp.id);
            const isBothNull = stageValue === null && prodValue === null;
            const allowBothNull =
              isBothNull && isProdReportingPeriodFullyVerified(slot.prodPeriod);
            if (!isVerified && !allowBothNull) continue;
          }

          let discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);
          const sameScopeDataPoints = DATA_POINTS.filter(
            (other) => other.scope === dp.scope && other.id !== dp.id,
          );
          discrepancy = reclassifyDiscrepancyForCategoryError(
            discrepancy,
            stageValue,
            prodValue,
            slot.stagePeriod.emissions,
            slot.prodPeriod.emissions,
            sameScopeDataPoints,
          );

          const isError =
            discrepancy !== 'identical' &&
            discrepancy !== 'rounding' &&
            discrepancy !== 'both-null';
          if (isError) {
            errorCount++;
            breakdown[discrepancy] = (breakdown[discrepancy] || 0) + 1;
            errorDataPoints.push({ label: dp.label, discrepancy });
          }
          if (stageValue !== null || prodValue !== null) totalDataPoints++;
        }
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
  }, [tagFilteredCompanies, selectedDataYear, selectedReportYear, verifiedOnly]);

  const difficultCompanyIds = React.useMemo(() => {
    const ids = new Map<string, number>();
    for (const c of worstCompanies) {
      if (c.errorCount >= 5) ids.set(c.id, c.errorCount);
    }
    return ids;
  }, [worstCompanies]);

  const totalWithBothRPs = React.useMemo(() => {
    const stageMap = companiesToMapById(tagFilteredCompanies.stage);
    const prodMap = companiesToMapById(tagFilteredCompanies.prod);

    let count = 0;
    for (const id of new Set([...stageMap.keys(), ...prodMap.keys()])) {
      const s = stageMap.get(id);
      const p = prodMap.get(id);
      if (!s || !p) continue;

      const slots = buildReportingPeriodComparisonSlots(
        s.reportingPeriods,
        p.reportingPeriods,
        selectedDataYear,
        selectedReportYear,
      );

      for (const slot of slots) {
        if (slot.stagePeriod && slot.prodPeriod) count++;
      }
    }
    return count;
  }, [tagFilteredCompanies, selectedDataYear, selectedReportYear]);

  return {
    isLoading,
    isAuthError,
    error,
    fetchData,
    comparisonRows,
    availableTags,
    availableReportYears,
    summaryStats,
    allDataPointMetrics,
    worstCompanies,
    difficultCompanyIds,
    totalWithBothRPs,
  };
}
