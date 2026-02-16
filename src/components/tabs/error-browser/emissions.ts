import { ReportingPeriod, DATA_POINTS } from './types';

// Emission values can be either a plain number or an object with { total: number }
export function extractTotal(
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

/** Pick the reporting period for a given year (prefer full calendar year). */
export function pickReportingPeriodForYear(
  reportingPeriods: ReportingPeriod[] | undefined,
  year: number
): ReportingPeriod | null {
  if (!reportingPeriods || reportingPeriods.length === 0) return null;

  const periodsForYear = reportingPeriods.filter((rp) => {
    const endDate = new Date(rp.endDate);
    return endDate.getFullYear() === year;
  });

  if (periodsForYear.length === 0) return null;

  const fullYear = periodsForYear.find((rp) => {
    const start = new Date(rp.startDate);
    const end = new Date(rp.endDate);
    return (
      start.getMonth() === 0 &&
      start.getDate() === 1 &&
      end.getMonth() === 11 &&
      end.getDate() === 31
    );
  });

  return fullYear || periodsForYear[periodsForYear.length - 1];
}

type Scope3Emissions = NonNullable<NonNullable<ReportingPeriod['emissions']>['scope3']>;

/** Get value for a specific scope 3 category. */
export function getCategoryValue(
  scope3: Scope3Emissions | null | undefined,
  categoryNum: number
): number | null {
  if (!scope3?.categories) return null;
  const cat = scope3.categories.find((c: { category: number; total: number | null }) => c.category === categoryNum);
  return cat?.total ?? null;
}

/** Get value for a data point from emissions. */
export function getDataPointValue(
  emissions: ReportingPeriod['emissions'] | null | undefined,
  dataPointId: string
): number | null {
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

  const dataPoint = DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (dataPoint?.category) return getCategoryValue(scope3, dataPoint.category);

  return null;
}
