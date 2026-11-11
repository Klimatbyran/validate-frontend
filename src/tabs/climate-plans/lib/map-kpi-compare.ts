import {
  averageScore,
  explicitTefShare,
  highScoreShare,
  interventionActiveShare,
  interventionSpecificityShare,
  mapKpiValue,
  shadowHitCount,
  tefMatchRate,
  topTefsByHitCount,
  type MapKpiValue,
} from "./explore-aggregates";
import type {
  ExploreMunicipalityRecord,
  MapKpiId,
  SectorYearEmissions,
  TefHit,
} from "./explore-types";
import { computeEmissionFocusGap } from "./website-kpis";
import {
  broadWordingShare,
  interventionCompletenessShare,
} from "./plan-concreteness";

export type MapKpiFamily =
  | "commitments"
  | "measures"
  | "tef"
  | "plan"
  | "emissions";

export const MAP_KPI_FAMILY: Record<MapKpiId, MapKpiFamily> = {
  uniqueCommitments: "commitments",
  climateRelevantCommitments: "commitments",
  climateCommitmentGroups: "commitments",
  climateRelevantShare: "commitments",
  adaptationShare: "commitments",
  ownCommitmentShare: "commitments",
  companionReferenceCount: "commitments",
  measureCount: "measures",
  avgInterventionScore: "measures",
  avgActivityShiftScore: "measures",
  interventionActiveShare: "measures",
  interventionSpecificityShare: "measures",
  interventionCompletenessShare: "measures",
  highInterventionShare: "measures",
  highActivityShiftShare: "measures",
  distinctTefs: "tef",
  distinctTefGroups: "tef",
  tefGroupStrength: "tef",
  explicitTefShare: "tef",
  broadWordingShare: "tef",
  tefMatchRate: "tef",
  shadowHitCount: "tef",
  planChars: "plan",
  emissionFocusGap: "emissions",
};

export const MAP_KPI_FAMILY_LABEL: Record<MapKpiFamily, string> = {
  commitments: "Commitment deep-dive",
  measures: "Measure & score deep-dive",
  tef: "TEF deep-dive",
  plan: "Plan anatomy deep-dive",
  emissions: "Emissions vs measures deep-dive",
};

export function mapKpiFamily(kpi: MapKpiId): MapKpiFamily {
  return MAP_KPI_FAMILY[kpi];
}

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

