/**
 * API config: pipeline vs garbo, with optional per-backend overrides.
 *
 * Three cases:
 * 1. Pipeline (job status, upload, etc.): target = local | stage | prod. App uses relative /api; vite sets proxy from target.
 * 2. Garbo (auth, crawler, etc.): target = local | stage | prod. URLs from getGarbo* below.
 * 3. Error browser: always both stage and prod (getStageGarboUrl / getProdGarboUrl). No target.
 *
 * Overrides:
 * - VITE_API_MODE = joint (sets both pipeline and garbo when not overridden). Default: stage.
 * - VITE_PIPELINE_TARGET = pipeline only (overrides joint for pipeline).
 * - VITE_GARBO_TARGET = garbo only (overrides joint for garbo).
 */

export type ApiTarget = "local" | "stage" | "prod";

const GARBO_STAGE_ORIGIN = "https://stage-api.klimatkollen.se";
const GARBO_PROD_ORIGIN = "https://api.klimatkollen.se";

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

/** Pipeline target. Used by vite for /api proxy. App uses relative /api only. */
export function getPipelineTarget(): ApiTarget {
  const v = import.meta.env.VITE_PIPELINE_TARGET as string | undefined;
  if (v === "local" || v === "stage" || v === "prod") return v;
  return jointMode();
}

/** Garbo target. Used for all garbo URLs (auth, crawler, etc.). */
export function getGarboTarget(): ApiTarget {
  const v = import.meta.env.VITE_GARBO_TARGET as string | undefined;
  if (v === "local" || v === "stage" || v === "prod") return v;
  return jointMode();
}

// --- Garbo (single target: auth, crawler, etc.) ---

/** Garbo base URL (auth = base + "/auth", crawler = base + "/reports/", etc.). Dev: /garbo-local, /garbo-stage, or /garbo (proxy). */
export function getGarboApiBaseUrl(): string {
  const target = getGarboTarget();
  if (import.meta.env.DEV) {
    if (target === "prod") return "/garbo/api";
    if (target === "local") return "/garbo-local/api";
    return "/garbo-stage/api";
  }
  const effective = target === "local" ? "stage" : target;
  return effective === "stage" ? `${GARBO_STAGE_ORIGIN}/api` : `${GARBO_PROD_ORIGIN}/api`;
}

// --- Error browser: always stage + prod (no target) ---

/** Garbo stage URL. Use for comparison only (errors tab). Path e.g. /api/companies. */
export function getStageGarboUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return `/garbo-stage${p}`;
  return `${GARBO_STAGE_ORIGIN}${p}`;
}

/** Garbo prod URL. Use for comparison (errors tab) or prod-only (e.g. company reference). Path e.g. /api/companies. */
export function getProdGarboUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return `/garbo${p}`;
  return `${GARBO_PROD_ORIGIN}${p}`;
}
