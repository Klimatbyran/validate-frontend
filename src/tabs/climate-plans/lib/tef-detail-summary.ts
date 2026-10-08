import type { MatchConfidence } from "./measures-types";
import type { TefHit } from "./explore-types";

export interface TefDetailSummary {
  hitCount: number;
  municipalityCount: number;
  whoFilled: number;
  whatFilled: number;
  howFilled: number;
  avgShiftScore: number | null;
  avgInterventionScore: number | null;
  /** 0 = all shift, 1 = all intervention; null when both averages missing. */
  interventionLean: number | null;
  confidence: Record<MatchConfidence, number>;
}

function isFilled(value: string): boolean {
  return Boolean(value && value !== "none");
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, n) => s + n, 0) / values.length;
}

/** Aggregate signals for a TEF cell — gist before reading every hit. */
export function summarizeTefHits(
  hits: Pick<
    TefHit,
    | "interventionWho"
    | "interventionWhat"
    | "interventionHow"
    | "shiftScore"
    | "interventionScore"
    | "confidence"
  >[],
  municipalityCount: number,
): TefDetailSummary {
  const confidence: Record<MatchConfidence, number> = {
    high: 0,
    mid: 0,
    low: 0,
  };
  let whoFilled = 0;
  let whatFilled = 0;
  let howFilled = 0;
  const shifts: number[] = [];
  const interventions: number[] = [];

  for (const hit of hits) {
    if (isFilled(hit.interventionWho)) whoFilled += 1;
    if (isFilled(hit.interventionWhat)) whatFilled += 1;
    if (isFilled(hit.interventionHow)) howFilled += 1;
    shifts.push(hit.shiftScore);
    interventions.push(hit.interventionScore);
    confidence[hit.confidence] += 1;
  }

  const avgShiftScore = average(shifts);
  const avgInterventionScore = average(interventions);
  let interventionLean: number | null = null;
  if (avgShiftScore != null && avgInterventionScore != null) {
    const sum = avgShiftScore + avgInterventionScore;
    interventionLean = sum <= 0 ? 0.5 : avgInterventionScore / sum;
  }

  return {
    hitCount: hits.length,
    municipalityCount,
    whoFilled,
    whatFilled,
    howFilled,
    avgShiftScore,
    avgInterventionScore,
    interventionLean,
    confidence,
  };
}

export type TefEvidenceFilter =
  | "who"
  | "what"
  | "how"
  | MatchConfidence
  | null;

export function hitMatchesEvidenceFilter(
  hit: Pick<
    TefHit,
    | "interventionWho"
    | "interventionWhat"
    | "interventionHow"
    | "confidence"
  >,
  filter: TefEvidenceFilter,
): boolean {
  if (!filter) return true;
  if (filter === "who") return isFilled(hit.interventionWho);
  if (filter === "what") return isFilled(hit.interventionWhat);
  if (filter === "how") return isFilled(hit.interventionHow);
  return hit.confidence === filter;
}
