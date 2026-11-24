import type { MatchConfidence } from "./measures-types";
import type { TefHit } from "./explore-types";
import { CONFIDENCE_WEIGHT } from "./tef-groups";

export type TefHitLike = Pick<
  TefHit,
  | "measureText"
  | "shiftFrom"
  | "shiftTo"
  | "need"
  | "shiftScore"
  | "confidence"
  | "explicit"
  | "interventionWho"
  | "interventionWhat"
  | "interventionHow"
  | "interventionScore"
> & {
  municipalityId?: string;
  municipalityName?: string;
};

export interface TefMeasureGroup<T extends TefHitLike = TefHitLike> {
  key: string;
  measureText: string;
  municipalityId: string;
  municipalityName: string;
  hits: T[];
  /** Best match confidence among this measure's hits for the TEF. */
  confidence: MatchConfidence;
  /**
   * true if any hit is explicit; false if all judged hits are implied;
   * undefined when no hit carries a judgment.
   */
  explicit: boolean | undefined;
  interventionWho: string;
  interventionWhat: string;
  interventionHow: string;
  interventionScore: number;
  /** Mean activity-shift score across this measure's hits for the TEF. */
  avgShiftScore: number;
}

const CONFIDENCE_RANK: Record<MatchConfidence, number> = {
  high: 3,
  mid: 2,
  low: 1,
};

/** Unique measure within a place (or text alone when place is unknown). */
export function tefMeasureKey(
  hit: Pick<TefHitLike, "measureText"> & { municipalityId?: string },
): string {
  return `${hit.municipalityId ?? ""}::${(hit.measureText ?? "").trim()}`;
}

export function uniqueTefMeasureCount(
  hits: Array<Pick<TefHitLike, "measureText"> & { municipalityId?: string }>,
): number {
  return new Set(hits.map(tefMeasureKey)).size;
}

export function bestConfidence(
  hits: Array<Pick<TefHitLike, "confidence">>,
): MatchConfidence {
  let best: MatchConfidence = "low";
  for (const hit of hits) {
    if (CONFIDENCE_RANK[hit.confidence] > CONFIDENCE_RANK[best]) {
      best = hit.confidence;
    }
  }
  return best;
}

function rollupExplicit(
  hits: Array<Pick<TefHitLike, "explicit">>,
): boolean | undefined {
  let sawJudged = false;
  let anyExplicit = false;
  for (const hit of hits) {
    if (typeof hit.explicit !== "boolean") continue;
    sawJudged = true;
    if (hit.explicit) anyExplicit = true;
  }
  if (!sawJudged) return undefined;
  return anyExplicit;
}

/**
 * Group TEF match rows by unique measure (statement) within a place.
 * Underlying activity-shift rows stay on `hits` so destinations remain visible.
 */
export function groupTefHitsByMeasure<T extends TefHitLike>(
  hits: T[],
): TefMeasureGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const hit of hits) {
    const key = tefMeasureKey(hit);
    const list = buckets.get(key) ?? [];
    list.push(hit);
    buckets.set(key, list);
  }

  return [...buckets.entries()].map(([key, groupHits]) => {
    const sample = groupHits[0]!;
    const shiftSum = groupHits.reduce((s, h) => s + h.shiftScore, 0);
    return {
      key,
      measureText: sample.measureText,
      municipalityId: sample.municipalityId ?? "",
      municipalityName: sample.municipalityName ?? "",
      hits: groupHits,
      confidence: bestConfidence(groupHits),
      explicit: rollupExplicit(groupHits),
      interventionWho: sample.interventionWho,
      interventionWhat: sample.interventionWhat,
      interventionHow: sample.interventionHow,
      interventionScore: sample.interventionScore,
      avgShiftScore: shiftSum / groupHits.length,
    };
  });
}

/** Strength over unique measures: best confidence weight per measure / (3 × measures). */
export function measureWeightedStrength(
  hits: Array<
    Pick<TefHitLike, "measureText" | "confidence"> & { municipalityId?: string }
  >,
): number {
  const groups = groupTefHitsByMeasure(hits);
  if (groups.length === 0) return 0;
  const weightSum = groups.reduce(
    (sum, group) => sum + CONFIDENCE_WEIGHT[group.confidence],
    0,
  );
  const maxWeight = groups.length * CONFIDENCE_WEIGHT.high;
  return maxWeight === 0 ? 0 : weightSum / maxWeight;
}
