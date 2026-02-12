import { getPublicApiUrl } from '@/lib/utils';
import { DiscrepancyType, ReportingPeriod, DATA_POINTS } from './types';

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
