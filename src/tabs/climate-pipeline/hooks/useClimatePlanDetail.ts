import { useState, useEffect, useCallback } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import type { PipelineReview } from "./usePipelineReviews";

export interface Commitment {
  id: string;
  stableId: string;
  section: string;
  text: string;
  context: string;
  type: "TEXT" | "TABLE";
  tableHeader: string | null;
  rowRaw: string | null;
  unverified: boolean;
  climateRelevant: boolean | null;
  adaptation: boolean | null;
  climateFilterReason: string | null;
  actionable: boolean | null;
  actionableReason: string | null;
  similarGroupId: string | null;
  theme: string | null;
}

export interface TransitionElementMatch {
  stableId: string;
  shortLabel: string;
  sectorPath: string;
  score: number;
  matchConfidence: "high" | "mid" | "low";
}

/** Cosine candidates from the TE picker — may lack matchConfidence. */
export interface TransitionElementCandidate {
  stableId: string;
  shortLabel: string;
  sectorPath?: string;
  score: number;
}

export interface ActivityShift {
  id: string;
  activity: string;
  shiftFrom: string;
  shiftTo: string;
  need: string;
  type: string;
  typeReasoning: string;
  score: number;
  reasoning: string;
  transitionElementMatches: TransitionElementMatch[];
  transitionElementCandidates?: TransitionElementCandidate[] | null;
  transitionElementSuggestedNew?: {
    shortLabel: string;
    description: string;
  } | null;
}

export interface MeasureScore {
  id: string;
  activity: string;
  activityShiftScore: number;
  interventionWho: string;
  interventionWhen: string;
  interventionWhat: string;
  interventionHow: string;
  interventionScore: number;
  interventionReasoning: string;
  interventionType: string;
  activityShifts: ActivityShift[];
}

export interface ExtractedMeasure {
  id: string;
  measureText: string;
  climateRelevanceScore: "high" | "mid" | "low";
  score: MeasureScore | null;
}

export interface ClimatePlanDetail {
  id: string;
  url: string;
  extractedMunicipalityName: string | null;
  municipality: { id: string; name: string } | null;
  status: string;
  commitments: Commitment[];
  extractedMeasures: ExtractedMeasure[];
  reviews?: PipelineReview[];
}

export function useClimatePlanDetail(planId: string | null) {
  const [detail, setDetail] = useState<ClimatePlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!planId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${getClimatePlansPipelineApiUrl()}/plans/${planId}`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setDetail((await res.json()) as ClimatePlanDetail);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    setDetail(null);
    fetchDetail();
  }, [fetchDetail]);

  return { detail, isLoading, error, refresh: fetchDetail };
}
