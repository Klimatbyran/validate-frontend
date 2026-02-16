import { getPublicApiUrl } from '@/lib/utils';
import {
  DiscrepancyType,
  ReportingPeriod,
  DATA_POINTS,
  GENERIC_DATA_POINTS,
  type Company,
  type CompanyRow,
  type DataPointMetric,
} from './types';

export interface PerformanceMetricRow {
  label: string;
  success: number;
  total: number;
  rate: number;
  excludes: string;
}

// Emission values can be either a plain number or an object with { total: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTotal(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'total' in value) {
    const total = value.total;
    return typeof total === 'number' ? total : null;
  }
  return null;
}

// Get API URLs based on environment
export function getStageApiUrl(): string {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return '/stagekkapi/api/companies';
  }
  return 'https://stage-api.klimatkollen.se/api/companies';
}

export function getProdApiUrl(): string {
  return getPublicApiUrl('/api/companies');
}

// Pick the reporting period for a given year
export function pickReportingPeriodForYear(reportingPeriods: ReportingPeriod[] | undefined, year: number): ReportingPeriod | null {
  if (!reportingPeriods || reportingPeriods.length === 0) return null;

  const periodsForYear = reportingPeriods.filter(rp => {
    const endDate = new Date(rp.endDate);
    return endDate.getFullYear() === year;
  });

  if (periodsForYear.length === 0) return null;

  const fullYear = periodsForYear.find(rp => {
    const start = new Date(rp.startDate);
    const end = new Date(rp.endDate);
    return start.getMonth() === 0 && start.getDate() === 1 &&
           end.getMonth() === 11 && end.getDate() === 31;
  });

  return fullYear || periodsForYear[periodsForYear.length - 1];
}

/** Build a map of companies by wikidataId for quick lookup. */
export function companiesToMapById(companies: Company[]): Map<string, Company> {
  const map = new Map<string, Company>();
  companies.forEach(c => map.set(c.wikidataId, c));
  return map;
}

/** Same-scope data point descriptor for category-error detection. */
interface SameScopeDataPoint {
  id: string;
  label: string;
}

/**
 * Reclassify discrepancy to 'category-error' when stage/prod value appears in another same-scope data point.
 * Used by overview and worst-companies metrics (no row mutation).
 */
export function reclassifyDiscrepancyForCategoryError(
  discrepancy: DiscrepancyType,
  stageValue: number | null,
  prodValue: number | null,
  stageEmissions: ReportingPeriod['emissions'] | null | undefined,
  prodEmissions: ReportingPeriod['emissions'] | null | undefined,
  sameScopeDataPoints: SameScopeDataPoint[]
): DiscrepancyType {
  if (discrepancy === 'identical' || discrepancy === 'rounding' || discrepancy === 'both-null' || sameScopeDataPoints.length === 0) {
    return discrepancy;
  }
  if ((discrepancy === 'error' || discrepancy === 'small-error' || discrepancy === 'hallucination') && stageValue !== null) {
    for (const otherDP of sameScopeDataPoints) {
      const otherProdValue = getDataPointValue(prodEmissions, otherDP.id);
      if (otherProdValue !== null && Math.abs(stageValue - otherProdValue) <= 0.5) {
        return 'category-error';
      }
    }
  }
  if (discrepancy === 'missing' && prodValue !== null) {
    for (const otherDP of sameScopeDataPoints) {
      const otherStageValue = getDataPointValue(stageEmissions, otherDP.id);
      if (otherStageValue !== null && Math.abs(prodValue - otherStageValue) <= 0.5) {
        return 'category-error';
      }
    }
  }
  return discrepancy;
}

/**
 * Mutate comparison rows to set category-error, matchedDataPoint, and categoryErrorKind where applicable.
 * Used when building comparison rows for the selected data point.
 */
