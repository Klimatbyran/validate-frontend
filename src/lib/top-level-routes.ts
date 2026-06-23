/** First URL segment selects the main tab. See docs/ROUTING_URL_STATE.md. */
export const TOP_LEVEL_TAB_SEGMENTS = [
  "crawler",
  "registry",
  "overview",
  "upload",
  "access",
  "jobbstatus",
  "workflow",
  "debug",
  "errors",
  "editor",
  "climate-plans",
] as const;

export type TopLevelTabSegment = (typeof TOP_LEVEL_TAB_SEGMENTS)[number];

export const DEFAULT_TOP_LEVEL_PATH = "/crawler";

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
