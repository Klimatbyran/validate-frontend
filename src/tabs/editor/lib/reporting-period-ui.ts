/** Shared helpers and layout tokens for economy / emissions / reporting period editors. */

export function toNumberOrNull(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatDateStamp(isoLike?: string | null): string {
  if (!isoLike) return "—";
  return isoLike.slice(0, 10);
}

export function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

export function formatPeriodDateRange(startDate?: string, endDate?: string): string {
  return `${formatDateStamp(startDate)} – ${formatDateStamp(endDate)}`;
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
