/** API targets and browser proxy paths. See docs/API_AND_PROXY_SETUP.md. */

export type ApiTarget = "local" | "stage" | "prod";

/** Errors tab "Stage source" toggle - where the stage-side pipeline reads come from. */
export type ErrorBrowserStageSource = "stage" | "local";

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

/**
 * Error Browser: fixed pipeline-api host matching its "Stage source" toggle -
 * ignores VITE_PIPELINE_TARGET, same as getStagePipelineUrl/
 * getStageOrLocalPipelineCompaniesListUrl. Use for anything the Errors
 * browser submits to the pipeline (e.g. a rerun), not just reads - it must
 * hit the same environment the row's data (and its stage-only ids) came from.
 */
export function getErrorBrowserPipelineUrl(
  path: string,
  source: ErrorBrowserStageSource,
): string {
  if (source === "local" && import.meta.env.DEV) {
    const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
    return `/pipeline-local${p}`;
  }
  return getStagePipelineUrl(path);
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

/**
 * climate-plans-pipeline's /api/webhook (routes are mounted under /api —
 * see its src/api/app.ts), sent as the upload's callbackUrl so garbo POSTs
 * {url, markdown} there once Docling parsing completes, instead of
 * continuing into precheck. This is a plain absolute URL, not proxied
 * through Vite/nginx like the other targets above — garbo's worker calls it
 * server-to-server, so the browser never needs to reach it directly (only
 * pipeline-api needs to receive the string and pass it through as job data).
 * Locally, climate-plans-pipeline must run on a port other than 3001, since
 * pipeline-api's own local dev port is also 3001 by default (garbo itself
 * may also be on a non-default port — check its own .env's API_PORT).
 * Must also be listed in garbo's ALLOWED_CALLBACK_URLS or the callback will
 * be rejected. Falls back to jointMode()'s hostname detection like the rest
 * of this file (rather than always defaulting to localhost), since a build
 * deployed to stage/prod must send a real reachable URL, not one that only
 * resolves on whoever's laptop is running validate locally. Production
 * climate-plans-pipeline isn't deployed yet — the URL below is where it
 * will live once it is, matching its own k8s/overlays/production/ingress.
 */
export function getClimatePlansPipelineWebhookUrl(): string {
  const override = import.meta.env.VITE_CLIMATE_PLANS_PIPELINE_WEBHOOK_URL as
    | string
    | undefined;
  if (override) return override;
  const target = jointMode();
  if (target === "stage")
    return "https://stage-climate-plans-api.klimatkollen.se/api/webhook";
  if (target === "prod")
    return "https://climate-plans-api.klimatkollen.se/api/webhook";
  return "http://localhost:3003/api/webhook";
}

/**
 * ReportType.slug garbo tags persisted markdown with when the climate plans
 * pipeline checkbox is on — an explicit opt-in sent alongside callbackUrl,
 * not inferred from callbackUrl's mere presence, since callbackUrl is a
 * generic hand-off mechanism other future consumers could use too.
 */
export const CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG = "municipal-climate-plan";

/** X-API-Key twin of staff GET /api/pipeline/companies — proxy injects the key. */
export const PIPELINE_COMPANIES_LIST_PATH = "/internal-pipeline/companies";

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

/**
 * climate-plans-pipeline's own API — read directly by the browser (unlike
 * the callbackUrl garbo posts to server-side), so this one genuinely needs
 * to be reachable from wherever validate is running. Same jointMode()
 * hostname detection as getClimatePlansPipelineWebhookUrl() above, for the
 * same reason — see that function's comment. CORS is open on the API side
 * (registered with @fastify/cors defaults), so a direct cross-origin browser
 * call works without needing a same-origin proxy path like the rest of this
 * file uses for pipeline-api/unearth.
 */
export function getClimatePlansPipelineApiUrl(): string {
  const override = import.meta.env.VITE_CLIMATE_PLANS_PIPELINE_API_URL as
    | string
    | undefined;
  if (override) return override;
  const target = jointMode();
  if (target === "stage")
    return "https://stage-climate-plans-api.klimatkollen.se/api";
  if (target === "prod") return "https://climate-plans-api.klimatkollen.se/api";
  return "http://localhost:3003/api";
}
