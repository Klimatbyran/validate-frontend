#!/usr/bin/env npx tsx
/**
 * score-sanity-checks.ts
 *
 * Measures how well each sanity check performs against validated prod data.
 *
 * For each check, we report:
 *   - Caught        — errors the check correctly flagged (true positives)
 *   - False+        — correct data points the check wrongly flagged (false positives)
 *   - Missed        — real errors the check did not catch
 *   - Catch rate    — Caught / Total errors  (recall: what fraction of all errors does this catch?)
 *   - Precision     — Caught / (Caught + False+)  (of all flags raised, what fraction are real errors?)
 *
 * Only validated prod data is used as ground truth — same filter as the Error Browser's
 * "verified only" mode. Comparisons against unverified prod data are excluded.
 *
 * Usage:
 *   npx tsx scripts/score-sanity-checks.ts
 *   npx tsx scripts/score-sanity-checks.ts --year 2023
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// ── Load environment variables (API keys) ────────────────────────────────────

function loadEnvironmentFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvironmentFile(join(import.meta.dirname, '..', '.env.development'));

// ── API endpoints ─────────────────────────────────────────────────────────────

const STAGE_API_URL = 'https://stage-api.klimatkollen.se/api/companies';
const PROD_API_URL = 'https://api.klimatkollen.se/api/companies';

const STAGE_API_KEY = process.env.GARBO_STAGE_ALL_ACCESS_API_KEY ?? '';
const PROD_API_KEY = process.env.GARBO_PROD_ALL_ACCESS_API_KEY ?? '';

// ── Emission data point definitions ──────────────────────────────────────────

const ALL_DATA_POINTS = [
  { id: 'scope1-total',            label: 'Scope 1 Total',                        scope: 'scope1', category: undefined },
  { id: 'scope2-mb',               label: 'Scope 2 Market-based',                 scope: 'scope2', category: undefined },
  { id: 'scope2-lb',               label: 'Scope 2 Location-based',               scope: 'scope2', category: undefined },
  { id: 'scope2-unknown',          label: 'Scope 2 Unknown',                      scope: 'scope2', category: undefined },
  { id: 'cat-1',                   label: 'Cat 1 - Purchased goods & services',   scope: 'scope3', category: 1  },
  { id: 'cat-2',                   label: 'Cat 2 - Capital goods',                scope: 'scope3', category: 2  },
  { id: 'cat-3',                   label: 'Cat 3 - Fuel & energy related',        scope: 'scope3', category: 3  },
  { id: 'cat-4',                   label: 'Cat 4 - Upstream transport',           scope: 'scope3', category: 4  },
  { id: 'cat-5',                   label: 'Cat 5 - Waste',                        scope: 'scope3', category: 5  },
  { id: 'cat-6',                   label: 'Cat 6 - Business travel',              scope: 'scope3', category: 6  },
  { id: 'cat-7',                   label: 'Cat 7 - Employee commuting',           scope: 'scope3', category: 7  },
  { id: 'cat-8',                   label: 'Cat 8 - Upstream leased assets',       scope: 'scope3', category: 8  },
  { id: 'cat-9',                   label: 'Cat 9 - Downstream transport',         scope: 'scope3', category: 9  },
  { id: 'cat-10',                  label: 'Cat 10 - Processing of sold products', scope: 'scope3', category: 10 },
  { id: 'cat-11',                  label: 'Cat 11 - Use of sold products',        scope: 'scope3', category: 11 },
  { id: 'cat-12',                  label: 'Cat 12 - End-of-life treatment',       scope: 'scope3', category: 12 },
  { id: 'cat-13',                  label: 'Cat 13 - Downstream leased assets',   scope: 'scope3', category: 13 },
  { id: 'cat-14',                  label: 'Cat 14 - Franchises',                 scope: 'scope3', category: 14 },
  { id: 'cat-15',                  label: 'Cat 15 - Investments',                scope: 'scope3', category: 15 },
  { id: 'cat-16',                  label: 'Cat 16 - Other',                      scope: 'other',  category: 16 },
  { id: 'scope3-stated-total',     label: 'Scope 3 Stated Total',                scope: 'other',  category: undefined },
  { id: 'scope3-calculated-total', label: 'Scope 3 Calculated Total',            scope: 'other',  category: undefined },
  { id: 'stated-total',            label: 'Stated Total Emissions (All)',         scope: 'other',  category: undefined },
  { id: 'calculated-total',        label: 'Calculated Total Emissions (All)',     scope: 'other',  category: undefined },
] as const;

type DataPointId = typeof ALL_DATA_POINTS[number]['id'];

const SCOPE3_CATEGORY_DATA_POINTS = ALL_DATA_POINTS.filter((dp) => dp.scope === 'scope3');
const GENERIC_DATA_POINT_IDS = new Set<DataPointId>(['scope2-unknown', 'cat-16']);
const UNIT_ERROR_DIVISORS = [10, 100, 1000, 10000, 100000, 1000000];

// ── Types ─────────────────────────────────────────────────────────────────────

type DiscrepancyType =
  | 'identical' | 'rounding' | 'both-null'
  | 'small-error' | 'error' | 'unit-error'
  | 'hallucination' | 'missing' | 'category-error';

const DISCREPANCY_IS_AN_ERROR: Record<DiscrepancyType, boolean> = {
  identical: false,
  rounding:  false,
  'both-null': false,
  'small-error':    true,
  error:            true,
  'unit-error':     true,
  hallucination:    true,
  missing:          true,
  'category-error': true,
};

interface VerifiedBy { name: string }
interface WithVerificationMetadata { metadata?: { verifiedBy?: VerifiedBy | null } }

interface Emissions {
  statedTotalEmissions?: ({ total?: number | null } & WithVerificationMetadata) | number | null;
  calculatedTotalEmissions?: number | null;
  scope1?: ({ total?: number | null } & WithVerificationMetadata) | null;
  scope2?: ({ mb?: number | null; lb?: number | null; unknown?: number | null } & WithVerificationMetadata) | null;
  scope3?: ({
    statedTotalEmissions?: ({ total?: number | null } & WithVerificationMetadata) | null;
    calculatedTotalEmissions?: number | null;
    categories?: Array<{ category: number; total: number | null } & WithVerificationMetadata>;
  } & WithVerificationMetadata) | null;
}

interface ReportingPeriod {
  startDate: string;
  endDate: string;
  emissions?: Emissions;
}

interface Company {
  wikidataId: string;
  name: string;
  tags?: string[];
  reportingPeriods?: ReportingPeriod[];
  futureEmissionsTrendSlope?: number | null;
}

interface SanityFlag {
  dataPointId: DataPointId;
  dataPointLabel: string;
  reason: string;
}

interface SanityCheck {
  id: string;
  label: string;
  run: (company: Company, prodCompany: Company | undefined, year: number) => SanityFlag[];
}

interface CheckScore {
  checkLabel: string;
  truePositives:  number;  // flags that correctly identified a real error
  falsePositives: number;  // flags raised on data that matches prod
  totalErrors:    number;  // all real errors in the verified dataset
  missed:         number;  // real errors this check did not flag
  catchRate:      number;  // recall  = truePositives / totalErrors
  precision:      number;  // precision = truePositives / (truePositives + falsePositives)
}

// ── Emission value extraction ─────────────────────────────────────────────────

function extractNumericTotal(
  value: number | { total?: number | null } | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'total' in value) {
    const total = value.total;
    return typeof total === 'number' ? total : null;
  }
  return null;
}

function getEmissionValue(emissions: Emissions | null | undefined, dataPointId: DataPointId): number | null {
  if (!emissions) return null;

  if (dataPointId === 'scope1-total')       return extractNumericTotal(emissions.scope1);
  if (dataPointId === 'scope2-mb')          return extractNumericTotal(emissions.scope2?.mb);
  if (dataPointId === 'scope2-lb')          return extractNumericTotal(emissions.scope2?.lb);
  if (dataPointId === 'scope2-unknown')     return extractNumericTotal(emissions.scope2?.unknown);
  if (dataPointId === 'stated-total')       return extractNumericTotal(emissions.statedTotalEmissions);
  if (dataPointId === 'calculated-total')   return extractNumericTotal(emissions.calculatedTotalEmissions);

  const scope3 = emissions.scope3;
  if (!scope3) return null;

  if (dataPointId === 'scope3-stated-total')     return extractNumericTotal(scope3.statedTotalEmissions);
  if (dataPointId === 'scope3-calculated-total') return extractNumericTotal(scope3.calculatedTotalEmissions);

  const dataPoint = ALL_DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (dataPoint?.category && scope3.categories) {
    const matchingCategory = scope3.categories.find((c) => c.category === dataPoint.category);
    return matchingCategory?.total ?? null;
  }

  return null;
}

function isProdValueVerified(
  emissions: Emissions | null | undefined,
  dataPointId: DataPointId
): boolean {
  const hasVerifiedBy = (v: WithVerificationMetadata | null | undefined): boolean =>
    v != null && v.metadata?.verifiedBy != null;

  if (!emissions) return false;

  if (dataPointId === 'scope1-total') return hasVerifiedBy(emissions.scope1 ?? undefined);
  if (dataPointId === 'scope2-mb' || dataPointId === 'scope2-lb' || dataPointId === 'scope2-unknown') {
    return hasVerifiedBy(emissions.scope2 ?? undefined);
  }
  if (dataPointId === 'stated-total') {
    const stated = emissions.statedTotalEmissions;
    return typeof stated === 'object' && stated !== null && hasVerifiedBy(stated);
  }
  if (dataPointId === 'calculated-total') return false; // API returns number | null, no metadata

  const scope3 = emissions.scope3;
  if (!scope3) return false;

  if (dataPointId === 'scope3-stated-total')     return hasVerifiedBy(scope3.statedTotalEmissions ?? undefined);
  if (dataPointId === 'scope3-calculated-total') return hasVerifiedBy(scope3);

  const dataPoint = ALL_DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (dataPoint?.category && scope3.categories) {
    const matchingCategory = scope3.categories.find((c) => c.category === dataPoint.category);
    return hasVerifiedBy(matchingCategory ?? undefined);
  }

  return false;
}

function selectReportingPeriodForYear(
  reportingPeriods: ReportingPeriod[] | undefined,
  year: number
): ReportingPeriod | null {
  if (!reportingPeriods?.length) return null;

  const periodsEndingInYear = reportingPeriods.filter(
    (period) => new Date(period.endDate).getFullYear() === year
  );
  if (!periodsEndingInYear.length) return null;

  const fullCalendarYearPeriod = periodsEndingInYear.find((period) => {
    const start = new Date(period.startDate);
    const end   = new Date(period.endDate);
    return start.getMonth() === 0 && start.getDate() === 1
        && end.getMonth()   === 11 && end.getDate()   === 31;
  });

  return fullCalendarYearPeriod ?? periodsEndingInYear[periodsEndingInYear.length - 1];
}

// ── Discrepancy classification ────────────────────────────────────────────────

const ROUNDING_THRESHOLD = 0.5;
const SMALL_ERROR_RELATIVE_THRESHOLD = 0.05;

function getUnitErrorFactor(
  stageValue: number,
  prodValue: number
): number | undefined {
  const absoluteStage = Math.abs(stageValue);
  const absoluteProd  = Math.abs(prodValue);
  if (absoluteStage === 0 || absoluteProd === 0) return undefined;

  const ratio = Math.max(absoluteStage, absoluteProd) / Math.min(absoluteStage, absoluteProd);

  for (const divisor of UNIT_ERROR_DIVISORS) {
    if (Math.abs(ratio - divisor) / divisor <= 0.05) {
      return absoluteStage > absoluteProd ? divisor : 1 / divisor;
    }
  }
  return undefined;
}

function classifyDiscrepancy(
  stageValue: number | null,
  prodValue:  number | null
): DiscrepancyType {
  const stageHasValue = stageValue !== null;
  const prodHasValue  = prodValue  !== null;

  if (!stageHasValue && !prodHasValue) return 'both-null';
  if ( stageHasValue && !prodHasValue) return 'hallucination';
  if (!stageHasValue &&  prodHasValue) return 'missing';

  const absoluteDifference = Math.abs(stageValue! - prodValue!);

  if (absoluteDifference === 0)                return 'identical';
  if (absoluteDifference <= ROUNDING_THRESHOLD) return 'rounding';

  if (getUnitErrorFactor(stageValue!, prodValue!) !== undefined) return 'unit-error';

  const isSmallRelativeError =
    Math.abs(prodValue!) > 0 &&
    absoluteDifference / Math.abs(prodValue!) <= SMALL_ERROR_RELATIVE_THRESHOLD;

  if (isSmallRelativeError) return 'small-error';

  return 'error';
}

function reclassifyAsCategoryErrorIfValueAppearsElsewhere(
  discrepancy: DiscrepancyType,
  stageValue:  number | null,
  prodValue:   number | null,
  stageEmissions: Emissions | null | undefined,
  prodEmissions:  Emissions | null | undefined,
  sameScopeDataPoints: typeof ALL_DATA_POINTS[number][],
  currentDataPointId: DataPointId
): DiscrepancyType {
  if (
    discrepancy === 'identical' || discrepancy === 'rounding' ||
    discrepancy === 'both-null' || sameScopeDataPoints.length === 0
  ) {
    return discrepancy;
  }

  // Stage has a value, but prod doesn't (or has a different value).
  // Check if the stage value appears in a different slot in prod.
  if (
    (discrepancy === 'error' || discrepancy === 'small-error' || discrepancy === 'hallucination') &&
    stageValue !== null
  ) {
    for (const otherDataPoint of sameScopeDataPoints) {
      const otherProdValue = getEmissionValue(prodEmissions, otherDataPoint.id as DataPointId);
      const stageValueMatchesOtherProdSlot =
        otherProdValue !== null && Math.abs(stageValue - otherProdValue) <= ROUNDING_THRESHOLD;

      if (stageValueMatchesOtherProdSlot) return 'category-error';
    }
  }

  // Prod has a value that's missing in stage.
  // Check if the prod value appears in a different slot in stage.
  if (discrepancy === 'missing' && prodValue !== null) {
    for (const otherDataPoint of sameScopeDataPoints) {
      const otherStageValue = getEmissionValue(stageEmissions, otherDataPoint.id as DataPointId);
      const prodValueMatchesOtherStageSlot =
        otherStageValue !== null && Math.abs(prodValue - otherStageValue) <= ROUNDING_THRESHOLD;

      if (prodValueMatchesOtherStageSlot) return 'category-error';
    }
  }

  return discrepancy;
}

function isCompanyFullyVerifiedForYear(company: Company, year: number): boolean {
  const period = selectReportingPeriodForYear(company.reportingPeriods, year);
  if (!period?.emissions) return false;

  return ALL_DATA_POINTS.every((dataPoint) => {
    if (dataPoint.id === 'calculated-total') return true; // no metadata available
    const value = getEmissionValue(period.emissions, dataPoint.id as DataPointId);
    if (value === null) return true; // absent values don't need verification
    return isProdValueVerified(period.emissions, dataPoint.id as DataPointId);
  });
}

// ── Sanity checks ─────────────────────────────────────────────────────────────
//
// Each check inspects one company's STAGE data for a given year and returns
// a list of suspicious data points. Checks do not look at prod data.

const UNIT_ERROR_POWERS_TO_DETECT = [10, 100, 1000, 10000];

function isLikelyUnitError(magnitude: number): boolean {
  return UNIT_ERROR_POWERS_TO_DETECT.some((power) => Math.abs(magnitude - power) / power <= 0.05);
}

function getValidatedPriorYearProdValue(
  prodCompany: Company | undefined,
  year: number,
  dataPointId: DataPointId,
): number | null {
  if (!prodCompany) return null;
  const priorPeriod = selectReportingPeriodForYear(prodCompany.reportingPeriods, year - 1);
  if (!priorPeriod) return null;
  if (!isProdValueVerified(priorPeriod.emissions, dataPointId)) return null;
  return getEmissionValue(priorPeriod.emissions, dataPointId);
}

function makeYoyCheck(
  id: string,
  label: string,
  scopeFilter: string,
  threshold: number,
): SanityCheck {
  const dataPoints = ALL_DATA_POINTS.filter((dp) => dp.scope === scopeFilter);
  return {
    id,
    label,
    run(company, prodCompany, year) {
      const flags: SanityFlag[] = [];
      const currentYearPeriod = selectReportingPeriodForYear(company.reportingPeriods, year);
      if (!currentYearPeriod) return flags;

      for (const dataPoint of dataPoints) {
        const validatedPriorValue = getValidatedPriorYearProdValue(prodCompany, year, dataPoint.id as DataPointId);
        if (validatedPriorValue === null || validatedPriorValue === 0) continue;

        const currentValue = getEmissionValue(currentYearPeriod.emissions, dataPoint.id as DataPointId);

        if (currentValue === null || currentValue === 0) {
          flags.push({
            dataPointId: dataPoint.id as DataPointId,
            dataPointLabel: dataPoint.label,
            reason: `Value disappeared: validated prod had ${validatedPriorValue.toLocaleString('en', { maximumFractionDigits: 1 })} in ${year - 1}, now ${currentValue === 0 ? '0' : 'missing'}`,
          });
          continue;
        }

        const changeRatio = Math.abs(currentValue) / Math.abs(validatedPriorValue);
        const isLargeChange = changeRatio > threshold || changeRatio < 1 / threshold;
        if (!isLargeChange) continue;

        const magnitude = changeRatio > 1 ? changeRatio : 1 / changeRatio;
        const unitError = isLikelyUnitError(magnitude);
        flags.push({
          dataPointId: dataPoint.id as DataPointId,
          dataPointLabel: dataPoint.label,
          reason: unitError
            ? `Possible unit error: ${magnitude.toFixed(0)}× vs validated prod ${year - 1}`
            : `${magnitude.toFixed(1)}× change vs validated prod ${year - 1}`,
        });
      }
      return flags;
    },
  };
}

const SCOPE3_CATEGORY_SUM_TOLERANCE = 0.5; // 50% — generous to handle partial reporting

function checkScope3InternalConsistency(company: Company, _prodCompany: Company | undefined, year: number): SanityFlag[] {
  const flags: SanityFlag[] = [];

  const period = selectReportingPeriodForYear(company.reportingPeriods, year);
  if (!period) return flags;

  const scope3StatedTotal = getEmissionValue(period.emissions, 'scope3-stated-total');
  if (scope3StatedTotal === null) return flags;

  let sumOfCategories = 0;
  let numberOfCategoriesWithValues = 0;

  for (const categoryDataPoint of SCOPE3_CATEGORY_DATA_POINTS) {
    const categoryValue = getEmissionValue(period.emissions, categoryDataPoint.id as DataPointId);
    if (categoryValue === null) continue;

    sumOfCategories += categoryValue;
    numberOfCategoriesWithValues++;

    const categoryExceedsTotalWhichIsImpossible = categoryValue > scope3StatedTotal * 1.01;
    if (categoryExceedsTotalWhichIsImpossible) {
      flags.push({
        dataPointId: categoryDataPoint.id as DataPointId,
        dataPointLabel: categoryDataPoint.label,
        reason: `Category (${categoryValue.toLocaleString('en')}) exceeds scope 3 total (${scope3StatedTotal.toLocaleString('en')})`,
      });
    }
  }

  const haveEnoughCategoriesToCheckSum = numberOfCategoriesWithValues >= 2 && scope3StatedTotal > 0;
  if (haveEnoughCategoriesToCheckSum) {
    const relativeDifference = Math.abs(sumOfCategories - scope3StatedTotal) / scope3StatedTotal;
    if (relativeDifference > SCOPE3_CATEGORY_SUM_TOLERANCE) {
      flags.push({
        dataPointId: 'scope3-stated-total',
        dataPointLabel: 'Scope 3 Stated Total',
        reason: `Sum of ${numberOfCategoriesWithValues} categories (${sumOfCategories.toLocaleString('en')}) differs from stated total (${scope3StatedTotal.toLocaleString('en')}) by ${(relativeDifference * 100).toFixed(0)}%`,
      });
    }
  }

  return flags;
}

function checkForNegativeEmissionValues(company: Company, _prodCompany: Company | undefined, year: number): SanityFlag[] {
  const flags: SanityFlag[] = [];

  const period = selectReportingPeriodForYear(company.reportingPeriods, year);
  if (!period) return flags;

  for (const dataPoint of ALL_DATA_POINTS) {
    const value = getEmissionValue(period.emissions, dataPoint.id as DataPointId);
    if (value !== null && value < 0) {
      flags.push({
        dataPointId: dataPoint.id as DataPointId,
        dataPointLabel: dataPoint.label,
        reason: `Negative value: ${value.toLocaleString('en', { maximumFractionDigits: 1 })} tCO₂e`,
      });
    }
  }

  return flags;
}


const SCOPE2_IDS = ALL_DATA_POINTS.filter((dp) => dp.scope === 'scope2').map((dp) => dp.id as DataPointId);
const SCOPE3_IDS = ALL_DATA_POINTS.filter((dp) => dp.scope === 'scope3').map((dp) => dp.id as DataPointId);

function getFirstNonNull(emissions: Emissions | undefined, ids: DataPointId[]): { id: DataPointId; value: number } | null {
  for (const id of ids) {
    const v = getEmissionValue(emissions, id);
    if (v !== null) return { id, value: v };
  }
  return null;
}

function checkCrossScope(company: Company, _prodCompany: Company | undefined, year: number): SanityFlag[] {
  const flags: SanityFlag[] = [];

  const period = selectReportingPeriodForYear(company.reportingPeriods, year);
  if (!period) return flags;

  const scope1 = getEmissionValue(period.emissions, 'scope1-total');
  const scope2 = getFirstNonNull(period.emissions, SCOPE2_IDS);
  const scope3 = getFirstNonNull(period.emissions, SCOPE3_IDS);

  if (scope2 && !scope1) {
    flags.push({ dataPointId: 'scope1-total', dataPointLabel: 'Scope 1 Total',
      reason: `Scope 2 reported (${scope2.value.toLocaleString('en', { maximumFractionDigits: 0 })}) but scope 1 is missing` });
  }

  if (scope3 && !scope1) {
    flags.push({ dataPointId: 'scope1-total', dataPointLabel: 'Scope 1 Total',
      reason: `Scope 3 reported (${scope3.value.toLocaleString('en', { maximumFractionDigits: 0 })}) but scope 1 is missing` });
  }

  if (scope3 && !scope2) {
    flags.push({ dataPointId: 'scope2-unknown', dataPointLabel: 'Scope 2',
      reason: `Scope 3 reported (${scope3.value.toLocaleString('en', { maximumFractionDigits: 0 })}) but all scope 2 values are missing` });
  }

  if (scope1 && scope1 > 0) {
    const scope3Total =
      getEmissionValue(period.emissions, 'scope3-stated-total') ??
      getEmissionValue(period.emissions, 'scope3-calculated-total');
    if (scope3Total !== null && scope3Total > 0 && scope3Total < scope1) {
      flags.push({ dataPointId: 'scope3-stated-total', dataPointLabel: 'Scope 3 Total',
        reason: `Scope 3 (${scope3Total.toLocaleString('en', { maximumFractionDigits: 0 })}) is smaller than Scope 1 (${scope1.toLocaleString('en', { maximumFractionDigits: 0 })})` });
    }
  }

  return flags;
}


function makeTrendPlausibilityCheck(
  dataPointId: DataPointId,
  dataPointLabel: string,
  threshold: number,
): SanityCheck {
  return {
    id: `trend-plausibility-${dataPointId}`,
    label: `Trend plausibility — ${dataPointLabel}`,
    run(company, prodCompany, year) {
      if (!prodCompany) return [];

      const slope = prodCompany.futureEmissionsTrendSlope;
      if (slope == null) return [];

      const priorPeriod = selectReportingPeriodForYear(prodCompany.reportingPeriods, year - 1);
      if (!priorPeriod) return [];

      // Use calculatedTotalEmissions directly — it has no verification metadata
      // but is what the slope tracks (scope1 + scope2_mb + scope3 categories)
      const priorValue = priorPeriod.emissions?.calculatedTotalEmissions ?? null;
      if (priorValue === null || Math.abs(priorValue) < 10) return [];
      // Guard: skip companies where slope exceeds prior total (unreliable fit)
      if (Math.abs(slope) > Math.abs(priorValue)) return [];

      const expected = priorValue + slope;
      if (expected <= 0) return [];

      const stagePeriod = selectReportingPeriodForYear(company.reportingPeriods, year);
      if (!stagePeriod) return [];

      const stageValue = stagePeriod.emissions?.calculatedTotalEmissions ?? null;
      if (stageValue === null) return [];

      const relativeDeviation = Math.abs(stageValue - expected) / Math.abs(priorValue);
      if (relativeDeviation <= threshold) return [];

      return [{
        dataPointId,
        dataPointLabel,
        reason: `Extracted ${stageValue.toLocaleString('en', { maximumFractionDigits: 0 })} is ${(relativeDeviation * 100).toFixed(0)}% off trend prediction ${expected.toLocaleString('en', { maximumFractionDigits: 0 })} (slope: ${slope.toLocaleString('en', { maximumFractionDigits: 0 })} tCO₂e/yr)`,
      }];
    },
  };
}

const ALL_SANITY_CHECKS: SanityCheck[] = [
  // Scope-specific year-over-year checks with tuned thresholds:
  // Scope 1/2: higher threshold (20×) — values legitimately swing more, fewer false alarms
  // Scope 3:   lower threshold (5×) — many stable categories, lower threshold catches more
  // Other:     medium threshold (10×) — totals/aggregates, moderate sensitivity
  makeYoyCheck('yoy-scope1', 'YoY change / disappeared — Scope 1', 'scope1', 20),
  makeYoyCheck('yoy-scope2', 'YoY change / disappeared — Scope 2', 'scope2', 20),
  makeYoyCheck('yoy-scope3', 'YoY change / disappeared — Scope 3', 'scope3', 5),
  makeYoyCheck('yoy-other',  'YoY change / disappeared — Totals',  'other',  10),
  makeTrendPlausibilityCheck('calculated-total', 'Trend plausibility — Calculated total', 0.3),
  {
    id: 'scope3-consistency',
    label: 'Scope 3 internal consistency',
    run: checkScope3InternalConsistency,
  },
  {
    id: 'negative-values',
    label: 'Negative emission values',
    run: checkForNegativeEmissionValues,
  },
  {
    id: 'cross-scope',
    label: 'Cross-scope structural checks',
    run: checkCrossScope,
  },
];

// ── Ground truth builder ──────────────────────────────────────────────────────

/**
 * For every (company, data point) pair where the prod value is verified,
 * classify the discrepancy between stage and prod.
 *
 * Returns a map of "wikidataId:dataPointId" → discrepancy type,
 * and the total count of real errors found.
 */