export interface EmissionFocusSectorRow {
  sectorId: string;
  label: string;
  primaryShare: string;
  primaryMeasures: string;
  primaryAddressed: boolean;
  compareShare: string | null;
  compareMeasures: string | null;
  compareAddressed: boolean | null;
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

function shareOf(
  numerator: number | null | undefined,
  denominator: number,
): number | null {
  if (numerator == null || denominator <= 0) return null;
  return numerator / denominator;
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

function selectedKpiRow(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
  kpi: MapKpiId,
  tefGroupFilter: string | null,
  sectorEmissions: SectorYearEmissions[],
): MapKpiCompareRow {
  const primaryKpi = mapKpiValue(primary, kpi, tefGroupFilter, sectorEmissions);
  const compareKpi = compare
    ? mapKpiValue(compare, kpi, tefGroupFilter, sectorEmissions)
    : null;
  return row({
    id: "selectedKpi",
    label: "Selected KPI",
    primary: formatMapKpiDisplay(primaryKpi),
    compareValue: compare ? formatMapKpiDisplay(compareKpi) : null,
    delta: deltaOf(primaryKpi.numeric, compareKpi?.numeric ?? null),
    higherIsBetter:
      kpi === "emissionFocusGap" || kpi === "broadWordingShare" ? false : true,
    unit:
      primaryKpi.unit === "share"
        ? "share"
        : primaryKpi.unit === "chars"
          ? "chars"
          : primaryKpi.unit.includes("–") || primaryKpi.unit.includes("-")
            ? "score"
            : "count",
  });
}

function commitmentRows(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
): MapKpiCompareRow[] {
  const primaryClimateShare = shareOf(
    primary.climateRelevantCommitmentCount,
    primary.commitmentCount,
  );
  const compareClimateShare = compare
    ? shareOf(compare.climateRelevantCommitmentCount, compare.commitmentCount)
    : null;
  const primaryAdaptationShare = shareOf(
    primary.adaptationCommitmentCount,
    primary.commitmentCount,
  );
  const compareAdaptationShare = compare
    ? shareOf(compare.adaptationCommitmentCount, compare.commitmentCount)
    : null;
  const primaryOwnShare = shareOf(
    primary.ownCommitmentCount,
    primary.commitmentCount,
  );
  const compareOwnShare = compare
    ? shareOf(compare.ownCommitmentCount, compare.commitmentCount)
    : null;

  return [
    row({
      id: "commitmentCount",
      label: "Extracted commitments",
      primary: formatCount(primary.commitmentCount),
      compareValue: compare ? formatCount(compare.commitmentCount) : null,
      delta: deltaOf(primary.commitmentCount, compare?.commitmentCount),
      higherIsBetter: null,
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
      id: "climateRelevantShare",
      label: "Climate-relevant share",
      primary: formatShare(primaryClimateShare),
      compareValue: compare ? formatShare(compareClimateShare) : null,
      delta: deltaOf(primaryClimateShare, compareClimateShare),
      higherIsBetter: true,
      unit: "share",
    }),
    row({
      id: "adaptationShare",
      label: "Adaptation share",
      primary: formatShare(primaryAdaptationShare),
      compareValue: compare ? formatShare(compareAdaptationShare) : null,
      delta: deltaOf(primaryAdaptationShare, compareAdaptationShare),
      higherIsBetter: null,
      unit: "share",
    }),
    row({
      id: "ownShare",
      label: "Own commitment share",
      primary: formatShare(primaryOwnShare),
      compareValue: compare ? formatShare(compareOwnShare) : null,
      delta: deltaOf(primaryOwnShare, compareOwnShare),
      higherIsBetter: null,
      unit: "share",
    }),
    row({
      id: "companions",
      label: "Companion refs",
      primary: formatCount(primary.companionReferenceCount),
      compareValue: compare
        ? formatCount(compare.companionReferenceCount)
        : null,
      delta: deltaOf(
        primary.companionReferenceCount,
        compare?.companionReferenceCount,
      ),
      higherIsBetter: null,
      unit: "count",
    }),
  ];
}

function measureRows(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
): MapKpiCompareRow[] {
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
  const primaryActive = interventionActiveShare(primary.measures);
  const compareActive = compare
    ? interventionActiveShare(compare.measures)
    : null;
  const primarySpecificity = interventionSpecificityShare(primary.measures);
  const compareSpecificity = compare
    ? interventionSpecificityShare(compare.measures)
    : null;
  const primaryCompleteness = interventionCompletenessShare(primary);
  const compareCompleteness = compare
    ? interventionCompletenessShare(compare)
    : null;
  const primaryHighIntervention = highScoreShare(
    primary.measures,
    "intervention_score",
  );
  const compareHighIntervention = compare
    ? highScoreShare(compare.measures, "intervention_score")
    : null;
  const primaryHighShift = highScoreShare(
    primary.measures,
    "activity_shift_score",
  );
  const compareHighShift = compare
    ? highScoreShare(compare.measures, "activity_shift_score")
    : null;

  return [
    row({
      id: "measureCount",
      label: "Scored measures",
      primary: formatCount(primary.measures.length),
      compareValue: compare ? formatCount(compare.measures.length) : null,
      delta: deltaOf(primary.measures.length, compare?.measures.length),
      higherIsBetter: null,
      unit: "count",
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
      id: "interventionActive",
      label: "Intervention active",
      primary: formatShare(primaryActive),
      compareValue: compare ? formatShare(compareActive) : null,
      delta: deltaOf(primaryActive, compareActive),
      higherIsBetter: true,
      unit: "share",
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
    row({
      id: "whoWhatWhenHow",
      label: "Who/what/when/how filled",
      primary: formatShare(primaryCompleteness),
      compareValue: compare ? formatShare(compareCompleteness) : null,
      delta: deltaOf(primaryCompleteness, compareCompleteness),
      higherIsBetter: true,
      unit: "share",
    }),
    row({
      id: "highIntervention",
      label: "High intervention (≥5)",
      primary: formatShare(primaryHighIntervention),
      compareValue: compare ? formatShare(compareHighIntervention) : null,
      delta: deltaOf(primaryHighIntervention, compareHighIntervention),
      higherIsBetter: true,
      unit: "share",
    }),
    row({
      id: "highShift",
      label: "High activity-shift (≥5)",
      primary: formatShare(primaryHighShift),
      compareValue: compare ? formatShare(compareHighShift) : null,
      delta: deltaOf(primaryHighShift, compareHighShift),
      higherIsBetter: true,
      unit: "share",
    }),
  ];
}

function tefRows(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
  tefGroupFilter: string | null,
): MapKpiCompareRow[] {
  const primaryHits =
    tefGroupFilter && tefGroupFilter !== "all"
      ? primary.tefHits.filter((h) => h.group === tefGroupFilter)
      : primary.tefHits;
  const compareHits =
    compare == null
      ? null
      : tefGroupFilter && tefGroupFilter !== "all"
        ? compare.tefHits.filter((h) => h.group === tefGroupFilter)
        : compare.tefHits;

  const primaryDistinct = new Set(primaryHits.map((h) => h.stableId)).size;
  const compareDistinct =
    compareHits == null
      ? null
      : new Set(compareHits.map((h) => h.stableId)).size;
  const primaryGroups = new Set(primaryHits.map((h) => h.group)).size;
  const compareGroups =
    compareHits == null ? null : new Set(compareHits.map((h) => h.group)).size;
  const primaryExplicit = explicitTefShare(primaryHits);
  const compareExplicit =
    compareHits == null ? null : explicitTefShare(compareHits);
  const primaryBroad = broadWordingShare(primary);
  const compareBroad = compare ? broadWordingShare(compare) : null;
  const primaryMatchRate = tefMatchRate(primary.measures);
  const compareMatchRate = compare ? tefMatchRate(compare.measures) : null;
  const primaryShadows = shadowHitCount(primary.measures);
  const compareShadows = compare ? shadowHitCount(compare.measures) : null;
  const primaryOfficial = primaryHits.filter(
    (h) => (h.source ?? "official") === "official",
  ).length;
  const compareOfficial =
    compareHits == null
      ? null
      : compareHits.filter((h) => (h.source ?? "official") === "official")
          .length;
  const primaryProposed = primaryHits.filter(
    (h) => h.source === "proposed",
  ).length;
  const compareProposed =
    compareHits == null
      ? null
      : compareHits.filter((h) => h.source === "proposed").length;

  return [
    row({
      id: "distinctTefs",
      label: "Distinct TEFs",
      primary: formatCount(primaryDistinct),
      compareValue:
        compareDistinct == null ? null : formatCount(compareDistinct),
      delta: deltaOf(primaryDistinct, compareDistinct),
      higherIsBetter: null,
      unit: "count",
    }),
    row({
      id: "tefGroups",
      label: "TEF groups covered",
      primary: formatCount(primaryGroups),
      compareValue: compareGroups == null ? null : formatCount(compareGroups),
      delta: deltaOf(primaryGroups, compareGroups),
      higherIsBetter: null,
      unit: "count",
    }),
    row({
      id: "tefMatchRate",
      label: "TEF match rate",
      primary: formatShare(primaryMatchRate),
      compareValue: compare ? formatShare(compareMatchRate) : null,
      delta: deltaOf(primaryMatchRate, compareMatchRate),
      higherIsBetter: true,
      unit: "share",
    }),
    row({
      id: "explicitShare",
      label: "Explicit TEF share",
      primary: formatShare(primaryExplicit),
      compareValue: compare ? formatShare(compareExplicit) : null,
      delta: deltaOf(primaryExplicit, compareExplicit),
      higherIsBetter: true,
      unit: "share",
    }),
    row({
      id: "broadWording",
      label: "Broad wording share",
      primary: formatShare(primaryBroad),
      compareValue: compare ? formatShare(compareBroad) : null,
      delta: deltaOf(primaryBroad, compareBroad),
      higherIsBetter: false,
      unit: "share",
    }),
    row({
      id: "officialHits",
      label: "Official TEF hits",
      primary: formatCount(primaryOfficial),
      compareValue:
        compareOfficial == null ? null : formatCount(compareOfficial),
      delta: deltaOf(primaryOfficial, compareOfficial),
      higherIsBetter: null,
      unit: "count",
    }),
    row({
      id: "proposedHits",
      label: "Proposed STE hits",
      primary: formatCount(primaryProposed),
      compareValue:
        compareProposed == null ? null : formatCount(compareProposed),
      delta: deltaOf(primaryProposed, compareProposed),
      higherIsBetter: null,
      unit: "count",
    }),
    row({
      id: "shadowHits",
      label: "Shadow gap hits",
      primary: formatCount(primaryShadows),
      compareValue: compare ? formatCount(compareShadows) : null,
      delta: deltaOf(primaryShadows, compareShadows),
      higherIsBetter: null,
      unit: "count",
    }),
  ];
}

function planRows(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
): MapKpiCompareRow[] {
  return [
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
      id: "adoptedYear",
      label: "Adopted year",
      primary: formatCount(primary.adoptedYear),
      compareValue: compare ? formatCount(compare.adoptedYear) : null,
      delta: deltaOf(primary.adoptedYear, compare?.adoptedYear),
      higherIsBetter: null,
      unit: "count",
    }),
    row({
      id: "companions",
      label: "Companion refs",
      primary: formatCount(primary.companionReferenceCount),
      compareValue: compare
        ? formatCount(compare.companionReferenceCount)
        : null,
      delta: deltaOf(
        primary.companionReferenceCount,
        compare?.companionReferenceCount,
      ),
      higherIsBetter: null,
      unit: "count",
    }),
    row({
      id: "measureCount",
      label: "Scored measures",
      primary: formatCount(primary.measures.length),
      compareValue: compare ? formatCount(compare.measures.length) : null,
      delta: deltaOf(primary.measures.length, compare?.measures.length),
      higherIsBetter: null,
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
      higherIsBetter: null,
      unit: "count",
    }),
  ];
}

function emissionRows(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
  sectorEmissions: SectorYearEmissions[],
): MapKpiCompareRow[] {
  const primaryGap = computeEmissionFocusGap(primary, sectorEmissions);
  const compareGap = compare
    ? computeEmissionFocusGap(compare, sectorEmissions)
    : null;

  return [
    row({
      id: "emissionGap",
      label: "Emissions with no measures in the plan",
      primary: formatShare(primaryGap.gapShare),
      compareValue: compare ? formatShare(compareGap?.gapShare ?? null) : null,
      delta: deltaOf(primaryGap.gapShare, compareGap?.gapShare ?? null),
      higherIsBetter: false,
      unit: "share",
    }),
    row({
      id: "focusMatch",
      label: "Biggest source covered?",
      primary: primaryGap.focusMatch,
      compareValue: compare ? (compareGap?.focusMatch ?? null) : null,
      delta: null,
      higherIsBetter: null,
      unit: "text",
    }),
    row({
      id: "missingSectors",
      label: "Sectors with no measures",
      primary:
        primaryGap.missingSectors.length === 0
          ? "none"
          : String(primaryGap.missingSectors.length),
      compareValue: compare
        ? compareGap && compareGap.missingSectors.length === 0
          ? "none"
          : formatCount(compareGap?.missingSectors.length ?? null)
        : null,
      delta: deltaOf(
        primaryGap.missingSectors.length,
        compareGap?.missingSectors.length ?? null,
      ),
      higherIsBetter: false,
      unit: "count",
    }),
    row({
      id: "measureCount",
      label: "Scored measures",
      primary: formatCount(primary.measures.length),
      compareValue: compare ? formatCount(compare.measures.length) : null,
      delta: deltaOf(primary.measures.length, compare?.measures.length),
      higherIsBetter: null,
      unit: "count",
    }),
    row({
      id: "mappedTonnes",
      label: "Mapped tonnes (six sectors)",
      primary:
        primaryGap.totalMappedTonnes <= 0
          ? "—"
          : Math.round(primaryGap.totalMappedTonnes).toLocaleString(),
      compareValue: compare
        ? !compareGap || compareGap.totalMappedTonnes <= 0
          ? "—"
          : Math.round(compareGap.totalMappedTonnes).toLocaleString()
        : null,
      delta: deltaOf(
        primaryGap.totalMappedTonnes > 0 ? primaryGap.totalMappedTonnes : null,
        compareGap && compareGap.totalMappedTonnes > 0
          ? compareGap.totalMappedTonnes
          : null,
      ),
      higherIsBetter: null,
      unit: "count",
    }),
  ];
}

/** Detail rows for the selected map KPI family, optionally vs a compare place. */
export function buildMapKpiCompareRows(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
  kpi: MapKpiId,
  tefGroupFilter: string | null,
  sectorEmissions: SectorYearEmissions[] = [],
): MapKpiCompareRow[] {
  const selected = selectedKpiRow(
    primary,
    compare,
    kpi,
    tefGroupFilter,
    sectorEmissions,
  );
  const family = mapKpiFamily(kpi);
  const deepDive =
    family === "commitments"
      ? commitmentRows(primary, compare)
      : family === "measures"
        ? measureRows(primary, compare)
        : family === "tef"
          ? tefRows(primary, compare, tefGroupFilter)
          : family === "plan"
            ? planRows(primary, compare)
            : emissionRows(primary, compare, sectorEmissions);

  // Avoid duplicating the headline when the family already leads with the same metric.
  const filtered = deepDive.filter((r) => r.id !== "selectedKpi");
  return [selected, ...filtered];
}

/** Per-sector worksheet for the emissions-focus map KPI. */
export function buildEmissionFocusSectorRows(
  primary: ExploreMunicipalityRecord,
  compare: ExploreMunicipalityRecord | null,
  sectorEmissions: SectorYearEmissions[],
): EmissionFocusSectorRow[] {
  const primaryGap = computeEmissionFocusGap(primary, sectorEmissions);
  const compareGap = compare
    ? computeEmissionFocusGap(compare, sectorEmissions)
    : null;
  return primaryGap.rows.map((row) => {
    const other = compareGap?.rows.find((r) => r.sectorId === row.sectorId);
    return {
      sectorId: row.sectorId,
      label: row.label,
      primaryShare: formatShare(row.emissionShare),
      primaryMeasures: formatCount(row.measureCount),
      primaryAddressed: row.addressed,
      compareShare: other ? formatShare(other.emissionShare) : null,
      compareMeasures: other ? formatCount(other.measureCount) : null,
      compareAddressed: other ? other.addressed : null,
    };
  });
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
  if (unit === "text") return null;
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
