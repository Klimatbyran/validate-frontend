import type { Company, ReportingPeriod } from '../types';
import { DATA_POINTS } from '../types';
import { getDataPointValue, getDataPointVerified } from './emissions';
import {
  buildReportingPeriodComparisonSlots,
  pickReportingPeriodsForFilters,
} from './reporting-period-comparison';

export function isProdReportingPeriodFullyVerified(
  prodPeriod: ReportingPeriod | null | undefined,
): boolean {
  if (!prodPeriod?.emissions) return false;

  return DATA_POINTS.every((dp) => {
    if (dp.id === 'calculated-total') return true;
    const value = getDataPointValue(prodPeriod.emissions, dp.id);
    if (value === null) return true;
    return getDataPointVerified(prodPeriod.emissions, dp.id);
  });
}

export function isProdCompanyFullyVerifiedForYear(
  prodCompany: Company | undefined,
  dataYear: number,
  reportYear?: number | null,
): boolean {
  if (!prodCompany) return false;

  const prodPeriods = pickReportingPeriodsForFilters(
    prodCompany.reportingPeriods,
    dataYear,
    reportYear,
  );
  if (prodPeriods.length === 0) return false;

  return prodPeriods.every((period) => isProdReportingPeriodFullyVerified(period));
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

export function buildProdShellVerifiedMap(
  prodMap: Map<string, Company>,
  ids: Iterable<string>,
  dataYear: number,
  reportYear: number | null,
): Map<string, boolean> {
  const result = new Map<string, boolean>();

  for (const wikidataId of ids) {
    const prodCompany = prodMap.get(wikidataId);
    const slots = buildReportingPeriodComparisonSlots(
      undefined,
      prodCompany?.reportingPeriods,
      dataYear,
      reportYear,
    );

    for (const slot of slots) {
      const key = `${wikidataId}:${slot.shellKey}`;
      result.set(key, isProdReportingPeriodFullyVerified(slot.prodPeriod));
    }
  }

  return result;
}
