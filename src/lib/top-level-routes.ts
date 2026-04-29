/**
 * Top-level app tabs: URL first segment must match Tabs `value` (see ROUTING_URL_STATE.md).
 * Deeper paths (e.g. /editor/company/Q123) still use the first segment for the main tab.
 */
export const TOP_LEVEL_TAB_SEGMENTS = [
  "crawler",
  "registry",
  "upload",
  "jobbstatus",
  "workflow",
  "debug",
  "errors",
  "editor",
  "climate-plans",
] as const;

export type TopLevelTabSegment = (typeof TOP_LEVEL_TAB_SEGMENTS)[number];

export const DEFAULT_TOP_LEVEL_PATH = "/upload";

export function firstPathSegment(pathname: string): string {
  return pathname.replace(/^\//, "").split("/")[0] ?? "";
}

export function topLevelTabFromPathname(
  pathname: string,
): TopLevelTabSegment | null {
  const seg = firstPathSegment(pathname);
  return (TOP_LEVEL_TAB_SEGMENTS as readonly string[]).includes(seg)
    ? (seg as TopLevelTabSegment)
    : null;
}