function buildVerifiedGroundTruth(
  stageCompanies: Company[],
  prodCompanies: Company[],
  year: number
): { groundTruth: Map<string, DiscrepancyType>; totalErrors: number } {
  const stageByWikidataId = new Map(stageCompanies.map((c) => [c.wikidataId, c]));
  const prodByWikidataId  = new Map(prodCompanies.map((c)  => [c.wikidataId, c]));
  const allWikidataIds    = new Set([...stageByWikidataId.keys(), ...prodByWikidataId.keys()]);

  const groundTruth = new Map<string, DiscrepancyType>();
  let totalErrors = 0;

  for (const wikidataId of allWikidataIds) {
    const stageCompany = stageByWikidataId.get(wikidataId);
    const prodCompany  = prodByWikidataId.get(wikidataId);

    if (!stageCompany || !prodCompany) continue;

    const stagePeriod = selectReportingPeriodForYear(stageCompany.reportingPeriods, year);
    const prodPeriod  = selectReportingPeriodForYear(prodCompany.reportingPeriods,  year);

    if (!stagePeriod || !prodPeriod) continue;

    const companyIsFullyVerifiedInProd = isCompanyFullyVerifiedForYear(prodCompany, year);

    for (const dataPoint of ALL_DATA_POINTS) {
      const stageValue = getEmissionValue(stagePeriod.emissions, dataPoint.id as DataPointId);
      const prodValue  = getEmissionValue(prodPeriod.emissions,  dataPoint.id as DataPointId);

      const prodDataPointIsVerified = isProdValueVerified(prodPeriod.emissions, dataPoint.id as DataPointId);
      const bothSidesAreNull = stageValue === null && prodValue === null;

      // calculatedTotalEmissions is derived by Garbo from individual scope values —
      // the AI never extracts it directly so it cannot independently be an "error".
      // It is used as a diagnostic tool inside the trend check, not as ground truth.
      const includeInGroundTruth =
        prodDataPointIsVerified || (bothSidesAreNull && companyIsFullyVerifiedInProd);

      if (!includeInGroundTruth) continue;

      const sameScopeDataPoints = ALL_DATA_POINTS.filter(
        (dp) => dp.scope === dataPoint.scope && dp.id !== dataPoint.id
      );

      let discrepancy = classifyDiscrepancy(stageValue, prodValue);
      discrepancy = reclassifyAsCategoryErrorIfValueAppearsElsewhere(
        discrepancy, stageValue, prodValue,
        stagePeriod.emissions, prodPeriod.emissions,
        sameScopeDataPoints,
        dataPoint.id as DataPointId
      );

      groundTruth.set(`${wikidataId}:${dataPoint.id}`, discrepancy);
      if (DISCREPANCY_IS_AN_ERROR[discrepancy]) totalErrors++;
    }
  }

  return { groundTruth, totalErrors };
}

