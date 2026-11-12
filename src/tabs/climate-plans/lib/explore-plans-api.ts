/**
 * Client for climate-plans-pipeline GET /explore/plans.
 *
 * Returns Explore-ready municipality/plan rows from current DB nested tables
 * (in-place latest worker output), not an N+1 over every plan detail.
 */

import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { Measure } from "./measures-types";
import type {
  ExploreDataSource,
  ExploreMunicipalityRecord,
  PipelineCommitment,
} from "./explore-types";
import { collectTefHits } from "./explore-aggregates";

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
  climateRelevantCommitmentCount: number;
  climateCommitmentGroupCount: number;
  adaptationCommitmentCount: number;
  ownCommitmentCount: number;
  commitments: Array<{
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
  plans: ExploreApiPlanRow[];
}

export async function fetchExplorePlans(options?: {
  status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "all";
  groupBy?: "municipality" | "plan";
  requireStep?: string;
}): Promise<ExploreApiResponse | null> {
  const base = getClimatePlansPipelineApiUrl();
  const params = new URLSearchParams();
  params.set("status", options?.status ?? "APPROVED");
  params.set("groupBy", options?.groupBy ?? "municipality");
  params.set("requireStep", options?.requireStep ?? "scoreMeasures");

  try {
    const res = await garboAuthFetch(
      `${base}/explore/plans?${params.toString()}`,
    );
    if (!res.ok) {
      console.warn(
        "[explore-plans-api] GET /explore/plans failed",
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

export function exploreApiPlanToRecord(
  plan: ExploreApiPlanRow,
): ExploreMunicipalityRecord {
  const measures = plan.measures ?? [];
  const commitments: PipelineCommitment[] = (plan.commitments ?? []).map(
    (c) => ({
      text: c.text,
      climateRelevant: c.climateRelevant,
      actionable: c.actionable,
      similarGroupId: c.similarGroupId,
      adaptation: c.adaptation,
      originatesFrom: Array.isArray(c.originatesFrom) ? c.originatesFrom : [],
    }),
  );

  const dataSources: ExploreDataSource[] = [...(plan.dataSources ?? [])];
  if (measures.length > 0 && !dataSources.includes("pipeline-measures")) {
    dataSources.push("pipeline-measures");
  }
  if (commitments.length > 0 && !dataSources.includes("pipeline-commitments")) {
    dataSources.push("pipeline-commitments");
  }

  return {
    id: plan.id,
    name: plan.name,
    regionName: plan.regionName,
    measures,
    commitmentCount: plan.commitmentCount,
    commitmentSource: plan.commitmentSource,
    climateRelevantCommitmentCount: plan.climateRelevantCommitmentCount,
    climateCommitmentGroupCount: plan.climateCommitmentGroupCount,
    adaptationCommitmentCount: plan.adaptationCommitmentCount,
    ownCommitmentCount: plan.ownCommitmentCount,
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
