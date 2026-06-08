import type { Company } from '../types';
import { DATA_POINTS } from '../types';
import { getDataPointValue, getDataPointVerified, pickReportingPeriodForFilters } from './emissions';

export function isProdCompanyFullyVerifiedForYear(
  prodCompany: Company | undefined,
  dataYear: number,
  reportYear?: number | null,
): boolean {
  if (!prodCompany) return false;
  const prodRP = pickReportingPeriodForFilters(
    prodCompany.reportingPeriods,
    dataYear,
    reportYear,
  );
  if (!prodRP?.emissions) return false;

  // "calculated-total" has no metadata in the API (number | null), so it can't be "verified" — ignore it here.
  return DATA_POINTS.every((dp) => {
    if (dp.id === 'calculated-total') return true;
    const value = getDataPointValue(prodRP.emissions, dp.id);
    if (value === null) return true;
    return getDataPointVerified(prodRP.emissions, dp.id);
  });
}

export function buildProdCompanyVerifiedForYearMap(
  prodMap: Map<string, Company>,
  ids: Iterable<string>,
  dataYear: number,
  reportYear?: number | null,
): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const wikidataId of ids) {
    result.set(
      wikidataId,
      isProdCompanyFullyVerifiedForYear(prodMap.get(wikidataId), dataYear, reportYear),
    );
  }
  return result;
}