// ── Check scoring ─────────────────────────────────────────────────────────────

/**
 * Run one sanity check against every stage company and score it against ground truth.
 */
function scoreOneCheck(
  check: SanityCheck,
  stageCompanies: Company[],
  prodCompanies: Company[],
  groundTruth: Map<string, DiscrepancyType>,
  totalErrors: number,
  year: number
): CheckScore {
  const prodByWikidataId = new Map(prodCompanies.map((c) => [c.wikidataId, c]));
  let truePositives  = 0;
  let falsePositives = 0;

  for (const stageCompany of stageCompanies) {
    const prodCompany = prodByWikidataId.get(stageCompany.wikidataId);
    const flagsForThisCompany = check.run(stageCompany, prodCompany, year);

    for (const flag of flagsForThisCompany) {
      const groundTruthKey = `${stageCompany.wikidataId}:${flag.dataPointId}`;
      // Skip flags on data points with no verified ground truth (same as UI hasGroundTruth filter)
      if (!groundTruth.has(groundTruthKey)) continue;
      const discrepancy = groundTruth.get(groundTruthKey)!;

      if (DISCREPANCY_IS_AN_ERROR[discrepancy]) {
        truePositives++;
      } else {
        falsePositives++;
      }
    }
  }

  const missed    = totalErrors - truePositives;
  const catchRate = totalErrors > 0 ? truePositives / totalErrors : 0;
  const precision = (truePositives + falsePositives) > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;

  return {
    checkLabel: check.label,
    truePositives,
    falsePositives,
    totalErrors,
    missed,
    catchRate,
    precision,
  };
}

