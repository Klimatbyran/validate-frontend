/**
 * Only linkify / embed internal storage PDF deep links — never arbitrary hrefs.
 * Matches the Editor metadata details guard.
 */
export function trustedSourcePageUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (!url.hostname.toLowerCase().endsWith("storage.googleapis.com")) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/** Page number from a `#page=N` (or `#page=N&…`) fragment, if present. */
export function pageNumberFromSourcePageUrl(
  value: string | null | undefined,
): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const hash = new URL(trimmed).hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const page = Number(params.get("page"));
    return Number.isFinite(page) && page > 0 ? page : null;
  } catch {
    return null;
  }
}
