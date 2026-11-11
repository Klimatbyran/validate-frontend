import {
  averageScore,
  interventionSpecificityShare,
  mapKpiValue,
  topTefsByHitCount,
  type MapKpiValue,
} from "./explore-aggregates";
import type {
  ExploreMunicipalityRecord,
  MapKpiId,
  SectorYearEmissions,
  TefHit,
} from "./explore-types";

export interface TopTefCompareRow {
  stableId: string;
  shortLabel: string;
  primaryHits: number | null;
  compareHits: number | null;
  /** Signed delta (compare − primary) when both sides have counts. */
  delta: number | null;
}

/**
 * Union of each place's top TEFs by hit count, with counts for both sides.
 * Rows are ordered by max(primary, compare) hits, then label.
 */
export function buildTopTefCompareRows(
  primaryHits: TefHit[],
  compareHits: TefHit[] | null,
  limit = 3,
): TopTefCompareRow[] {
  const primaryTop = topTefsByHitCount(primaryHits, limit);
  if (!compareHits) {
    return primaryTop.map((tef) => ({
      stableId: tef.stableId,
      shortLabel: tef.shortLabel,
      primaryHits: tef.hitCount,
      compareHits: null,
      delta: null,
    }));
  }

  const compareTop = topTefsByHitCount(compareHits, limit);
  const primaryAll = countHitsByStableId(primaryHits);
  const compareAll = countHitsByStableId(compareHits);

  const ids = new Set([
    ...primaryTop.map((t) => t.stableId),
    ...compareTop.map((t) => t.stableId),
  ]);

  const labelFor = new Map<string, string>();
  for (const tef of [...primaryTop, ...compareTop]) {
    if (!labelFor.has(tef.stableId)) labelFor.set(tef.stableId, tef.shortLabel);
  }

  return [...ids]
    .map((stableId) => {
      const primaryCount = primaryAll.get(stableId) ?? null;
      const compareCount = compareAll.get(stableId) ?? null;
      return {
        stableId,
        shortLabel: labelFor.get(stableId) ?? stableId,
        primaryHits: primaryCount,
        compareHits: compareCount,
        delta:
          primaryCount == null || compareCount == null
            ? null
            : compareCount - primaryCount,
      };
    })
    .sort(
      (a, b) =>
        Math.max(b.primaryHits ?? 0, b.compareHits ?? 0) -
          Math.max(a.primaryHits ?? 0, a.compareHits ?? 0) ||
        a.shortLabel.localeCompare(b.shortLabel),
    );
}

function countHitsByStableId(hits: TefHit[]): Map<string, number> {
  const byId = new Map<string, number>();
  for (const hit of hits) {
    byId.set(hit.stableId, (byId.get(hit.stableId) ?? 0) + 1);
  }
  return byId;
}

export interface MapKpiCompareRow {
  id: string;
  label: string;
  /** Display string for the primary (selected) place. */
  primary: string;
  /** Display string for the compare place, or null when none selected. */
  compare: string | null;
  /**
   * Signed numeric delta (compare − primary) when both sides have numbers.
   * Positive means the compare place is higher.
   */
  delta: number | null;
  /**
   * Whether a higher value is usually better for this row.
   * Null = neutral (no colour hint on the delta).
   */
  higherIsBetter: boolean | null;
  unit: "count" | "score" | "share" | "chars" | "text";
}

function formatCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return String(value);
}

