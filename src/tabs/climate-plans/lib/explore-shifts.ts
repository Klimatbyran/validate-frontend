import type { ExploreMunicipalityRecord, TefHit } from "./explore-types";
import type { Measure } from "./measures-types";

export interface ShiftFlowEdge {
  from: string;
  to: string;
  count: number;
  municipalities: string[];
  avgShiftScore: number;
  withTefMatch: number;
}

export interface InterventionTypeBucket {
  type: string;
  count: number;
  avgScore: number;
}

export interface MeasureShiftInterventionPoint {
  municipalityId: string;
  municipalityName: string;
  measureText: string;
  activityShiftScore: number;
  interventionScore: number;
  interventionType: string;
  shiftCount: number;
  tefMatchCount: number;
  hasWho: boolean;
  hasWhat: boolean;
  hasWhen: boolean;
  hasHow: boolean;
}

export interface MunicipalityShiftSummary {
  municipalityId: string;
  municipalityName: string;
  measureCount: number;
  shiftPresentCount: number;
  interventionPresentCount: number;
  avgActivityShiftScore: number;
  avgInterventionScore: number;
  tefHitCount: number;
  typedInterventionCount: number;
}

function isPresent(value: string | null | undefined): boolean {
  return Boolean(value && value !== "none");
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, n) => s + n, 0) / values.length;
}

function normalizeLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed || "(unspecified)";
}

/** Score > 1 means the dimension was judged present in the measure. */
export function dimensionPresent(score: number): boolean {
  return score > 1;
}

export function collectMeasurePoints(
  records: ExploreMunicipalityRecord[],
): MeasureShiftInterventionPoint[] {
  const points: MeasureShiftInterventionPoint[] = [];
  for (const record of records) {
    for (const measure of record.measures) {
      const tefMatchCount = countTefMatches(measure);
      points.push({
        municipalityId: record.id,
        municipalityName: record.name,
        measureText: measure.measure_text,
        activityShiftScore: measure.activity_shift_score,
        interventionScore: measure.intervention_score,
        interventionType: measure.intervention_type || "none",
        shiftCount: measure.activity_shifts?.length ?? 0,
        tefMatchCount,
        hasWho: isPresent(measure.intervention_who),
        hasWhat: isPresent(measure.intervention_what),
        hasWhen: isPresent(measure.intervention_when),
        hasHow: isPresent(measure.intervention_how),
      });
    }
  }
  return points;
}

function countTefMatches(measure: Measure): number {
  let count = 0;
  for (const shift of measure.activity_shifts ?? []) {
    count += shift.transition_element_matches?.length ?? 0;
  }
  return count;
}

export function summarizeMunicipalities(
  records: ExploreMunicipalityRecord[],
): MunicipalityShiftSummary[] {
  return records
    .map((record) => {
      const measures = record.measures;
      const shiftScores = measures.map((m) => m.activity_shift_score);
      const interventionScores = measures.map((m) => m.intervention_score);
      return {
        municipalityId: record.id,
        municipalityName: record.name,
        measureCount: measures.length,
        shiftPresentCount: measures.filter((m) =>
          dimensionPresent(m.activity_shift_score),
        ).length,
        interventionPresentCount: measures.filter((m) =>
          dimensionPresent(m.intervention_score),
        ).length,
        avgActivityShiftScore: average(shiftScores),
        avgInterventionScore: average(interventionScores),
        tefHitCount: record.tefHits.length,
        typedInterventionCount: measures.filter(
          (m) => m.intervention_type && m.intervention_type !== "none",
        ).length,
      };
    })
    .filter((row) => row.measureCount > 0)
    .sort((a, b) => b.measureCount - a.measureCount);
}

export function buildShiftFlows(
  records: ExploreMunicipalityRecord[],
  limit = 12,
): ShiftFlowEdge[] {
  const byKey = new Map<
    string,
    {
      from: string;
      to: string;
      count: number;
      municipalities: Set<string>;
      scoreSum: number;
      withTefMatch: number;
    }
  >();

  for (const record of records) {
    for (const measure of record.measures) {
      for (const shift of measure.activity_shifts ?? []) {
        const from = normalizeLabel(shift.shift_from);
        const to = normalizeLabel(shift.shift_to);
        const key = `${from.toLowerCase()}→${to.toLowerCase()}`;
        const existing = byKey.get(key) ?? {
          from,
          to,
          count: 0,
          municipalities: new Set<string>(),
          scoreSum: 0,
          withTefMatch: 0,
        };
        existing.count += 1;
        existing.municipalities.add(record.name);
        existing.scoreSum += shift.score ?? 0;
        if ((shift.transition_element_matches?.length ?? 0) > 0) {
          existing.withTefMatch += 1;
        }
        byKey.set(key, existing);
      }
    }
  }

  return [...byKey.values()]
    .map((row) => ({
      from: row.from,
      to: row.to,
      count: row.count,
      municipalities: [...row.municipalities].sort((a, b) =>
        a.localeCompare(b),
      ),
      avgShiftScore: row.count === 0 ? 0 : row.scoreSum / row.count,
      withTefMatch: row.withTefMatch,
    }))
    .sort((a, b) => b.count - a.count || b.avgShiftScore - a.avgShiftScore)
    .slice(0, limit);
}

export function interventionTypeBuckets(
  records: ExploreMunicipalityRecord[],
): InterventionTypeBucket[] {
  const byType = new Map<string, { count: number; scoreSum: number }>();
  for (const record of records) {
    for (const measure of record.measures) {
      const type = measure.intervention_type || "none";
      const existing = byType.get(type) ?? { count: 0, scoreSum: 0 };
      existing.count += 1;
      existing.scoreSum += measure.intervention_score;
      byType.set(type, existing);
    }
  }
  return [...byType.entries()]
    .map(([type, row]) => ({
      type,
      count: row.count,
      avgScore: row.count === 0 ? 0 : row.scoreSum / row.count,
    }))
    .sort((a, b) => {
      if (a.type === "none") return 1;
      if (b.type === "none") return -1;
      return b.count - a.count;
    });
}

/** TEF hits carry both shift and intervention fields from the matched measure. */
export function tefHitInterventionCoverage(hits: TefHit[]): {
  withInterventionWho: number;
  withInterventionWhat: number;
  avgInterventionScore: number;
  avgShiftScore: number;
} {
  if (hits.length === 0) {
    return {
      withInterventionWho: 0,
      withInterventionWhat: 0,
      avgInterventionScore: 0,
      avgShiftScore: 0,
    };
  }
  return {
    withInterventionWho: hits.filter((h) => isPresent(h.interventionWho))
      .length,
    withInterventionWhat: hits.filter((h) => isPresent(h.interventionWhat))
      .length,
    avgInterventionScore: average(hits.map((h) => h.interventionScore)),
    avgShiftScore: average(hits.map((h) => h.shiftScore)),
  };
}
