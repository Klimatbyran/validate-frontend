/**
 * Client for climate-plans-pipeline GET /explore/plans.
 *
 * Uses a two-step fetch so the API never materializes every municipality's
 * nested measures in one response (that OOMed the 512–768Mi API pod):
 *   1) fields=index → selected plan ids + meta
 *   2) ids=… detail batches → measures for a few plans at a time
 *
 * After a successful index, batch failures throw ExploreFetchError (do not
 * fall back to the legacy N+1 /plans path — that recreates OOM pressure).
 */

import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { Measure } from "./measures-types";
import type {
  ExploreDataSource,
  ExploreMunicipalityRecord,
} from "./explore-types";
import { collectTefHits } from "./explore-aggregates";

/** Must be ≤ climate-plans-pipeline EXPLORE_DETAIL_BATCH_MAX (10). */
export const EXPLORE_DETAIL_BATCH_SIZE = 10;

/** Parallel detail requests — keep low to bound API peak memory. */
const EXPLORE_DETAIL_CONCURRENCY = 2;

const DETAIL_RETRY_ATTEMPTS = 2;

export class ExploreFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExploreFetchError";
  }
}

export type ExploreQueryOptions = {
  status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "all";
  groupBy?: "municipality" | "plan";
  requireStep?: string;
};

export interface ExploreApiPlanRow {
  id: string;
  name: string;
  municipalityId: string | null;
  regionName: string | null;
  county: string | null;
  status: string;
  documentTitle: string | null;
  adoptedYear: number | null;
  adoptedAt: string | null;
  sourceUrl: string;
  markdownChars: number | null;
  companionReferenceCount: number;
  commitmentCount: number;
  commitmentSource: "pipeline-commitments" | "measures-as-proxy";
  /** Null when commitmentSource is measures-as-proxy (no commitment rows). */
  climateRelevantCommitmentCount: number | null;
  climateCommitmentGroupCount: number | null;
  adaptationCommitmentCount: number | null;
  ownCommitmentCount: number | null;
  /** Deprecated — API no longer returns commitment bodies. */
  commitments?: Array<{
    text: string;
    climateRelevant: boolean | null;
    actionable: boolean | null;
    similarGroupId: string | null;
    adaptation: boolean | null;
    originatesFrom: string[];
  }>;
  measures: Measure[];
  dataSources: ExploreDataSource[];
  pipeline?: {
    createdAt: string;
    updatedAt: string;
    scoreMeasuresStatus: string | null;
    matchTransitionElementsStatus: string | null;
  };
}

export interface ExploreApiResponse {
  meta: {
    status: string;
    groupBy: string;
    requireStep: string;
    latestRunSemantics: string;
    planCount: number;
    scannedPlanCount: number;
    readyPlanCount: number;
  };
  /** Present on newer API builds; used for batched detail fetches. */
  planIds?: string[];
  plans: ExploreApiPlanRow[];
}

function exploreQueryParams(options?: ExploreQueryOptions): URLSearchParams {
  const params = new URLSearchParams();
  params.set("status", options?.status ?? "APPROVED");
  params.set("groupBy", options?.groupBy ?? "municipality");
  params.set("requireStep", options?.requireStep ?? "scoreMeasures");
  return params;
}

async function getExploreJson(
  params: URLSearchParams,
  label: string,
): Promise<
  { ok: true; body: ExploreApiResponse } | { ok: false; status: number }
> {
  const base = getClimatePlansPipelineApiUrl();
  const res = await garboAuthFetch(
    `${base}/explore/plans?${params.toString()}`,
  );
  if (!res.ok) {
    console.warn(
      `[explore-plans-api] GET /explore/plans ${label} failed`,
      res.status,
      res.statusText,
    );
    return { ok: false, status: res.status };
  }
  return { ok: true, body: (await res.json()) as ExploreApiResponse };
}

function chunkPlanIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i]!);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function fetchExploreDetailBatchOnce(
  ids: string[],
  options?: ExploreQueryOptions,
): Promise<ExploreApiPlanRow[]> {
  const params = exploreQueryParams(options);
  params.set("fields", "detail");
  params.set("ids", ids.join(","));
  const result = await getExploreJson(params, "detail batch");
  if (!result.ok) {
    if (result.status === 409) {
      throw new ExploreFetchError(
        "Explore detail batch rejected: one or more plans are no longer eligible",
      );
    }
    throw new ExploreFetchError(
      `Explore detail batch failed (${result.status})`,
    );
  }
  const plans = result.body.plans ?? [];
  const got = new Set(plans.map((p) => p.id));
  const missing = ids.filter((id) => !got.has(id));
  if (missing.length > 0) {
    throw new ExploreFetchError(
      `Explore detail batch incomplete (missing ${missing.length} plan(s))`,
    );
  }
  return plans;
}

