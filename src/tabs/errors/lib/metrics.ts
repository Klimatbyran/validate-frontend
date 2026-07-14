import type { CompanyRow, DataPointMetric } from "../types";

export interface PerformanceMetricRow {
  /** Translation key for the metric name (e.g. errors.metrics.exactMatch). */
  labelKey: string;
  success: number;
  total: number;
  rate: number;
  /** Translation key for the notes/excludes text (e.g. errors.metrics.notes.nothing). */
  excludesKey: string;
}

/** Build performance metrics from comparison rows for the browser view. */
export function computePerformanceMetrics(
  comparisonRows: CompanyRow[],
  opts?: { verifiedOnly?: boolean },
): {
  totalCompanies: number;
  withAnyData: number;
  exactMatch: PerformanceMetricRow;
  tolerant: PerformanceMetricRow;
  zeroInclusive: PerformanceMetricRow;
} | null {
  const verifiedOnly = Boolean(opts?.verifiedOnly);
  const bothExist = comparisonRows.filter((r) => r.inStage && r.inProd);
  const rows = verifiedOnly
    ? bothExist.filter((r) => r.prodVerified)
    : bothExist;
  const zeroInclusiveRows = verifiedOnly
    ? bothExist.filter(
        (r) =>
          r.prodVerified ||
          (r.discrepancy === "both-null" && r.prodCompanyVerifiedForYear),
      )
    : bothExist;
  if (rows.length === 0) return null;

  const identical = rows.filter((r) => r.discrepancy === "identical").length;
  const rounding = rows.filter((r) => r.discrepancy === "rounding").length;
  const bothNull = zeroInclusiveRows.filter(
    (r) => r.discrepancy === "both-null",
  ).length;
  const hallucination = rows.filter(
    (r) => r.discrepancy === "hallucination",
  ).length;
  const missing = rows.filter((r) => r.discrepancy === "missing").length;
  const unitError = rows.filter((r) => r.discrepancy === "unit-error").length;
  const smallError = rows.filter((r) => r.discrepancy === "small-error").length;
  const errorCount = rows.filter((r) => r.discrepancy === "error").length;
  const categoryError = rows.filter(
    (r) => r.discrepancy === "category-error",
  ).length;

  const totalCompanies = rows.length;
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
      labelKey: "errors.metrics.exactMatch",
      excludesKey: "errors.metrics.notes.nothing",
    },
    tolerant: {
      success: identical + rounding,
      total: withAnyData,
      rate: withAnyData > 0 ? ((identical + rounding) / withAnyData) * 100 : 0,
      labelKey: "errors.metrics.precisionTolerant",
      excludesKey: "errors.metrics.notes.rounding",
    },
    zeroInclusive: {
      success: identical + rounding + bothNull,
      total: zeroInclusiveRows.length,
      rate:
        zeroInclusiveRows.length > 0
          ? ((identical + rounding + bothNull) / zeroInclusiveRows.length) * 100
          : 0,
      labelKey: "errors.metrics.zeroInclusive",
      excludesKey: "errors.metrics.notes.zeroInclusive",
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
    reportAbsent: number;
    reportExtra: number;
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
  metrics: DataPointMetric[],
): OverviewAggregates {
  const totals = metrics.reduce(
    (acc, dp) => {
      acc.identical += dp.breakdown.identical;
      acc.rounding += dp.breakdown.rounding;
      acc.hallucination += dp.breakdown.hallucination;
      acc.missing += dp.breakdown.missing;
      acc.reportAbsent += dp.breakdown.reportAbsent;
      acc.reportExtra += dp.breakdown.reportExtra;
      acc.unitError += dp.breakdown.unitError;
      acc.smallError += dp.breakdown.smallError;
      acc.error += dp.breakdown.error;
      acc.categoryError += dp.breakdown.categoryError;
      acc.bothNull += dp.breakdown.bothNull;
      acc.withAnyData += dp.withAnyData;
      // Sum of (company × data point) slots, not unique companies — same company can appear in multiple data points
      acc.totalCompanies +=
        dp.breakdown.identical +
        dp.breakdown.rounding +
        dp.breakdown.hallucination +
        dp.breakdown.missing +
        dp.breakdown.reportAbsent +
        dp.breakdown.reportExtra +
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
      reportAbsent: 0,
      reportExtra: 0,
      unitError: 0,
      smallError: 0,
      error: 0,
      categoryError: 0,
      bothNull: 0,
      withAnyData: 0,
      totalCompanies: 0,
    },
  );

  return {
    exactMatch:
      totals.withAnyData > 0
        ? (totals.identical / totals.withAnyData) * 100
        : 0,
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
