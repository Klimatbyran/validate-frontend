import { getPeriodDataYear } from "@/tabs/editor/lib/reporting-period-ui";
import { pickOnePeriodPerDataYear } from "@/tabs/editor/lib/reporting-period-public-read";
import { resolveCompanyReportSourceUrl } from "@/tabs/errors/lib/cross-env-report-shell";
import {
  getDataPointValue,
  getPeriodReportYearFromApi,
} from "@/tabs/errors/lib";
import {
  DATA_POINTS,
  type Company,
  type ReportingPeriod,
} from "@/tabs/errors/types";
import type { DataPointObservation } from "../types";
import {
  getDataPointMetadata,
  resolveOrigin,
  resolveVerifierName,
} from "./data-point-metadata";

/**
 * Data points that carry an extracted value with its own provenance. The
 * calculated totals are derived server-side from the categories, so flagging
 * them would just restate whatever is already wrong with their inputs.
 */
export const OBSERVED_DATA_POINTS = DATA_POINTS.filter(
  (dp) => dp.id !== "calculated-total" && dp.id !== "scope3-calculated-total",
);

/** One reporting period plus every value observed in it. */
export interface PeriodRecord {
  companyId: string;
  companyName: string;
  wikidataId: string | null;
  tags: string[];
  dataYear: number;
  reportYear: number | null;
  reportUrl: string | null;
  emissions: ReportingPeriod["emissions"];
  /** Observations for this period, keyed by data point id. */
  observations: Map<string, DataPointObservation>;
}

function parseDataYear(period: ReportingPeriod): number | null {
  const raw = getPeriodDataYear(period)?.trim();
  if (!raw) return null;
  const year = Number(raw);
  return Number.isFinite(year) ? year : null;
}

function buildPeriodRecord(
  company: Company,
  period: ReportingPeriod,
): PeriodRecord | null {
  const dataYear = parseDataYear(period);
  if (dataYear === null) return null;

  const record: PeriodRecord = {
    companyId: company.id,
    companyName: company.name,
    wikidataId: company.wikidataId ?? null,
    tags: company.tags ?? [],
    dataYear,
    reportYear: getPeriodReportYearFromApi(period),
    reportUrl:
      resolveCompanyReportSourceUrl(period) ?? period.reportURL ?? null,
    emissions: period.emissions,
    observations: new Map(),
  };

  for (const dataPoint of OBSERVED_DATA_POINTS) {
    const value = getDataPointValue(period.emissions, dataPoint.id);
    if (value === null) continue;

    const metadata = getDataPointMetadata(period.emissions, dataPoint.id);
    record.observations.set(dataPoint.id, {
      key: `${company.id}:${dataYear}:${dataPoint.id}`,
      companyId: company.id,
      companyName: company.name,
      wikidataId: record.wikidataId,
      tags: record.tags,
      dataYear,
      reportYear: record.reportYear,
      reportUrl: record.reportUrl,
      dataPointId: dataPoint.id,
      dataPointLabel: dataPoint.label,
      scope: dataPoint.scope,
      value,
      origin: resolveOrigin(metadata),
      verifiedByName: resolveVerifierName(metadata),
    });
  }

  return record;
}

/**
 * Flatten production companies into one record per company and data year.
 *
 * Duplicate report shells covering the same data year are collapsed with
 * `pickOnePeriodPerDataYear`, the same way the public API picks a winner, so a
 * stale reprocessed row can't show up as a second contradictory data point.
 */
export function buildPeriodRecords(companies: Company[]): PeriodRecord[] {
  const records: PeriodRecord[] = [];

  for (const company of companies) {
    const periods = pickOnePeriodPerDataYear(company.reportingPeriods ?? []);
    for (const period of periods) {
      const record = buildPeriodRecord(company, period);
      if (record) records.push(record);
    }
  }

  return records;
}

export function collectObservations(
  records: PeriodRecord[],
): DataPointObservation[] {
  return records.flatMap((record) => Array.from(record.observations.values()));
}