// ── Output formatting ─────────────────────────────────────────────────────────

function printResultsTable(scores: CheckScore[], year: number, totalVerifiedDataPoints: number) {
  const totalErrors = scores[0]?.totalErrors ?? 0;
  const baseRate = totalVerifiedDataPoints > 0 ? totalErrors / totalVerifiedDataPoints : 0;
  console.log(`\nYear: ${year} — ${totalErrors} errors across ${totalVerifiedDataPoints} verified data points (baseline error rate: ${(baseRate * 100).toFixed(1)}%)\n`);

  const columnWidths = {
    label:      32,
    caught:      8,
    falsePlus:   8,
    missed:      8,
    catchRate:  12,
    precision:  12,
    lift:        8,
  };

  const headerLine = [
    'Check'.padEnd(columnWidths.label),
    'Caught'.padStart(columnWidths.caught),
    'False+'.padStart(columnWidths.falsePlus),
    'Missed'.padStart(columnWidths.missed),
    'Catch rate'.padStart(columnWidths.catchRate),
    'Precision'.padStart(columnWidths.precision),
    'Lift'.padStart(columnWidths.lift),
  ].join('  ');

  console.log(headerLine);
  console.log('─'.repeat(headerLine.length));

  for (const score of scores) {
    const scoredFlags = score.truePositives + score.falsePositives;
    const lift = baseRate > 0 && scoredFlags > 0 ? score.precision / baseRate : null;
    const liftStr = lift !== null ? `${lift.toFixed(1)}×` : '—';
    const liftTag = lift === null ? '' : lift >= 2 ? ' ✓' : lift >= 1 ? ' ~' : ' ✗';
    const row = [
      score.checkLabel.padEnd(columnWidths.label),
      String(score.truePositives).padStart(columnWidths.caught),
      String(score.falsePositives).padStart(columnWidths.falsePlus),
      String(score.missed).padStart(columnWidths.missed),
      `${(score.catchRate * 100).toFixed(1)}%`.padStart(columnWidths.catchRate),
      `${(score.precision * 100).toFixed(1)}%`.padStart(columnWidths.precision),
      `${liftStr}${liftTag}`.padStart(columnWidths.lift),
    ].join('  ');
    console.log(row);
  }

  console.log('─'.repeat(headerLine.length));

  const totalFlagged = scores.reduce((sum, s) => sum + s.truePositives + s.falsePositives, 0);
  const totalCaught  = scores.reduce((sum, s) => sum + s.truePositives, 0);
  const totalFalse   = scores.reduce((sum, s) => sum + s.falsePositives, 0);
  console.log(
    `${'All checks combined (with overlap)'.padEnd(columnWidths.label)}  ` +
    `${String(totalCaught).padStart(columnWidths.caught)}  ` +
    `${String(totalFalse).padStart(columnWidths.falsePlus)}  ` +
    `${String(totalErrors - totalCaught > 0 ? totalErrors - totalCaught : 0).padStart(columnWidths.missed)}  ` +
    `${'—'.padStart(columnWidths.catchRate)}  ` +
    `${'—'.padStart(columnWidths.precision)}`
  );
  console.log(`\nTotal flags raised across all checks: ${totalFlagged}`);
}

