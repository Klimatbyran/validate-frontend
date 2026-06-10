import type { GarboReportingPeriodSummary } from "./types";
import { getPeriodDataYear, getPeriodReportYear } from "./reporting-period-ui";

type PeriodForPublicPick = GarboReportingPeriodSummary & { id: string };

function parseCompanyReportYear(
  reportYear: string | null | undefined,
): number | null {
  const trimmed = reportYear?.trim();
  if (!trimmed || !/^\d{4}$/.test(trimmed)) return null;
  return Number(trimmed);
}

function reportYearForPick(period: PeriodForPublicPick): number | null {
  const fromShell = parseCompanyReportYear(period.companyReport?.reportYear);
  if (fromShell !== null) return fromShell;
  const fallback = getPeriodReportYear(period);
  return fallback ? parseCompanyReportYear(fallback) : null;
}

function publicationTime(period: PeriodForPublicPick): number {
  const raw = period.companyReport?.reportPublicationDate;
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function companyReportIdForPick(period: PeriodForPublicPick): string {
  return (
    period.companyReport?.id?.trim() || period.companyReportId?.trim() || ""
  );
}

/** Negative = prefer `a` over `b` (higher CompanyReport.reportYear wins). */
function preferPeriodFromNewerReport(
  a: PeriodForPublicPick,
  b: PeriodForPublicPick,
): number {
  const yearA = reportYearForPick(a);
  const yearB = reportYearForPick(b);

  if (yearA !== yearB) {
    if (yearA === null) return 1;
    if (yearB === null) return -1;
    return yearB - yearA;
  }

  const pubA = publicationTime(a);
  const pubB = publicationTime(b);
  if (pubA !== pubB) return pubB - pubA;

  return companyReportIdForPick(b).localeCompare(companyReportIdForPick(a));
}

/**
 * Mirrors public API `pickOnePeriodPerDataYear`: one period per data year,
 * preferring the row linked to the newest CompanyReport.reportYear.
 */
export function pickOnePeriodPerDataYear<T extends PeriodForPublicPick>(
  periods: T[],
): T[] {
  const byDataYear = new Map<string, T>();

  for (const period of periods) {
    const dataYear = getPeriodDataYear(period)?.trim();
    if (!dataYear) continue;

    const existing = byDataYear.get(dataYear);
    if (!existing || preferPeriodFromNewerReport(period, existing) < 0) {
      byDataYear.set(dataYear, period);
    }
  }

  return Array.from(byDataYear.values());
}

export function publicPeriodIdsForCompany(
  periods: PeriodForPublicPick[],
): Set<string> {
  return new Set(pickOnePeriodPerDataYear(periods).map((period) => period.id));
}