export function applyCategoryErrorToRows(
  rows: CompanyRow[],
  stageMap: Map<string, Company>,
  prodMap: Map<string, Company>,
  sameScopeDataPoints: SameScopeDataPoint[],
  selectedDataPoint: string,
  selectedYear: number
): void {
  for (const row of rows) {
    if (row.discrepancy === 'identical' || row.discrepancy === 'rounding' || row.discrepancy === 'both-null') continue;

    const stageCompany = stageMap.get(row.wikidataId);
    const prodCompany = prodMap.get(row.wikidataId);

    if ((row.discrepancy === 'error' || row.discrepancy === 'small-error' || row.discrepancy === 'hallucination') && row.stageValue !== null && prodCompany) {
      const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear);
      const stageRPForKind = stageCompany ? pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear) : null;
      for (const otherDP of sameScopeDataPoints) {
        const otherProdValue = getDataPointValue(prodRP?.emissions, otherDP.id);
        if (otherProdValue !== null && Math.abs(row.stageValue! - otherProdValue) <= 0.5) {
          row.discrepancy = 'category-error';
          row.matchedDataPoint = otherDP.label;
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

// Get value for a specific scope 3 category
export function getCategoryValue(scope3: ReportingPeriod['emissions']['scope3'] | null | undefined, categoryNum: number): number | null {
  if (!scope3?.categories) return null;
  const cat = scope3.categories.find(c => c.category === categoryNum);
  return cat?.total ?? null;
}

// Get value for a data point from emissions
export function getDataPointValue(emissions: ReportingPeriod['emissions'] | null | undefined, dataPointId: string): number | null {
  if (!emissions) return null;

  if (dataPointId === 'scope1-total') return emissions.scope1?.total ?? null;
  if (dataPointId === 'scope2-mb') return emissions.scope2?.mb ?? null;
  if (dataPointId === 'scope2-lb') return emissions.scope2?.lb ?? null;
  if (dataPointId === 'scope2-unknown') return emissions.scope2?.unknown ?? null;

  if (dataPointId === 'stated-total') return extractTotal(emissions.statedTotalEmissions);
  if (dataPointId === 'calculated-total') return extractTotal(emissions.calculatedTotalEmissions);

  const scope3 = emissions.scope3;
  if (!scope3) return null;

  if (dataPointId === 'scope3-stated-total') return extractTotal(scope3.statedTotalEmissions);
  if (dataPointId === 'scope3-calculated-total') return extractTotal(scope3.calculatedTotalEmissions);

  const dataPoint = DATA_POINTS.find(dp => dp.id === dataPointId);
  if (dataPoint?.category) return getCategoryValue(scope3, dataPoint.category);

  return null;
}

// Classify discrepancy between stage and prod values
export function classifyDiscrepancy(
  stageValue: number | null,
  prodValue: number | null,
  roundingThreshold: number
): DiscrepancyType {
  const stageHasValue = stageValue !== null && stageValue !== undefined;
  const prodHasValue = prodValue !== null && prodValue !== undefined;

  if (!stageHasValue && !prodHasValue) return 'both-null';
  if (stageHasValue && !prodHasValue) return 'hallucination';
  if (!stageHasValue && prodHasValue) return 'missing';

  const diff = Math.abs(stageValue! - prodValue!);
  if (diff === 0) return 'identical';
  if (diff <= roundingThreshold) return 'rounding';

  // Unit error: values differ by a power of 10
  const absStage = Math.abs(stageValue!);
  const absProd = Math.abs(prodValue!);
  if (absStage > 0 && absProd > 0) {
    const ratio = Math.max(absStage, absProd) / Math.min(absStage, absProd);
    for (const power of [10, 100, 1000, 10000, 100000, 1000000]) {
      if (Math.abs(ratio - power) / power <= 0.05) return 'unit-error';
    }
  }

  // Small error: within 5% of the prod (ground truth) value
  const reference = Math.abs(prodValue!);
  if (reference > 0 && (diff / reference) <= 0.05) return 'small-error';

  return 'error';
}

export function formatValue(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('sv-SE');
}

/** Build performance metrics from comparison rows for the browser view. */
export function computePerformanceMetrics(comparisonRows: CompanyRow[]): {
  totalCompanies: number;
  withAnyData: number;
  exactMatch: PerformanceMetricRow;
  tolerant: PerformanceMetricRow;
  zeroInclusive: PerformanceMetricRow;
} | null {
  const bothExist = comparisonRows.filter(r => r.inStage && r.inProd);
  if (bothExist.length === 0) return null;

  const identical = bothExist.filter(r => r.discrepancy === 'identical').length;
  const rounding = bothExist.filter(r => r.discrepancy === 'rounding').length;
  const bothNull = bothExist.filter(r => r.discrepancy === 'both-null').length;
  const hallucination = bothExist.filter(r => r.discrepancy === 'hallucination').length;
  const missing = bothExist.filter(r => r.discrepancy === 'missing').length;
  const unitError = bothExist.filter(r => r.discrepancy === 'unit-error').length;
  const smallError = bothExist.filter(r => r.discrepancy === 'small-error').length;
  const errorCount = bothExist.filter(r => r.discrepancy === 'error').length;
  const categoryError = bothExist.filter(r => r.discrepancy === 'category-error').length;

  const totalCompanies = bothExist.length;
  const withAnyData = identical + rounding + hallucination + missing + unitError + smallError + errorCount + categoryError;

  return {
    totalCompanies,
    withAnyData,
    exactMatch: {
      success: identical,
      total: withAnyData,
      rate: withAnyData > 0 ? (identical / withAnyData) * 100 : 0,
      label: 'Exact Match',
      excludes: 'Nothing',
    },
    tolerant: {
      success: identical + rounding,
      total: withAnyData,
      rate: withAnyData > 0 ? ((identical + rounding) / withAnyData) * 100 : 0,
      label: 'Precision-Tolerant',
      excludes: 'Rounding (≤0.5)',
    },
    zeroInclusive: {
      success: identical + rounding + bothNull,
      total: totalCompanies,
      rate: totalCompanies > 0 ? ((identical + rounding + bothNull) / totalCompanies) * 100 : 0,
      label: 'Zero-Inclusive',
      excludes: 'Rounding + both empty is correct',
    },
  };
}

/** Aggregate totals and rates for a set of data point metrics (overview). */
export interface OverviewAggregates {
  exactMatch: number;
  tolerant: number;
  approximate: number;
  zeroInclusive: number;
  totals: {
    identical: number;
    rounding: number;
    hallucination: number;
    missing: number;
    unitError: number;
    smallError: number;
    error: number;
    categoryError: number;
    bothNull: number;
    withAnyData: number;
    totalCompanies: number;
  };
}

/** Compute aggregate rates and totals for overview scope sections. */
export function calculateOverviewAggregates(metrics: DataPointMetric[]): OverviewAggregates {
  const totals = metrics.reduce(
    (acc, dp) => {
      acc.identical += dp.breakdown.identical;
      acc.rounding += dp.breakdown.rounding;
      acc.hallucination += dp.breakdown.hallucination;
      acc.missing += dp.breakdown.missing;
      acc.unitError += dp.breakdown.unitError;
      acc.smallError += dp.breakdown.smallError;
      acc.error += dp.breakdown.error;
      acc.categoryError += dp.breakdown.categoryError;
      acc.bothNull += dp.breakdown.bothNull;
      acc.withAnyData += dp.withAnyData;
      acc.totalCompanies +=
        dp.breakdown.identical +
        dp.breakdown.rounding +
        dp.breakdown.hallucination +
        dp.breakdown.missing +
        dp.breakdown.unitError +
        dp.breakdown.smallError +
        dp.breakdown.error +
        dp.breakdown.categoryError +
        dp.breakdown.bothNull;
      return acc;
    },
    {
      identical: 0,
      rounding: 0,
      hallucination: 0,
      missing: 0,
      unitError: 0,
      smallError: 0,
      error: 0,
      categoryError: 0,
      bothNull: 0,
      withAnyData: 0,
      totalCompanies: 0,
    }
  );

  return {
    exactMatch: totals.withAnyData > 0 ? (totals.identical / totals.withAnyData) * 100 : 0,
    tolerant: totals.withAnyData > 0 ? ((totals.identical + totals.rounding) / totals.withAnyData) * 100 : 0,
    approximate:
      totals.withAnyData > 0
        ? ((totals.identical + totals.rounding + totals.smallError) / totals.withAnyData) * 100
        : 0,
    zeroInclusive:
      totals.totalCompanies > 0
        ? ((totals.identical + totals.rounding + totals.bothNull) / totals.totalCompanies) * 100
        : 0,
    totals,
  };
}

/** Trigger CSV download for overview metrics. */
export function exportOverviewCsv(metrics: DataPointMetric[], selectedYear: number): void {
  const headers = [
    'Data Point',
    'Identical',
    'Rounding',
    'Small Error',
    'Hallucination',
    'Missing',
    'Unit Error',
    'Category Error',
    'Error',
    'Both Empty',
    'With Data',
    'Tolerant Rate %',
  ];
  const csvRows = [headers.join(',')];

  for (const dp of metrics) {
    csvRows.push(
      [
        `"${dp.label}"`,
        dp.breakdown.identical,
        dp.breakdown.rounding,
        dp.breakdown.smallError,
        dp.breakdown.hallucination,
        dp.breakdown.missing,
        dp.breakdown.unitError,
        dp.breakdown.categoryError,
        dp.breakdown.error,
        dp.breakdown.bothNull,
        dp.withAnyData,
        dp.tolerantRate.toFixed(1),
      ].join(',')
    );
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `overview-${selectedYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Trigger CSV download for comparison rows. */
export function exportComparisonToCsv(
  rows: CompanyRow[],
  dataPointId: string,
  year: number
): void {
  const headers = ['Company', 'WikidataId', 'Stage', 'Prod', 'Diff', 'Status', 'In Stage', 'In Prod'];
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    csvRows.push(
      [
        `"${row.name.replace(/"/g, '""')}"`,
        row.wikidataId,
        row.stageValue ?? '',
        row.prodValue ?? '',
        row.diff ?? '',
        row.discrepancy,
        row.inStage ? 'yes' : 'no',
        row.inProd ? 'yes' : 'no',
      ].join(',')
    );
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dataPointId}-comparison-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