function formatAvgScore(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}/7`;
}

function formatShare(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatPlanLength(chars: number | null): string {
  if (chars == null) return "—";
  return `${chars.toLocaleString()} chars (~${Math.max(1, Math.round(chars / 3000))} p.)`;
}

export function formatMapKpiDisplay(value: MapKpiValue | null): string {
  if (!value) return "—";
  if (value.kind === "boolean") {
    if (value.booleanValue == null) return "—";
    return value.booleanValue ? "yes" : "no";
  }
  if (value.numeric == null) return "—";
  if (value.unit === "share") return formatShare(value.numeric);
  return value.numeric.toFixed(
    value.numeric >= 10 || Number.isInteger(value.numeric) ? 0 : 2,
  );
}

function numericOrNull(value: number | null | undefined): number | null {
  return value == null || !Number.isFinite(value) ? null : value;
}

function deltaOf(
  primary: number | null | undefined,
  compare: number | null | undefined,
): number | null {
  const left = numericOrNull(primary);
  const right = numericOrNull(compare);
  if (left == null || right == null) return null;
  return right - left;
}

function row(
  partial: Omit<MapKpiCompareRow, "compare"> & { compareValue?: string | null },
): MapKpiCompareRow {
  return {
    id: partial.id,
    label: partial.label,
    primary: partial.primary,
    compare: partial.compareValue ?? null,
    delta: partial.delta,
    higherIsBetter: partial.higherIsBetter,
    unit: partial.unit,
  };
}

/** Detail rows shown in the map KPI panel, optionally vs a compare place. */
export function buildMapKpiCompareRows(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
  kpi: MapKpiId,
  tefGroupFilter: string | null,
  sectorEmissions: SectorYearEmissions[] = [],
): MapKpiCompareRow[] {
  const primaryKpi = mapKpiValue(primary, kpi, tefGroupFilter, sectorEmissions);
  const compareKpi = compare
    ? mapKpiValue(compare, kpi, tefGroupFilter, sectorEmissions)
    : null;

  const primaryDistinctTefs = new Set(primary.tefHits.map((h) => h.stableId))
    .size;
  const compareDistinctTefs = compare
    ? new Set(compare.tefHits.map((h) => h.stableId)).size
    : null;

  const primaryShift = averageScore(primary.measures, "activity_shift_score");
  const compareShift = compare
    ? averageScore(compare.measures, "activity_shift_score")
    : null;
  const primaryIntervention = averageScore(
    primary.measures,
    "intervention_score",
  );
  const compareIntervention = compare
    ? averageScore(compare.measures, "intervention_score")
    : null;
  const primarySpecificity = interventionSpecificityShare(primary.measures);
  const compareSpecificity = compare
    ? interventionSpecificityShare(compare.measures)
    : null;

  return [
    row({
      id: "selectedKpi",
      label: "Selected KPI",
      primary: formatMapKpiDisplay(primaryKpi),
      compareValue: compare ? formatMapKpiDisplay(compareKpi) : null,
      delta: deltaOf(primaryKpi.numeric, compareKpi?.numeric ?? null),
      // Gap share is an absence metric — lower is better.
      higherIsBetter: kpi === "emissionFocusGap" ? false : true,
      unit:
        primaryKpi.unit === "share"
          ? "share"
          : primaryKpi.unit === "chars"
            ? "chars"
            : primaryKpi.unit.includes("–") || primaryKpi.unit.includes("-")
              ? "score"
              : "count",
    }),
    row({
      id: "commitmentCount",
      label: "Extracted commitments",
      primary: formatCount(primary.commitmentCount),
      compareValue: compare ? formatCount(compare.commitmentCount) : null,
      delta: deltaOf(primary.commitmentCount, compare?.commitmentCount),
      higherIsBetter: true,
      unit: "count",
    }),
    row({
      id: "climateRelevant",
      label: "Climate-relevant",
      primary: formatCount(primary.climateRelevantCommitmentCount),
      compareValue: compare
        ? formatCount(compare.climateRelevantCommitmentCount)
        : null,
      delta: deltaOf(
        primary.climateRelevantCommitmentCount,
        compare?.climateRelevantCommitmentCount,
      ),
      higherIsBetter: true,
      unit: "count",
    }),
    row({
      id: "climateGroups",
      label: "Climate groups",
      primary: formatCount(primary.climateCommitmentGroupCount),
      compareValue: compare
        ? formatCount(compare.climateCommitmentGroupCount)
        : null,
      delta: deltaOf(
        primary.climateCommitmentGroupCount,
        compare?.climateCommitmentGroupCount,
      ),
      higherIsBetter: true,
      unit: "count",
    }),
    row({
      id: "distinctTefs",
      label: "Distinct TEFs",
      primary: formatCount(primaryDistinctTefs),
      compareValue:
        compareDistinctTefs == null ? null : formatCount(compareDistinctTefs),
      delta: deltaOf(primaryDistinctTefs, compareDistinctTefs),
      higherIsBetter: true,
      unit: "count",
    }),
    row({
      id: "planLength",
      label: "Plan length",
      primary: formatPlanLength(primary.markdownChars),
      compareValue: compare ? formatPlanLength(compare.markdownChars) : null,
      delta: deltaOf(primary.markdownChars, compare?.markdownChars),
      higherIsBetter: null,
      unit: "chars",
    }),
    row({
      id: "avgShift",
      label: "Avg shift score",
      primary: formatAvgScore(primaryShift),
      compareValue: compare ? formatAvgScore(compareShift) : null,
      delta: deltaOf(primaryShift, compareShift),
      higherIsBetter: true,
      unit: "score",
    }),
    row({
      id: "avgIntervention",
      label: "Avg intervention",
      primary: formatAvgScore(primaryIntervention),
      compareValue: compare ? formatAvgScore(compareIntervention) : null,
      delta: deltaOf(primaryIntervention, compareIntervention),
      higherIsBetter: true,
      unit: "score",
    }),
    row({
      id: "whoWhat",
      label: "Who+what filled",
      primary: formatShare(primarySpecificity),
      compareValue: compare ? formatShare(compareSpecificity) : null,
      delta: deltaOf(primarySpecificity, compareSpecificity),
      higherIsBetter: true,
      unit: "share",
    }),
  ];
}

/** Format a signed delta for display next to the compare value. */
export function formatCompareDelta(
  delta: number | null,
  unit: MapKpiCompareRow["unit"],
): string | null {
  if (delta == null || delta === 0) return delta === 0 ? "±0" : null;
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  if (unit === "share") return `${sign}${Math.round(abs * 100)} pp`;
  if (unit === "score") return `${sign}${abs.toFixed(1)}`;
  if (unit === "chars") {
    if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
    return `${sign}${Math.round(abs)}`;
  }
  return `${sign}${Number.isInteger(abs) ? String(abs) : abs.toFixed(2)}`;
}

/**
 * Colour hint for whether the compare place looks better/worse than primary.
 * Returns "better" | "worse" | "neutral".
 */
export function compareDeltaTone(
  delta: number | null,
  higherIsBetter: boolean | null,
): "better" | "worse" | "neutral" {
  if (delta == null || delta === 0 || higherIsBetter == null) return "neutral";
  const compareHigher = delta > 0;
  if (higherIsBetter) return compareHigher ? "better" : "worse";
  return compareHigher ? "worse" : "better";
}
