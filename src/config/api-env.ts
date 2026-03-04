/**
 * API config: pipeline + garbo, with env overrides.
 *
 * Garbo: API base (stage-api / api) for backend calls; origin (stage / klimatkollen) for app links.
 * Pipeline: in dev app uses /pipeline-* (Vite proxy); in prod uses /api. Garbo stage/prod URLs here; Vite imports for dev proxy.
 * Env: VITE_API_MODE (joint), VITE_PIPELINE_TARGET, VITE_GARBO_TARGET. Default: stage.
 *
 * Single-target paths: in the network tab you see which backend you're hitting.
 * Pipeline: /pipeline-local (this machine), /pipeline-stage, /pipeline (prod). Garbo: /garbo-local, /garbo-stage, /garbo.
 */

export type ApiTarget = "local" | "stage" | "prod";

// Frontend app origin (where the FE is served). Use for redirects, "back to site" links, etc.
export const GARBO_STAGE_ORIGIN = "https://stage.klimatkollen.se";
export const GARBO_PROD_ORIGIN = "https://klimatkollen.se";

// API base origin (backend the FE calls). Used here for prod URLs; vite.config imports for dev proxy.
export const GARBO_STAGE_API = "https://stage-api.klimatkollen.se";
export const GARBO_PROD_API = "https://api.klimatkollen.se";

function jointMode(): ApiTarget {
  const v = import.meta.env.VITE_API_MODE as string | undefined;
  if (v === "local" || v === "stage" || v === "prod") return v;
  if (!import.meta.env.DEV && typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("stage") || hostname.includes("staging")) return "stage";
    return "prod";
  }
  return "stage";
}

/** Pipeline target. Used for pipeline API base URL and vite proxy. */
export function getPipelineTarget(): ApiTarget {
  const v = import.meta.env.VITE_PIPELINE_TARGET as string | undefined;
  if (v === "local" || v === "stage" || v === "prod") return v;
  return jointMode();
}

// --- Pipeline (single target: job status, upload, etc.) ---

/** Pipeline API base URL. Dev: /pipeline-local (this machine), /pipeline-stage, or /pipeline (prod). Prod: /api. No trailing slash. */
export function getPipelineApiBaseUrl(): string {
  const target = getPipelineTarget();
  if (import.meta.env.DEV) {
    if (target === "prod") return "/pipeline";
    if (target === "local") return "/pipeline-local";
    return "/pipeline-stage";
  }
  return "/api";
}

/** Pipeline URL for a path (e.g. /processes/batches). No trailing slash on result. */
export function getPipelineUrl(path: string): string {
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  return getPipelineApiBaseUrl() + p;
}

/** Garbo target. Used for all garbo URLs (auth, crawler, etc.). */
export function getGarboTarget(): ApiTarget {
  const v = import.meta.env.VITE_GARBO_TARGET as string | undefined;
  if (v === "local" || v === "stage" || v === "prod") return v;
  return jointMode();
}

// --- Garbo (single target: auth, crawler, etc.) ---

/** Garbo base URL (auth = base + "/auth", etc.). Dev: /garbo-local (this machine), /garbo-stage, or /garbo (prod). No trailing slash. */
export function getGarboApiBaseUrl(): string {
  const target = getGarboTarget();
  let url: string;
  if (import.meta.env.DEV) {
    if (target === "prod") url = "/garbo/api";
    else if (target === "local") url = "/garbo-local/api";
    else url = "/garbo-stage/api";
  } else {
    const effective = target === "local" ? "stage" : target;
    url = effective === "stage" ? `${GARBO_STAGE_API}/api` : `${GARBO_PROD_API}/api`;
  }
  return url.replace(/\/+$/, "");
}

// --- Error browser: always stage + prod (no target) ---

/** Garbo stage API URL. Use for comparison only (errors tab). Path e.g. /api/companies. No trailing slash. */
export function getStageGarboUrl(path: string): string {
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  if (import.meta.env.DEV) return `/garbo-stage${p}`;
  return `${GARBO_STAGE_API}${p}`;
}

/** Garbo prod API URL. Use for comparison (errors tab) or prod-only (e.g. company reference). Path e.g. /api/companies. No trailing slash. */
export function getProdGarboUrl(path: string): string {
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  if (import.meta.env.DEV) return `/garbo${p}`;
  return `${GARBO_PROD_API}${p}`;
}