// ── CLI + main ────────────────────────────────────────────────────────────────

function parseArguments(): { year: number; outputFile: string | null } {
  const args = process.argv.slice(2);
  let year = 2024;
  let outputFile: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year' && args[i + 1]) {
      year = Number(args[++i]);
    } else if (args[i] === '--out' && args[i + 1]) {
      outputFile = args[++i];
    }
  }

  return { year, outputFile };
}

async function main() {
  const { year, outputFile } = parseArguments();

  console.log('Fetching stage and prod company data…');

  const [stageResponse, prodResponse] = await Promise.all([
    fetch(STAGE_API_URL, STAGE_API_KEY ? { headers: { 'X-API-Key': STAGE_API_KEY } } : undefined),
    fetch(PROD_API_URL,  PROD_API_KEY  ? { headers: { 'X-API-Key': PROD_API_KEY  } } : undefined),
  ]);

  if (!stageResponse.ok) throw new Error(`Stage API error: ${stageResponse.status} ${stageResponse.statusText}`);
  if (!prodResponse.ok)  throw new Error(`Prod API error: ${prodResponse.status} ${prodResponse.statusText}`);

  const stageCompanies: Company[] = await stageResponse.json();
  const prodCompanies:  Company[] = await prodResponse.json();

  console.log(`Stage: ${stageCompanies.length} companies | Prod: ${prodCompanies.length} companies`);
  console.log(`Building verified ground truth for ${year}…`);

  const { groundTruth, totalErrors } = buildVerifiedGroundTruth(stageCompanies, prodCompanies, year);

  console.log(`Scoring ${ALL_SANITY_CHECKS.length} checks against ${totalErrors} verified errors…`);

  const scores = ALL_SANITY_CHECKS.map((check) =>
    scoreOneCheck(check, stageCompanies, prodCompanies, groundTruth, totalErrors, year)
  );

  printResultsTable(scores, year, groundTruth.size);

  // ── Triage decision table ─────────────────────────────────────────────────────
  // For each check (sorted by lift), show cumulative unique data points to review
  // and unique errors found. Tells you exactly what you gain by adding each check.

  const prodByWikidataId = new Map(prodCompanies.map((c) => [c.wikidataId, c]));
  const baseRate = groundTruth.size > 0 ? totalErrors / groundTruth.size : 0;

  // Collect per-check flag sets: keys of verified data points flagged (TP + FP)
  const checkFlagSets: { check: (typeof ALL_SANITY_CHECKS)[number]; tpKeys: Set<string>; allVerifiedKeys: Set<string> }[] = [];
  for (const check of ALL_SANITY_CHECKS) {
    const tpKeys = new Set<string>();
    const allVerifiedKeys = new Set<string>();
    for (const stageCompany of stageCompanies) {
      const prodCompany = prodByWikidataId.get(stageCompany.wikidataId);
      for (const flag of check.run(stageCompany, prodCompany, year)) {
        const key = `${stageCompany.wikidataId}:${flag.dataPointId}`;
        if (!groundTruth.has(key)) continue;
        allVerifiedKeys.add(key);
        if (DISCREPANCY_IS_AN_ERROR[groundTruth.get(key)!]) tpKeys.add(key);
      }
    }
    checkFlagSets.push({ check, tpKeys, allVerifiedKeys });
  }

  // Sort by lift descending (checks that never fire go last)
  checkFlagSets.sort((a, b) => {
    const liftOf = (x: typeof checkFlagSets[number]) => {
      const prec = x.allVerifiedKeys.size > 0 ? x.tpKeys.size / x.allVerifiedKeys.size : 0;
      return baseRate > 0 && x.allVerifiedKeys.size > 0 ? prec / baseRate : -1;
    };
    return liftOf(b) - liftOf(a);
  });

  const cumTpKeys   = new Set<string>();
  const cumFlagKeys = new Set<string>();

  const totalDataPoints = groundTruth.size;
  console.log(`\nTriage decision table — cumulative, sorted by lift (${totalErrors} errors across ${totalDataPoints} data points, baseline ${(baseRate * 100).toFixed(1)}%):`);
  console.log('─'.repeat(82));
  console.log(
    `${'Add check'.padEnd(36)}  ${'% to check'.padStart(10)}  ${'% errors found'.padStart(14)}  ${'Precision'.padStart(10)}  ${'Lift'.padStart(6)}`
  );
  console.log('─'.repeat(82));

  for (const { check, tpKeys, allVerifiedKeys } of checkFlagSets) {
    if (allVerifiedKeys.size === 0) continue; // never fires — skip
    for (const k of allVerifiedKeys) cumFlagKeys.add(k);
    for (const k of tpKeys) cumTpKeys.add(k);

    const prec     = allVerifiedKeys.size > 0 ? tpKeys.size / allVerifiedKeys.size : 0;
    const lift     = baseRate > 0 && allVerifiedKeys.size > 0 ? prec / baseRate : 0;
    const checkPct = `${(cumFlagKeys.size / totalDataPoints * 100).toFixed(1)}%`;
    const catchPct = totalErrors > 0 ? `${(cumTpKeys.size / totalErrors * 100).toFixed(1)}%` : '—';
    const cumPrec  = cumFlagKeys.size > 0 ? `${(cumTpKeys.size / cumFlagKeys.size * 100).toFixed(1)}%` : '—';

    console.log(
      `${check.label.slice(0, 36).padEnd(36)}  ${checkPct.padStart(10)}  ${catchPct.padStart(14)}  ${cumPrec.padStart(10)}  ${`${lift.toFixed(1)}×`.padStart(6)}`
    );
  }
  console.log('─'.repeat(82));

  // ── Missed error analysis ─────────────────────────────────────────────────────
  // Build the union of all caught keys, then find what's missed and why.

  const caughtKeys = new Set<string>();

  for (const check of ALL_SANITY_CHECKS) {
    for (const stageCompany of stageCompanies) {
      const prodCompany = prodByWikidataId.get(stageCompany.wikidataId);
      for (const flag of check.run(stageCompany, prodCompany, year)) {
        const key = `${stageCompany.wikidataId}:${flag.dataPointId}`;
        if (groundTruth.get(key) && DISCREPANCY_IS_AN_ERROR[groundTruth.get(key)!]) {
          caughtKeys.add(key);
        }
      }
    }
  }

  const missedByType = new Map<DiscrepancyType, number>();
  const caughtByType = new Map<DiscrepancyType, number>();

  for (const [key, discrepancy] of groundTruth) {
    if (!DISCREPANCY_IS_AN_ERROR[discrepancy]) continue;
    if (caughtKeys.has(key)) {
      caughtByType.set(discrepancy, (caughtByType.get(discrepancy) ?? 0) + 1);
    } else {
      missedByType.set(discrepancy, (missedByType.get(discrepancy) ?? 0) + 1);
    }
  }

  const uniqueCaught = caughtKeys.size;
  const uniqueMissed = totalErrors - uniqueCaught;

  console.log(`\nUnique errors caught by any check: ${uniqueCaught} / ${totalErrors} (${(uniqueCaught / totalErrors * 100).toFixed(1)}%)`);
  console.log(`Unique errors missed:              ${uniqueMissed} / ${totalErrors}\n`);

  const allTypes = new Set([...missedByType.keys(), ...caughtByType.keys()]);
  const typeOrder: DiscrepancyType[] = ['missing', 'error', 'unit-error', 'hallucination', 'category-error', 'small-error'];
  const sortedTypes = typeOrder.filter((t) => allTypes.has(t));

  console.log('Missed error breakdown by type:');
  console.log('─'.repeat(68));
  console.log(`${'Type'.padEnd(20)}  ${'Caught'.padStart(8)}  ${'Missed'.padStart(8)}  ${'Total'.padStart(8)}  ${'Catch%'.padStart(8)}`);
  console.log('─'.repeat(68));
  for (const type of sortedTypes) {
    const caught = caughtByType.get(type) ?? 0;
    const missed = missedByType.get(type) ?? 0;
    const total = caught + missed;
    const pct = total > 0 ? (caught / total * 100).toFixed(0) + '%' : '—';
    console.log(`${type.padEnd(20)}  ${String(caught).padStart(8)}  ${String(missed).padStart(8)}  ${String(total).padStart(8)}  ${pct.padStart(8)}`);
  }
  console.log('─'.repeat(68));

  // Per-scope breakdown
  const scopes = ['scope1', 'scope2', 'scope3', 'other'] as const;
  const scopeLabels: Record<string, string> = { scope1: 'Scope 1', scope2: 'Scope 2', scope3: 'Scope 3', other: 'Other (totals)' };

  console.log('\nBreakdown by scope:');
  console.log('─'.repeat(76));
  console.log(`${'Scope'.padEnd(16)}  ${'Errors'.padStart(8)}  ${'Caught'.padStart(8)}  ${'Missed'.padStart(8)}  ${'Catch%'.padStart(8)}  ${'FalsePos'.padStart(10)}  ${'Precision'.padStart(10)}`);
  console.log('─'.repeat(76));

  for (const scope of scopes) {
    const scopeDataPointIds = new Set(ALL_DATA_POINTS.filter((dp) => dp.scope === scope).map((dp) => dp.id));

    let scopeErrors = 0, scopeCaught = 0, scopeFalsePos = 0;
    for (const [key, discrepancy] of groundTruth) {
      const dpId = key.slice(key.indexOf(':') + 1) as DataPointId;
      if (!scopeDataPointIds.has(dpId)) continue;
      if (!DISCREPANCY_IS_AN_ERROR[discrepancy]) continue;
      scopeErrors++;
      if (caughtKeys.has(key)) scopeCaught++;
    }
    // False positives: flags on verified-correct data points in this scope
    for (const check of ALL_SANITY_CHECKS) {
      for (const stageCompany of stageCompanies) {
        const prodCompany = prodByWikidataId.get(stageCompany.wikidataId);
        for (const flag of check.run(stageCompany, prodCompany, year)) {
          if (!scopeDataPointIds.has(flag.dataPointId)) continue;
          const key = `${stageCompany.wikidataId}:${flag.dataPointId}`;
          const disc = groundTruth.get(key);
          if (disc && !DISCREPANCY_IS_AN_ERROR[disc]) scopeFalsePos++;
        }
      }
    }

    if (scopeErrors === 0 && scopeFalsePos === 0) continue;
    const catchPct = scopeErrors > 0 ? (scopeCaught / scopeErrors * 100).toFixed(0) + '%' : '—';
    const precision = (scopeCaught + scopeFalsePos) > 0 ? (scopeCaught / (scopeCaught + scopeFalsePos) * 100).toFixed(0) + '%' : '—';
    console.log(`${scopeLabels[scope].padEnd(16)}  ${String(scopeErrors).padStart(8)}  ${String(scopeCaught).padStart(8)}  ${String(scopeErrors - scopeCaught).padStart(8)}  ${catchPct.padStart(8)}  ${String(scopeFalsePos).padStart(10)}  ${precision.padStart(10)}`);
  }
  console.log('─'.repeat(76));

  // ── Threshold sweep: find the sweet spot for each scope independently ────────

  const SWEEP_THRESHOLDS = [2, 3, 5, 8, 10, 15, 20, 30, 50];
  const SCOPE_SWEEP_CONFIGS: { scope: string; label: string; defaultThreshold: number }[] = [
    { scope: 'scope1', label: 'Scope 1', defaultThreshold: 20 },
    { scope: 'scope2', label: 'Scope 2', defaultThreshold: 20 },
    { scope: 'scope3', label: 'Scope 3', defaultThreshold: 5  },
    { scope: 'other',  label: 'Totals',  defaultThreshold: 10 },
  ];

  console.log('\nThreshold sweep — for each scope, how precision and catch rate change:');
  console.log('(other scopes held at defaults; sweep covers only the large-change check, not value-disappeared)');

  for (const { scope, label, defaultThreshold } of SCOPE_SWEEP_CONFIGS) {
    console.log(`\n  ${label} (default ${defaultThreshold}×):`);
    console.log(`  ${'Threshold'.padEnd(12)}  ${'TP'.padStart(5)}  ${'FP'.padStart(5)}  ${'Precision'.padStart(10)}  ${'Catch%'.padStart(8)}  ${'Lift'.padStart(6)}`);
    console.log(`  ${'─'.repeat(56)}`);

    for (const t of SWEEP_THRESHOLDS) {
      const check = makeYoyCheck(
        `yoy-${scope}-sweep`,
        `YoY — ${label}`,
        scope,
        t,
      );
      let tp = 0, fp = 0;
      for (const stageCompany of stageCompanies) {
        const prodCompany = prodByWikidataId.get(stageCompany.wikidataId);
        for (const flag of check.run(stageCompany, prodCompany, year)) {
          const key = `${stageCompany.wikidataId}:${flag.dataPointId}`;
          if (!groundTruth.has(key)) continue;
          if (DISCREPANCY_IS_AN_ERROR[groundTruth.get(key)!]) tp++;
          else fp++;
        }
      }
      const prec  = (tp + fp) > 0 ? tp / (tp + fp) : 0;
      const catch_ = totalErrors > 0 ? tp / totalErrors : 0;
      const lift  = baseRate > 0 && (tp + fp) > 0 ? prec / baseRate : 0;
      const isDefault = t === defaultThreshold;
      const marker = isDefault ? ' ◄ default' : '';
      const precStr = `${(prec * 100).toFixed(0)}%`;
      const catchStr = `${(catch_ * 100).toFixed(1)}%`;
      const liftStr = `${lift.toFixed(1)}×`;
      const precFlag = prec < 0.5 ? ' ✗' : prec >= 0.7 ? ' ✓' : '';
      console.log(`  ${`${t}×`.padEnd(12)}  ${String(tp).padStart(5)}  ${String(fp).padStart(5)}  ${(precStr + precFlag).padStart(12)}  ${catchStr.padStart(8)}  ${liftStr.padStart(6)}${marker}`);
    }
  }

  // ── Why did high-ratio 'error' type misses not trigger the YoY check? ─────────

  const stageByWikidataId = new Map(stageCompanies.map((c) => [c.wikidataId, c]));

  type MissedErrorCase = {
    wikidataId: string;
    dataPointId: DataPointId;
    stageValue: number;
    prodValue: number;
    ratio: number; // stage / prod
    priorYearValue: number | null;
    priorYearVerified: boolean;
    yoyRatio: number | null; // stage / priorYearProd
    yoyThreshold: number;
    wouldYoYFire: boolean;
    reason: string;
  };

  const missedErrorCases: MissedErrorCase[] = [];

  for (const [key, discrepancy] of groundTruth) {
    if (discrepancy !== 'error') continue;
    if (caughtKeys.has(key)) continue;

    const colonIdx = key.indexOf(':');
    const wikidataId = key.slice(0, colonIdx);
    const dataPointId = key.slice(colonIdx + 1) as DataPointId;

    const stageCompany = stageByWikidataId.get(wikidataId);
    const prodCompany  = prodByWikidataId.get(wikidataId);
    if (!stageCompany || !prodCompany) continue;

    const stagePeriod = selectReportingPeriodForYear(stageCompany.reportingPeriods, year);
    const prodPeriod  = selectReportingPeriodForYear(prodCompany.reportingPeriods, year);
    if (!stagePeriod || !prodPeriod) continue;

    const stageValue = getEmissionValue(stagePeriod.emissions, dataPointId);
    const prodValue  = getEmissionValue(prodPeriod.emissions,  dataPointId);
    if (stageValue === null || prodValue === null || prodValue === 0) continue;

    const ratio = Math.abs(stageValue / prodValue);

    const priorProdPeriod  = selectReportingPeriodForYear(prodCompany.reportingPeriods, year - 1);
    const priorYearValue   = priorProdPeriod ? getEmissionValue(priorProdPeriod.emissions, dataPointId) : null;
    const priorYearVerified = priorProdPeriod ? isProdValueVerified(priorProdPeriod.emissions, dataPointId) : false;

    const dp = ALL_DATA_POINTS.find((d) => d.id === dataPointId);
    const scope = dp?.scope ?? 'other';
    const yoyThreshold = scope === 'scope1' || scope === 'scope2' ? 20 : scope === 'scope3' ? 5 : 10;

    let yoyRatio: number | null = null;
    let wouldYoYFire = false;
    let reason: string;

    if (!priorProdPeriod || priorYearValue === null) {
      reason = 'no prior-year prod data';
    } else if (!priorYearVerified) {
      reason = 'prior year exists but not verified (YoY check skips unverified)';
    } else if (priorYearValue === 0) {
      reason = 'prior year was 0 (YoY check skips zero baseline)';
    } else {
      yoyRatio = Math.abs(stageValue / priorYearValue);
      wouldYoYFire = yoyRatio > yoyThreshold || yoyRatio < 1 / yoyThreshold;
      if (wouldYoYFire) {
        reason = `BUG: YoY should have fired (${yoyRatio.toFixed(1)}× > ${yoyThreshold}× threshold)`;
      } else {
        reason = `YoY ratio ${yoyRatio.toFixed(1)}× — within ${yoyThreshold}× threshold (prior year also off?)`;
      }
    }

    missedErrorCases.push({ wikidataId, dataPointId, stageValue, prodValue, ratio, priorYearValue, priorYearVerified, yoyRatio, yoyThreshold, wouldYoYFire, reason });
  }

  missedErrorCases.sort((a, b) => b.ratio - a.ratio);

  console.log(`\n${'─'.repeat(90)}`);
  console.log(`Missed 'error' type — why didn't the YoY check fire? (${missedErrorCases.length} cases)`);
  console.log('─'.repeat(90));

  // Summary by reason category
  const reasonCounts = new Map<string, number>();
  for (const e of missedErrorCases) {
    const cat = e.reason.startsWith('YoY ratio') ? 'YoY within threshold (prior year also off or close)' : e.reason;
    reasonCounts.set(cat, (reasonCounts.get(cat) ?? 0) + 1);
  }
  console.log('\nReason breakdown:');
  for (const [r, n] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${r}`);
  }

  // Magnitude buckets
  const buckets = [
    { label: '  < 2×', min: 0,   max: 2   },
    { label: ' 2–5×',  min: 2,   max: 5   },
    { label: '5–20×',  min: 5,   max: 20  },
    { label: ' 20×+',  min: 20,  max: Infinity },
  ];
  console.log('\nMagnitude distribution (stage ÷ current prod):');
  for (const { label, min, max } of buckets) {
    const cases = missedErrorCases.filter((e) => e.ratio >= min && e.ratio < max);
    const bar = '█'.repeat(Math.round(cases.length / Math.max(missedErrorCases.length, 1) * 30));
    console.log(`  ${label}  ${bar} ${cases.length}`);
  }

  // Cases where YoY SHOULD have fired — genuine bugs or data issues
  const bugs = missedErrorCases.filter((e) => e.wouldYoYFire);
  if (bugs.length > 0) {
    console.log(`\n⚠  ${bugs.length} case(s) where YoY check should have fired but didn't:`);
    for (const e of bugs) {
      console.log(`  ${e.wikidataId} / ${e.dataPointId}`);
      console.log(`    stage=${e.stageValue.toFixed(1)}, prod=${e.prodValue.toFixed(1)} (${e.ratio.toFixed(1)}× off from current)`);
      console.log(`    prior=${e.priorYearValue?.toFixed(1)}, YoY ratio=${e.yoyRatio?.toFixed(1)}× vs ${e.yoyThreshold}× threshold`);
    }
  } else {
    console.log('\n✓  No cases where YoY check should have fired but didn\'t.');
  }

  // Top high-ratio cases with explanation
  const highRatio = missedErrorCases.filter((e) => e.ratio >= 5);
  if (highRatio.length > 0) {
    console.log(`\nTop ${Math.min(highRatio.length, 15)} high-ratio misses (ratio ≥ 5×):`);
    for (const e of highRatio.slice(0, 15)) {
      const prior = e.priorYearValue !== null
        ? `prior=${e.priorYearValue.toFixed(1)} (${e.priorYearVerified ? 'verified' : 'unverified'}), YoY=${e.yoyRatio?.toFixed(1) ?? 'n/a'}×`
        : 'no prior year';
      console.log(`  ${e.ratio.toFixed(1)}×  ${e.wikidataId} / ${e.dataPointId}`);
      console.log(`       stage=${e.stageValue.toFixed(1)}, prod=${e.prodValue.toFixed(1)} — ${prior}`);
      console.log(`       → ${e.reason}`);
    }
  }

  if (outputFile) {
    writeFileSync(outputFile, JSON.stringify({ year, totalErrors, scores }, null, 2));
    console.log(`\nResults written to ${outputFile}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
