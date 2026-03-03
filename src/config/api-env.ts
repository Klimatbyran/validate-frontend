/**
 * API config: pipeline (validate backend) vs garbo (Klimatkollen public API).
 * - VITE_API_MODE: which backend to use (local | stage | prod) for pipeline + auth.
 * - Crawler: garbo only (getGarboApiBaseUrl).
 * - Errors tab: always stage + prod garbo (comparison).
 */

export type ApiMode = "local" | "stage" | "prod";

const GARBO_STAGE_ORIGIN = "https://stage-api.klimatkollen.se";
const GARBO_PROD_ORIGIN = "https://api.klimatkollen.se";
const AUTH_STAGE_ORIGIN = "https://stage.klimatkollen.se";
const AUTH_PROD_ORIGIN = "https://api.klimatkollen.se";

export function getApiMode(): ApiMode {
  const envMode = import.meta.env.VITE_API_MODE as string | undefined;
  if (envMode === "local" || envMode === "stage" || envMode === "prod") return envMode;
  if (!import.meta.env.DEV) {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    if (hostname.includes("stage") || hostname.includes("staging")) return "stage";
    return "prod";
  }
  return "stage";
}

export function getAuthApiBaseUrl(): string {
  if (import.meta.env.DEV) return "/api/auth";
  return getApiMode() === "stage" ? `${AUTH_STAGE_ORIGIN}/api/auth` : `${AUTH_PROD_ORIGIN}/api/auth`;
}

/** Garbo API base (single backend by mode). Used by crawler. Dev: /garbo-stage or /garbo. */
export function getGarboApiBaseUrl(): string {
  const mode = getApiMode();
  if (import.meta.env.DEV) return mode === "prod" ? "/garbo/api" : "/garbo-stage/api";
  return mode === "stage" ? `${GARBO_STAGE_ORIGIN}/api` : `${GARBO_PROD_ORIGIN}/api`;
}

/** Garbo stage URL (comparison). Path e.g. /api/companies. */
export function getStageGarboUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return `/garbo-stage${p}`;
  return `${GARBO_STAGE_ORIGIN}${p}`;
}

/** Garbo prod URL (comparison). Path e.g. /api/companies. */
export function getProdGarboUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return `/garbo${p}`;
  return `${GARBO_PROD_ORIGIN}${p}`;
}

