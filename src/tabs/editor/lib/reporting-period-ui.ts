/** Shared helpers and layout tokens for economy / emissions / reporting period editors. */

import type { GarboReportingPeriodSummary } from "./types";

export function toNumberOrNull(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isReportingPeriodWithIdAndDates(
  rp: GarboReportingPeriodSummary,
): rp is GarboReportingPeriodSummary & { id: string } {
  return Boolean(rp.id && rp.startDate && rp.endDate);
}

export function formatDateStamp(
  isoLike: string | null | undefined,
  placeholder: string,
): string {
  if (!isoLike) return placeholder;
  return isoLike.slice(0, 10);
}

export function getPeriodYear(period: {
  startDate?: string;
  endDate?: string;
}): string | null {
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

export type CompanyReportYearSource = "companyReport" | "urlEstimate";

/** CompanyReport.reportYear from the linked shell only (no URL guess). */
export function getPersistedCompanyReportYearFromPeriod(period: {
  companyReport?: { id?: string | null; reportYear?: string | null } | null;
  companyReportId?: string | null;
}): string | null {
  return period.companyReport?.reportYear?.trim() || null;
}

/** Look up persisted shell year by CompanyReport id from API list rows or period embeds. */
export function lookupPersistedCompanyReportYear(
  companyReportId: string | null | undefined,
  shells: Array<{ id?: string; reportYear?: string | null }>,
  periods: Array<{
    companyReportId?: string | null;
    companyReport?: { id?: string | null; reportYear?: string | null } | null;
  }> = [],
): string | null {
  const id = companyReportId?.trim();
  if (!id) return null;

  const fromShellList = shells.find((shell) => shell.id?.trim() === id);
  const listYear = fromShellList?.reportYear?.trim();
  if (listYear) return listYear;

  for (const period of periods) {
    const periodShellId =
      period.companyReportId?.trim() ?? period.companyReport?.id?.trim();
    if (periodShellId !== id) continue;
    const embeddedYear = period.companyReport?.reportYear?.trim();
    if (embeddedYear) return embeddedYear;
  }

  return null;
}

/** CompanyReport.reportYear on the linked shell, else a URL estimate when the shell year is missing. */
export function resolveCompanyReportYearFromPeriod(period: {
  companyReport?: { reportYear?: string | null } | null;
  reportURL?: string | null;
  reportS3Url?: string | null;
  s3Url?: string | null;
}): { year: string | null; source: CompanyReportYearSource | null } {
  const fromShell = getPersistedCompanyReportYearFromPeriod(period);
  if (fromShell) {
    return { year: fromShell, source: "companyReport" };
  }
  for (const url of [period.reportURL, period.reportS3Url, period.s3Url]) {
    const fromUrl = parseCatalogYearFromUrl(url);
    if (fromUrl) {
      return { year: fromUrl, source: "urlEstimate" };
    }
  }
  return { year: null, source: null };
}

export function getCompanyReportYearFromPeriod(period: {
  companyReport?: { reportYear?: string | null } | null;
  reportURL?: string | null;
  reportS3Url?: string | null;
  s3Url?: string | null;
}): string | null {
  return resolveCompanyReportYearFromPeriod(period).year;
}

/** @deprecated Use getCompanyReportYearFromPeriod */
export const getPeriodReportYear = getCompanyReportYearFromPeriod;

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

/** Secondary id line — matches wikidataId under company name in the overview table. */
export const editorSecondaryIdTextClass = "text-xs text-gray-02 break-all";

/** Data years that appear on more than one reporting period (multiple PDFs). */
export function dataYearsWithMultiplePeriods(
  periods: Array<{
    startDate?: string;
    endDate?: string;
    year?: string | null;
  }>,
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
  placeholder: string,
): string {
  return `${formatDateStamp(startDate, placeholder)} – ${formatDateStamp(endDate, placeholder)}`;
}

/** Primary toolbar `Button` / compact control sizing in period editors. */
export const editorDenseToolbarClass = "min-w-0 max-w-none px-3 text-xs h-8";

/** `MultiSelectDropdown` trigger matching toolbar height. */
export const editorDenseMultiSelectTriggerClass =
  "min-w-[130px] !h-8 !text-xs px-3";

/**
 * Copy-on-write: set or remove a string key on a shallow draft record (editor state).
 */
export function assignNullableStringKey<T extends Record<string, unknown>>(
  prev: T,
  key: string,
  value: string,
  hadOriginalValue: boolean,
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
