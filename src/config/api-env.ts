/**
 * API config: pipeline, Unearth HTTP API, and Garbo monolith (queue-archive).
 *
 * Dev proxies: /pipeline-*, /unearth-*, /garbo-* (see docs/API_AND_PROXY_SETUP.md).
 * Deployed: /api (pipeline), /unearth-api (Unearth), /garbo-api (Garbo monolith queue-archive only).
 * Env: VITE_API_MODE, VITE_PIPELINE_TARGET, VITE_UNEARTH_TARGET (legacy: VITE_GARBO_TARGET).
 */

export type ApiTarget = "local" | "stage" | "prod";

/** Klimatkollen web app (not an API host). Used for “back to site” links. */
export const GARBO_STAGE_ORIGIN = "https://stage.klimatkollen.se";
export const GARBO_PROD_ORIGIN = "https://klimatkollen.se";

/** Unearth HTTP API hosts (auth, companies, registry, …). */
export const UNEARTH_STAGE_API = "https://stage-api.unearthdata.ai";
export const UNEARTH_PROD_API = "https://api.unearthdata.ai";

/** Garbo monolith hosts (workers, Postgres queue-archive). */
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

/** Unearth API target (auth, crawler, registry, …). */
export function getUnearthTarget(): ApiTarget {
  const v =
    (import.meta.env.VITE_UNEARTH_TARGET as string | undefined) ??
    (import.meta.env.VITE_GARBO_TARGET as string | undefined);
  if (v === "local" || v === "stage" || v === "prod") return v;
  return jointMode();
}

/** Garbo monolith target (queue-archive). Same selector as {@link getUnearthTarget}. */
export function getGarboTarget(): ApiTarget {
  return getUnearthTarget();
}

// --- Pipeline ---

/** Pipeline API base URL. Dev: /pipeline-local, /pipeline-stage, or /pipeline. Prod: /api. */
export function getPipelineApiBaseUrl(): string {
  const target = getPipelineTarget();
  if (import.meta.env.DEV) {
    if (target === "prod") return "/pipeline";
    if (target === "local") return "/pipeline-local";
    return "/pipeline-stage";
  }
  return "/api";
}

export function getPipelineUrl(path: string): string {
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  return getPipelineApiBaseUrl() + p;
}

// --- Unearth API ---

/** Unearth API base. Dev: /unearth-stage/api, etc. Prod: /unearth-api. No trailing slash. */
export function getUnearthApiBaseUrl(): string {
  const target = getUnearthTarget();
  let url: string;
  if (import.meta.env.DEV) {
    if (target === "prod") url = "/unearth/api";
    else if (target === "local") url = "/unearth-local/api";
    else url = "/unearth-stage/api";
  } else {
    url = "/unearth-api";
  }
  return url.replace(/\/+$/, "");
}

// --- Garbo monolith (queue-archive only) ---

/** Garbo monolith base. Dev: /garbo-stage/api, etc. Prod: /garbo-api. No trailing slash. */
export function getGarboApiBaseUrl(): string {
  const target = getGarboTarget();
  let url: string;
  if (import.meta.env.DEV) {
    if (target === "prod") url = "/garbo/api";
    else if (target === "local") url = "/garbo-local/api";
    else url = "/garbo-stage/api";
  } else {
    url = "/garbo-api";
  }
  return url.replace(/\/+$/, "");
}

/** Queue-archive paths on the Garbo monolith (`/api/queue-archive/…` on the server). */
export function getGarboQueueArchiveUrl(path: string): string {
  const base = getGarboApiBaseUrl().replace(/\/+$/, "");
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  return `${base}/queue-archive${p}`;
}

// --- Errors tab: fixed Unearth stage + prod (ignores target) ---

export function getStageUnearthUrl(path: string): string {
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  if (import.meta.env.DEV) return `/unearth-stage${p}`;
  return `/unearth-stage-api${p}`;
}

export function getProdUnearthUrl(path: string): string {
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  if (import.meta.env.DEV) return `/unearth${p}`;
  return `/unearth-prod-api${p}`;
}

/** @deprecated Use {@link getStageUnearthUrl} */
export function getStageGarboUrl(path: string): string {
  return getStageUnearthUrl(path);
}

/** @deprecated Use {@link getProdUnearthUrl} */
export function getProdGarboUrl(path: string): string {
  return getProdUnearthUrl(path);
}