async function fetchExploreDetailBatch(
  ids: string[],
  options?: ExploreQueryOptions,
): Promise<ExploreApiPlanRow[]> {
  if (ids.length === 0) return [];
  let lastError: unknown;
  for (let attempt = 1; attempt <= DETAIL_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchExploreDetailBatchOnce(ids, options);
    } catch (err) {
      lastError = err;
      // Do not retry eligibility conflicts — selection changed.
      if (
        err instanceof ExploreFetchError &&
        err.message.includes("no longer eligible")
      ) {
        throw err;
      }
      if (attempt < DETAIL_RETRY_ATTEMPTS) {
        console.warn(
          `[explore-plans-api] detail batch retry ${attempt}/${DETAIL_RETRY_ATTEMPTS}`,
          err,
        );
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new ExploreFetchError("Explore detail batch failed");
}

/**
 * Fetch Explore rows: prefer index + batched detail (new API).
 *
 * - Old API (ignores `fields=index`, returns full `plans` without `planIds`):
 *   use that payload as-is.
 * - Index HTTP failure: return null (caller may use legacy) — do **not**
 *   one-shot the heavy detail path (that OOMs the API).
 * - After a successful new-API index: batch failures throw ExploreFetchError
 *   (caller must not fall back to legacy N+1).
 */
export async function fetchExplorePlans(
  options?: ExploreQueryOptions,
): Promise<ExploreApiResponse | null> {
  const params = exploreQueryParams(options);
  params.set("fields", "index");

  let indexResult: Awaited<ReturnType<typeof getExploreJson>>;
  try {
    indexResult = await getExploreJson(params, "fields=index");
  } catch (err) {
    console.warn("[explore-plans-api] climate-plans-pipeline unreachable", err);
    return null;
  }

  if (!indexResult.ok) {
    // 5xx / 401 / 404 — do not fire a one-shot full hydrate.
    return null;
  }

  const index = indexResult.body;
  const planIds = index.planIds;

  if (!Array.isArray(planIds)) {
    // Older API ignored fields=index and returned a full plans payload.
    if (index.plans?.length) return index;
    return index;
  }

  if (planIds.length === 0) {
    return { meta: index.meta, planIds, plans: [] };
  }

  const batches = chunkPlanIds(planIds, EXPLORE_DETAIL_BATCH_SIZE);
  const batchResults = await mapPool(
    batches,
    EXPLORE_DETAIL_CONCURRENCY,
    (batch) => fetchExploreDetailBatch(batch, options),
  );

  const plans = batchResults.flat();
  if (plans.length !== planIds.length) {
    throw new ExploreFetchError(
      `Explore incomplete: expected ${planIds.length} plans, got ${plans.length}`,
    );
  }

  return {
    meta: index.meta,
    planIds,
    plans,
  };
}

export function exploreApiPlanToRecord(
  plan: ExploreApiPlanRow,
): ExploreMunicipalityRecord {
  const measures = plan.measures ?? [];
  const dataSources: ExploreDataSource[] = [...(plan.dataSources ?? [])];
  if (measures.length > 0 && !dataSources.includes("pipeline-measures")) {
    dataSources.push("pipeline-measures");
  }
  if (
    plan.commitmentSource === "pipeline-commitments" &&
    !dataSources.includes("pipeline-commitments")
  ) {
    dataSources.push("pipeline-commitments");
  }

  const proxyOnly = plan.commitmentSource !== "pipeline-commitments";
  const commitmentCount =
    plan.commitmentCount > 0
      ? plan.commitmentCount
      : proxyOnly
        ? new Set(measures.map((m) => m.measure_text)).size
        : 0;

  return {
    id: plan.id,
    name: plan.name,
    regionName: plan.regionName,
    measures,
    commitmentCount,
    commitmentSource: plan.commitmentSource,
    // Zeros from measures-as-proxy would skew KPIs; legacy uses null = no data.
    climateRelevantCommitmentCount: proxyOnly
      ? null
      : plan.climateRelevantCommitmentCount,
    climateCommitmentGroupCount: proxyOnly
      ? null
      : plan.climateCommitmentGroupCount,
    adaptationCommitmentCount: proxyOnly
      ? null
      : plan.adaptationCommitmentCount,
    ownCommitmentCount: proxyOnly ? null : plan.ownCommitmentCount,
    companionReferenceCount: plan.companionReferenceCount,
    markdownChars: plan.markdownChars,
    tefHits: collectTefHits(measures),
    documentTitle: plan.documentTitle,
    adoptedYear: plan.adoptedYear,
    sourceUrl: plan.sourceUrl,
    county: plan.county,
    dataSources,
  };
}
