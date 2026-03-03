/**
 * Central API environment config: single-backend (auth, crawler, pipeline) vs
 * comparison (errors tab = always stage + prod).
 *
 * - Single-backend: one target at a time (local | stage | prod) via VITE_API_MODE.
 * - Comparison: always stage and prod; use getStageKkApiUrl / getProdKkApiUrl.
 */

export type ApiMode = "local" | "stage" | "prod";

const KK_STAGE_ORIGIN = "https://stage-api.klimatkollen.se";
const KK_PROD_ORIGIN = "https://api.klimatkollen.se";
const AUTH_STAGE_ORIGIN = "https://stage.klimatkollen.se";
const AUTH_PROD_ORIGIN = "https://api.klimatkollen.se";

/** Resolve API mode: env override, then hostname when deployed, else dev default "stage". */
export function getApiMode(): ApiMode {
  const envMode = import.meta.env.VITE_API_MODE as string | undefined;
  if (envMode === "local" || envMode === "stage" || envMode === "prod") {
    return envMode;
  }
  if (!import.meta.env.DEV) {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    if (hostname.includes("stage") || hostname.includes("staging")) return "stage";
    return "prod";
  }
  return "stage";
}

// --- Single-backend: one API at a time (auth, pipeline proxy, crawler/reports) ---

/** Auth API base URL. In dev uses proxy /api/auth (target set in vite.config). Deployed uses stage or prod by hostname. */
export function getAuthApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return "/api/auth";
  }
  const mode = getApiMode();
  if (mode === "stage") return `${AUTH_STAGE_ORIGIN}/api/auth`;
  return `${AUTH_PROD_ORIGIN}/api/auth`;
}

/**
 * Klimatkollen API base URL for single-backend use (e.g. a feature that needs
 * one KK API by mode). Crawler uses relative /api (pipeline backend) instead.
 */
export function getKkApiBaseUrl(): string {
  const mode = getApiMode();
  if (import.meta.env.DEV) {
    if (mode === "prod") return "/kkapi/api";
    return "/stagekkapi/api";
  }
  if (mode === "stage") return `${KK_STAGE_ORIGIN}/api`;
  return `${KK_PROD_ORIGIN}/api`;
}

/** Prod public API (for job status reference data that compares to prod). Path e.g. /api/companies/123. */
export function getPublicApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return `/kkapi${p}`;
  return `${KK_PROD_ORIGIN}${p}`;
}

// --- Comparison: always stage and prod (errors tab) ---

/** Stage Klimatkollen URL for a path. Use for comparison views that always need stage. Path e.g. /api/companies. */
export function getStageKkApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return `/stagekkapi${p}`;
  return `${KK_STAGE_ORIGIN}${p}`;
}

/** Prod Klimatkollen URL for a path. Use for comparison views that always need prod. Path e.g. /api/companies. */
export function getProdKkApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return `/kkapi${p}`;
  return `${KK_PROD_ORIGIN}${p}`;
}
