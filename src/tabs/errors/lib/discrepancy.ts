import {
  DiscrepancyType,
  GENERIC_DATA_POINTS,
  type Company,
  type CompanyRow,
  type ReportingPeriod,
} from '../types';
import { getDataPointValue, pickReportingPeriodForYear } from './emissions';

/** Build a map of companies by wikidataId for quick lookup. */
export function companiesToMapById(companies: Company[]): Map<string, Company> {
  const map = new Map<string, Company>();
  companies.forEach((c) => map.set(c.wikidataId, c));
  return map;
}

const UNIT_ERROR_POWERS = [10, 100, 1000, 10000, 100000, 1000000] as const;

/** Return unit-error factor (stage/prod ratio) when values differ by a power of 10; otherwise undefined. */
export function getUnitErrorFactor(
  stageValue: number | null,
  prodValue: number | null
): number | undefined {
  if (stageValue === null || prodValue === null) return undefined;
  const absS = Math.abs(stageValue);
  const absP = Math.abs(prodValue);
  if (absS === 0 || absP === 0) return undefined;
  const ratio = Math.max(absS, absP) / Math.min(absS, absP);
  for (const power of UNIT_ERROR_POWERS) {
    if (Math.abs(ratio - power) / power <= 0.05) {
      return absS > absP ? power : 1 / power;
    }
  }
  return undefined;
}

/** Same-scope data point descriptor for category-error detection. */
export interface SameScopeDataPoint {
  id: string;
  label: string;
}

/** Classify discrepancy between stage and prod values. */
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

  if (getUnitErrorFactor(stageValue, prodValue) !== undefined) return 'unit-error';

  const reference = Math.abs(prodValue!);
  if (reference > 0 && (diff / reference) <= 0.05) return 'small-error';

  return 'error';
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
  if (
    discrepancy === 'identical' ||
    discrepancy === 'rounding' ||
    discrepancy === 'both-null' ||
    sameScopeDataPoints.length === 0
  ) {
    return discrepancy;
  }
  if (
    (discrepancy === 'error' ||
      discrepancy === 'small-error' ||
      discrepancy === 'hallucination') &&
    stageValue !== null
  ) {
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
    if (
      row.discrepancy === 'identical' ||
      row.discrepancy === 'rounding' ||
      row.discrepancy === 'both-null'
    )
      continue;

    const stageCompany = stageMap.get(row.wikidataId);
    const prodCompany = prodMap.get(row.wikidataId);

    if (
      (row.discrepancy === 'error' ||
        row.discrepancy === 'small-error' ||
        row.discrepancy === 'hallucination') &&
      row.stageValue !== null &&
      prodCompany
    ) {
      const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear);
      const stageRPForKind = stageCompany
        ? pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear)
        : null;
      for (const otherDP of sameScopeDataPoints) {
        const otherProdValue = getDataPointValue(prodRP?.emissions, otherDP.id);
        if (otherProdValue !== null && Math.abs(row.stageValue! - otherProdValue) <= 0.5) {
          row.discrepancy = 'category-error';
          row.matchedDataPoint = otherDP.label;
          const otherStageValue = stageRPForKind
            ? getDataPointValue(stageRPForKind.emissions, otherDP.id)
            : null;
          if (
            otherStageValue !== null &&
            Math.abs(row.stageValue! - otherStageValue) <= 0.5
          ) {
            row.categoryErrorKind = 'duplicating';
          } else if (
            row.prodValue !== null &&
            otherStageValue !== null &&
            Math.abs(otherStageValue - row.prodValue) <= 0.5
          ) {
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

    if (
      row.discrepancy === 'missing' &&
      row.prodValue !== null &&
      stageCompany
    ) {
      const stageRP = pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear);
      for (const otherDP of sameScopeDataPoints) {
        const otherStageValue = getDataPointValue(stageRP?.emissions, otherDP.id);
        if (
          otherStageValue !== null &&
          Math.abs(row.prodValue - otherStageValue) <= 0.5
        ) {
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
