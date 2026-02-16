import type { CompanyRow, DataPointMetric } from './types';

export interface PerformanceMetricRow {
  label: string;
  success: number;
  total: number;
  rate: number;
  excludes: string;
}

/** Build performance metrics from comparison rows for the browser view. */
export function computePerformanceMetrics(comparisonRows: CompanyRow[]): {
  totalCompanies: number;
  withAnyData: number;
  exactMatch: PerformanceMetricRow;
  tolerant: PerformanceMetricRow;
  zeroInclusive: PerformanceMetricRow;
} | null {
  const bothExist = comparisonRows.filter((r) => r.inStage && r.inProd);
  if (bothExist.length === 0) return null;

  const identical = bothExist.filter((r) => r.discrepancy === 'identical').length;
  const rounding = bothExist.filter((r) => r.discrepancy === 'rounding').length;
  const bothNull = bothExist.filter((r) => r.discrepancy === 'both-null').length;
  const hallucination = bothExist.filter((r) => r.discrepancy === 'hallucination').length;
  const missing = bothExist.filter((r) => r.discrepancy === 'missing').length;
  const unitError = bothExist.filter((r) => r.discrepancy === 'unit-error').length;
  const smallError = bothExist.filter((r) => r.discrepancy === 'small-error').length;
  const errorCount = bothExist.filter((r) => r.discrepancy === 'error').length;
  const categoryError = bothExist.filter((r) => r.discrepancy === 'category-error').length;

  const totalCompanies = bothExist.length;
  const withAnyData =
    identical +
    rounding +
    hallucination +
    missing +
    unitError +
    smallError +
    errorCount +
    categoryError;

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
      rate:
        totalCompanies > 0
          ? ((identical + rounding + bothNull) / totalCompanies) * 100
          : 0,
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
export function calculateOverviewAggregates(
  metrics: DataPointMetric[]
): OverviewAggregates {
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
    exactMatch:
      totals.withAnyData > 0 ? (totals.identical / totals.withAnyData) * 100 : 0,
    tolerant:
      totals.withAnyData > 0
        ? ((totals.identical + totals.rounding) / totals.withAnyData) * 100
        : 0,
    approximate:
      totals.withAnyData > 0
        ? ((totals.identical + totals.rounding + totals.smallError) /
            totals.withAnyData) *
          100
        : 0,
    zeroInclusive:
      totals.totalCompanies > 0
        ? ((totals.identical + totals.rounding + totals.bothNull) /
            totals.totalCompanies) *
          100
        : 0,
    totals,
  };
}
