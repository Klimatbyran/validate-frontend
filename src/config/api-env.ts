/** API targets and browser proxy paths. See docs/API_AND_PROXY_SETUP.md. */

export type ApiTarget = "local" | "stage" | "prod";

export const GARBO_STAGE_ORIGIN = "https://stage.klimatkollen.se";
export const GARBO_PROD_ORIGIN = "https://klimatkollen.se";

export const UNEARTH_STAGE_API = "https://stage-api.unearthdata.ai";
export const UNEARTH_PROD_API = "https://api.unearthdata.ai";

export const GARBO_STAGE_API = "https://stage-api.klimatkollen.se";
export const GARBO_PROD_API = "https://api.klimatkollen.se";

function jointMode(): ApiTarget {
  const v = import.meta.env.VITE_API_MODE as string | undefined;
  if (v === "local" || v === "stage" || v === "prod") return v;
  if (!import.meta.env.DEV && typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("stage") || hostname.includes("staging"))
      return "stage";
    return "prod";
  }
  return "stage";
}

export function getPipelineTarget(): ApiTarget {
  const v = import.meta.env.VITE_PIPELINE_TARGET as string | undefined;
  if (v === "local" || v === "stage" || v === "prod") return v;
  return jointMode();
}

export function getUnearthTarget(): ApiTarget {
  const v =
    (import.meta.env.VITE_UNEARTH_TARGET as string | undefined) ??
    (import.meta.env.VITE_GARBO_TARGET as string | undefined);
  if (v === "local" || v === "stage" || v === "prod") return v;
  return jointMode();
}

export function getGarboTarget(): ApiTarget {
  return getUnearthTarget();
}

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

/** Ignores VITE_PIPELINE_TARGET. */
export function getStagePipelineApiBaseUrl(): string {
  if (import.meta.env.DEV) return "/pipeline-stage-api";
  return "/pipeline-stage-api";
}

export function getStagePipelineUrl(path: string): string {
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  return getStagePipelineApiBaseUrl() + p;
}

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

/** Staff JWT path (Jobbstatus). Garbo twin: `/api/internal-queue-archive` (X-API-Key). */
export function getGarboQueueArchiveUrl(path: string): string {
  const base = getGarboApiBaseUrl().replace(/\/+$/, "");
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  return `${base}/queue-archive${p}`;
}

/** Ignores VITE_UNEARTH_TARGET. */
export function getStageGarboQueueArchiveUrl(path: string): string {
  const base = import.meta.env.DEV ? "/garbo-stage/api" : "/garbo-stage-api";
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  return `${base.replace(/\/+$/, "")}/queue-archive${p}`;
}

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

export const PIPELINE_COMPANIES_LIST_PATH = "/pipeline/companies";

function joinApiPath(base: string, segment: string): string {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedSegment = segment.startsWith("/") ? segment : `/${segment}`;
  return `${normalizedBase}${normalizedSegment}`.replace(/\/+/g, "/");
}

/** Error Browser: staff pipeline list on fixed stage Unearth host. */
export function getStagePipelineCompaniesListUrl(): string {
  return joinApiPath(getStageUnearthUrl("/api"), PIPELINE_COMPANIES_LIST_PATH);
}

/** Error Browser: staff pipeline list on fixed prod Unearth host. */
export function getProdPipelineCompaniesListUrl(): string {
  return joinApiPath(getProdUnearthUrl("/api"), PIPELINE_COMPANIES_LIST_PATH);
}
