/**
 * Client for climate-plans-pipeline GET /explore/plans.
 *
 * Uses a two-step fetch so the API never materializes every municipality's
 * nested measures in one response (that OOMed the 512–768Mi API pod):
 *   1) fields=index → selected plan ids + meta
 *   2) ids=… detail batches → measures for a few plans at a time
 */

import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { Measure } from "./measures-types";
import type {
  ExploreDataSource,
  ExploreMunicipalityRecord,
} from "./explore-types";
import { collectTefHits } from "./explore-aggregates";

/** Keep in sync with climate-plans-pipeline EXPLORE_DETAIL_BATCH_MAX. */
export const EXPLORE_DETAIL_BATCH_SIZE = 5;

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
  /** Deprecated: API returns [] — KPIs use the count fields above. */
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

function exploreQueryParams(options?: {
  status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "all";
  groupBy?: "municipality" | "plan";
  requireStep?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("status", options?.status ?? "APPROVED");
  params.set("groupBy", options?.groupBy ?? "municipality");
  params.set("requireStep", options?.requireStep ?? "scoreMeasures");
  return params;
}

async function fetchExploreIndex(options?: {
  status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "all";
  groupBy?: "municipality" | "plan";
  requireStep?: string;
}): Promise<ExploreApiResponse | null> {
  const base = getClimatePlansPipelineApiUrl();
  const params = exploreQueryParams(options);
  params.set("fields", "index");
  try {
    const res = await garboAuthFetch(
      `${base}/explore/plans?${params.toString()}`,
    );
    if (!res.ok) {
      console.warn(
        "[explore-plans-api] GET /explore/plans?fields=index failed",
        res.status,
        res.statusText,
      );
      return null;
    }
    return (await res.json()) as ExploreApiResponse;
  } catch (err) {
    console.warn("[explore-plans-api] climate-plans-pipeline unreachable", err);
    return null;
  }
}

async function fetchExploreDetailBatch(
  ids: string[],
  options?: {
    status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "all";
    groupBy?: "municipality" | "plan";
    requireStep?: string;
  },
): Promise<ExploreApiPlanRow[] | null> {
  if (ids.length === 0) return [];
  const base = getClimatePlansPipelineApiUrl();
  const params = exploreQueryParams(options);
  params.set("fields", "detail");
  params.set("ids", ids.join(","));
  try {
    const res = await garboAuthFetch(
      `${base}/explore/plans?${params.toString()}`,
    );
    if (!res.ok) {
      console.warn(
        "[explore-plans-api] GET /explore/plans detail batch failed",
        res.status,
        res.statusText,
      );
      return null;
    }
    const body = (await res.json()) as ExploreApiResponse;
    return body.plans ?? [];
  } catch (err) {
    console.warn("[explore-plans-api] detail batch unreachable", err);
    return null;
  }
}

async function fetchExploreOneShot(options?: {
  status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "all";
  groupBy?: "municipality" | "plan";
  requireStep?: string;
}): Promise<ExploreApiResponse | null> {
  const base = getClimatePlansPipelineApiUrl();
  const params = exploreQueryParams(options);
  try {
    const res = await garboAuthFetch(
      `${base}/explore/plans?${params.toString()}`,
    );
    if (!res.ok) {
      console.warn(
        "[explore-plans-api] GET /explore/plans one-shot failed",
        res.status,
        res.statusText,
      );
      return null;
    }
    return (await res.json()) as ExploreApiResponse;
  } catch (err) {
    console.warn("[explore-plans-api] one-shot explore unreachable", err);
    return null;
  }
}

/**
 * Fetch Explore rows: prefer index + batched detail (new API). Falls back to
 * a single one-shot detail request when `planIds` is missing (older API) or
 * when `fields=index` is rejected.
 */
export async function fetchExplorePlans(options?: {
  status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "all";
  groupBy?: "municipality" | "plan";
  requireStep?: string;
}): Promise<ExploreApiResponse | null> {
  const index = await fetchExploreIndex(options);
  if (!index) return fetchExploreOneShot(options);

  const planIds = index.planIds;
  if (!Array.isArray(planIds)) {
    // Older API ignored fields=index and returned a full plans payload.
    if (index.plans?.length) return index;
    return fetchExploreOneShot(options);
  }

  if (planIds.length === 0) {
    return { meta: index.meta, planIds, plans: [] };
  }

  const plans: ExploreApiPlanRow[] = [];
  for (let i = 0; i < planIds.length; i += EXPLORE_DETAIL_BATCH_SIZE) {
    const batch = planIds.slice(i, i + EXPLORE_DETAIL_BATCH_SIZE);
    const rows = await fetchExploreDetailBatch(batch, options);
    if (rows == null) return null;
    plans.push(...rows);
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
