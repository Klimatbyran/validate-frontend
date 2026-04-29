/** Locale-aware display for archive ISO timestamps. */
export function formatArchiveWhen(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return iso;
  }
}
