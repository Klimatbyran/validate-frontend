import type { Company } from '../types';
import { DATA_POINTS } from '../types';
import { getDataPointValue, getDataPointVerified, pickReportingPeriodForYear } from './emissions';

export function isProdCompanyFullyVerifiedForYear(
  prodCompany: Company | undefined,
  year: number
): boolean {
  if (!prodCompany) return false;
  const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, year);
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
  year: number
): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const wikidataId of ids) {
    result.set(wikidataId, isProdCompanyFullyVerifiedForYear(prodMap.get(wikidataId), year));
  }
  return result;
}

