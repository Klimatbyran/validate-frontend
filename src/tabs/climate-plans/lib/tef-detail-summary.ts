import type { MatchConfidence } from "./measures-types";
import type { TefHit } from "./explore-types";
import { groupTefHitsByMeasure, type TefHitLike } from "./tef-measure-groups";

export interface TefDetailSummary {
  /** Unique measures (statements) matched to this TEF — not activity-shift rows. */
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
  /** Measures where any hit is judged explicit. */
  explicitCount: number;
  /** Measures judged only as implied (no explicit hit). */
  impliedCount: number;
  /** Measures with no explicit/implied judgment (older extracts). */
  unknownExplicitCount: number;
}

function isFilled(value: string): boolean {
  return Boolean(value && value !== "none");
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, n) => s + n, 0) / values.length;
}

/**
 * Aggregate signals for a TEF cell — gist before reading every measure.
 * Counts and fill rates are per unique measure; activity shifts stay nested.
 */
export function summarizeTefHits(
  hits: Array<
    Pick<
      TefHit,
      | "measureText"
      | "interventionWho"
      | "interventionWhat"
      | "interventionHow"
      | "shiftScore"
      | "interventionScore"
      | "confidence"
      | "explicit"
    > & { municipalityId?: string }
  >,
  municipalityCount: number,
): TefDetailSummary {
  const groups = groupTefHitsByMeasure(hits as TefHitLike[]);
  const confidence: Record<MatchConfidence, number> = {
    high: 0,
    mid: 0,
    low: 0,
  };
  let whoFilled = 0;
  let whatFilled = 0;
  let howFilled = 0;
  let explicitCount = 0;
  let impliedCount = 0;
  let unknownExplicitCount = 0;
  const shifts: number[] = [];
  const interventions: number[] = [];

  for (const group of groups) {
    if (isFilled(group.interventionWho)) whoFilled += 1;
    if (isFilled(group.interventionWhat)) whatFilled += 1;
    if (isFilled(group.interventionHow)) howFilled += 1;
    shifts.push(group.avgShiftScore);
    interventions.push(group.interventionScore);
    confidence[group.confidence] += 1;
    if (group.explicit === true) explicitCount += 1;
    else if (group.explicit === false) impliedCount += 1;
    else unknownExplicitCount += 1;
  }

  const avgShiftScore = average(shifts);
  const avgInterventionScore = average(interventions);
  let interventionLean: number | null = null;
  if (avgShiftScore != null && avgInterventionScore != null) {
    const sum = avgShiftScore + avgInterventionScore;
    interventionLean = sum <= 0 ? 0.5 : avgInterventionScore / sum;
  }

  return {
    hitCount: groups.length,
    municipalityCount,
    whoFilled,
    whatFilled,
    howFilled,
    avgShiftScore,
    avgInterventionScore,
    interventionLean,
    confidence,
    explicitCount,
    impliedCount,
    unknownExplicitCount,
  };
}

export type TefEvidenceFilter = "who" | "what" | "how" | MatchConfidence | null;

/** All matches, only implied, or everything that is not known-implied. */
export type TefImpliedFilter = "all" | "implied" | "exclude-implied";

export function hitMatchesEvidenceFilter(
  hit: Pick<
    TefHit,
    "interventionWho" | "interventionWhat" | "interventionHow" | "confidence"
  >,
  filter: TefEvidenceFilter,
): boolean {
  if (!filter) return true;
  if (filter === "who") return isFilled(hit.interventionWho);
  if (filter === "what") return isFilled(hit.interventionWhat);
  if (filter === "how") return isFilled(hit.interventionHow);
  return hit.confidence === filter;
}

export function hitMatchesImpliedFilter(
  hit: Pick<TefHit, "explicit">,
  filter: TefImpliedFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "implied") return hit.explicit === false;
  // exclude-implied: keep explicit + unlabeled (not known to be implied)
  return hit.explicit !== false;
}

export const TEF_IMPLIED_FILTER_OPTIONS: {
  value: TefImpliedFilter;
  label: string;
  shortLabel: string;
}[] = [
  { value: "all", label: "All matches", shortLabel: "All" },
  { value: "implied", label: "Only implied", shortLabel: "Implied" },
  {
    value: "exclude-implied",
    label: "Exclude implied",
    shortLabel: "Exclude implied",
  },
];

export function filterTefHits<T extends Pick<TefHit, "explicit">>(
  hits: T[],
  filter: TefImpliedFilter,
): T[] {
  if (filter === "all") return hits;
  return hits.filter((hit) => hitMatchesImpliedFilter(hit, filter));
}

/** Counts used by the shared All / Implied / Exclude control (raw match rows). */
export function countImpliedFilterBuckets(
  hits: Pick<TefHit, "explicit">[],
): Record<TefImpliedFilter, number> {
  let implied = 0;
  for (const hit of hits) {
    if (hit.explicit === false) implied += 1;
  }
  return {
    all: hits.length,
    implied,
    "exclude-implied": hits.length - implied,
  };
}

/** Same buckets as {@link countImpliedFilterBuckets}, but per unique measure. */
export function countImpliedFilterBucketsByMeasure(
  hits: Array<TefHitLike & Pick<TefHit, "explicit">>,
): Record<TefImpliedFilter, number> {
  const groups = groupTefHitsByMeasure(hits);
  let implied = 0;
  for (const group of groups) {
    if (group.explicit === false) implied += 1;
  }
  return {
    all: groups.length,
    implied,
    "exclude-implied": groups.length - implied,
  };
}

export function hasExplicitJudgment(hits: Pick<TefHit, "explicit">[]): boolean {
  return hits.some((hit) => typeof hit.explicit === "boolean");
}
