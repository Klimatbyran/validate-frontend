/** Shared helpers and layout tokens for economy / emissions / reporting period editors. */

import type { GarboReportingPeriodSummary } from "./types";

export function toNumberOrNull(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isReportingPeriodWithIdAndDates(
  rp: GarboReportingPeriodSummary
): rp is GarboReportingPeriodSummary & { id: string } {
  return Boolean(rp.id && rp.startDate && rp.endDate);
}

export function formatDateStamp(isoLike: string | null | undefined, placeholder: string): string {
  if (!isoLike) return placeholder;
  return isoLike.slice(0, 10);
}

export function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

/** Parse a 4-digit catalog year from a report URL (fallback when API omits companyReport). */
function parseCatalogYearFromUrl(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const matches = raw.match(/(?:19|20)\d{2}/g);
  if (!matches?.length) return null;
  const years = matches
    .map((token) => Number(token))
    .filter((year) => year >= 2000 && year <= 2030);
  if (!years.length) return null;
  return String(Math.max(...years));
}

/** PDF catalog year from linked CompanyReport, else best-effort from report URLs. */
export function getPeriodReportYear(period: {
  companyReport?: { reportYear?: string | null } | null;
  reportURL?: string | null;
  reportS3Url?: string | null;
  s3Url?: string | null;
}): string | null {
  const fromShell = period.companyReport?.reportYear?.trim();
  if (fromShell) return fromShell;
  for (const url of [period.reportURL, period.reportS3Url, period.s3Url]) {
    const fromUrl = parseCatalogYearFromUrl(url);
    if (fromUrl) return fromUrl;
  }
  return null;
}

/** Reporting period data year (DB `year` field, else end/start date). */
export function getPeriodDataYear(period: {
  startDate?: string;
  endDate?: string;
  year?: string | null;
}): string | null {
  const fromField = period.year?.trim();
  if (fromField) return fromField;
  return getPeriodYear(period);
}

export function shortenCompanyReportId(id: string, visibleChars = 8): string {
  const trimmed = id.trim();
  if (trimmed.length <= visibleChars) return trimmed;
  return `${trimmed.slice(0, visibleChars)}…`;
}

/** Data years that appear on more than one reporting period (multiple PDFs). */
export function dataYearsWithMultiplePeriods(
  periods: Array<{ startDate?: string; endDate?: string; year?: string | null }>,
): string[] {
  const counts = new Map<string, number>();
  for (const period of periods) {
    const dataYear = getPeriodDataYear(period);
    if (!dataYear) continue;
    counts.set(dataYear, (counts.get(dataYear) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([year]) => year)
    .sort((a, b) => Number(b) - Number(a));
}

export function formatPeriodDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  placeholder: string
): string {
  return `${formatDateStamp(startDate, placeholder)} – ${formatDateStamp(endDate, placeholder)}`;
}

/** Primary toolbar `Button` / compact control sizing in period editors. */
export const editorDenseToolbarClass = "min-w-0 max-w-none px-3 text-xs h-8";

/** `MultiSelectDropdown` trigger matching toolbar height. */
export const editorDenseMultiSelectTriggerClass = "min-w-[130px] !h-8 !text-xs px-3";

/**
 * Copy-on-write: set or remove a string key on a shallow draft record (editor state).
 */
export function assignNullableStringKey<T extends Record<string, unknown>>(
  prev: T,
  key: string,
  value: string,
  hadOriginalValue: boolean
): T {
  const next: Record<string, unknown> = { ...prev };
  const trimmedEmpty = value.trim() === "";
  if (trimmedEmpty && !hadOriginalValue) {
    delete next[key];
    return next as T;
  }
  next[key] = trimmedEmpty ? "" : value;
  return next as T;
}
