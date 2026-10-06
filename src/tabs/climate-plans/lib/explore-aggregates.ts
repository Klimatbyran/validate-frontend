import type { Measure } from "./measures-types";
import type {
  ExploreMunicipalityRecord,
  MapKpiId,
  PipelineCommitment,
  TefGroupStrength,
  TefHit,
} from "./explore-types";
import {
  CONFIDENCE_WEIGHT,
  inferMatchConfidence,
  tefGroupFromSectorPath,
} from "./tef-groups";
import { foldPlaceName } from "./municipality-names";

export function collectTefHits(measures: Measure[]): TefHit[] {
  const hits: TefHit[] = [];
  for (const measure of measures) {
    for (const shift of measure.activity_shifts ?? []) {
      for (const match of shift.transition_element_matches ?? []) {
        const score =
          "score" in match && typeof match.score === "number"
            ? match.score
            : undefined;
        hits.push({
          stableId: match.stable_id,
          shortLabel: match.short_label,
          sectorPath: match.sector_path,
          group: tefGroupFromSectorPath(match.sector_path),
          confidence: inferMatchConfidence(match.match_confidence, score),
          measureText: measure.measure_text,
        });
      }
    }
  }
  return hits;
}

export function tefGroupStrengths(hits: TefHit[]): TefGroupStrength[] {
  const byGroup = new Map<string, TefHit[]>();
  for (const hit of hits) {
    const list = byGroup.get(hit.group) ?? [];
    list.push(hit);
    byGroup.set(hit.group, list);
  }

  return [...byGroup.entries()]
    .map(([group, groupHits]) => {
      const weightSum = groupHits.reduce(
        (sum, hit) => sum + CONFIDENCE_WEIGHT[hit.confidence],
        0,
      );
      const maxWeight = groupHits.length * CONFIDENCE_WEIGHT.high;
      const highCount = groupHits.filter((h) => h.confidence === "high").length;
      return {
        group,
        hitCount: groupHits.length,
        uniqueTefCount: new Set(groupHits.map((h) => h.stableId)).size,
        uniqueMeasureCount: new Set(groupHits.map((h) => h.measureText)).size,
        weightedStrength: maxWeight === 0 ? 0 : weightSum / maxWeight,
        highShare: groupHits.length === 0 ? 0 : highCount / groupHits.length,
      };
    })
    .sort((a, b) => b.hitCount - a.hitCount);
}

export function averageScore(
  measures: Measure[],
  key: "activity_shift_score" | "intervention_score",
): number | null {
  if (measures.length === 0) return null;
  const sum = measures.reduce((s, m) => s + (m[key] ?? 0), 0);
  return sum / measures.length;
}

export function parseYear(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

export function parsePercent(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export function countClimateRelevantCommitments(
  commitments: PipelineCommitment[],
): number {
  return commitments.filter((c) => c.climateRelevant === true).length;
}

/**
 * Same population as pipeline `groupCommitmentsSimilar`: climate-relevant
 * and actionable commitments, collapsed by `similarGroupId`. Ungrouped
 * rows each count as their own group.
 */
export function countClimateCommitmentGroups(
  commitments: PipelineCommitment[],
): number {
  const filtered = commitments.filter(
    (c) => c.climateRelevant === true && c.actionable === true,
  );
  const groupIds = new Set<string>();
  let singletons = 0;
  for (const commitment of filtered) {
    if (commitment.similarGroupId) groupIds.add(commitment.similarGroupId);
    else singletons += 1;
  }
  return groupIds.size + singletons;
}

export interface MapKpiValue {
  numeric: number | null;
  booleanValue: boolean | null;
  kind: "numeric" | "boolean";
  unit: string;
}

export function mapKpiValue(
  record: ExploreMunicipalityRecord,
  kpi: MapKpiId,
  tefGroupFilter: string | null,
): MapKpiValue {
  const hits =
    tefGroupFilter && tefGroupFilter !== "all"
      ? record.tefHits.filter(
          (h) => foldPlaceName(h.group) === foldPlaceName(tefGroupFilter),
        )
      : record.tefHits;
  const strengths = tefGroupStrengths(hits);

  switch (kpi) {
    case "uniqueCommitments":
      return {
        numeric: record.commitmentCount,
        booleanValue: null,
        kind: "numeric",
        unit: "commitments",
      };
    case "climateRelevantCommitments":
      return {
        numeric: record.climateRelevantCommitmentCount,
        booleanValue: null,
        kind: "numeric",
        unit: "commitments",
      };
    case "climateCommitmentGroups":
      return {
        numeric: record.climateCommitmentGroupCount,
        booleanValue: null,
        kind: "numeric",
        unit: "groups",
      };
    case "goalCount":
      return {
        numeric: record.goals.length,
        booleanValue: null,
        kind: "numeric",
        unit: "goals",
      };
    case "quantifiedGoalCount":
      return {
        numeric: record.goals.filter((g) => g.reductionPercent != null).length,
        booleanValue: null,
        kind: "numeric",
        unit: "goals",
      };
    case "distinctTefs":
      return {
        numeric: new Set(hits.map((h) => h.stableId)).size,
        booleanValue: null,
        kind: "numeric",
        unit: "TEFs",
      };
    case "distinctTefGroups":
      return {
        numeric: new Set(hits.map((h) => h.group)).size,
        booleanValue: null,
        kind: "numeric",
        unit: "groups",
      };
    case "tefGroupStrength": {
      const strength =
        tefGroupFilter && tefGroupFilter !== "all"
          ? (strengths[0]?.weightedStrength ?? 0)
          : strengths.length === 0
            ? 0
            : strengths.reduce(
                (s, g) => s + g.weightedStrength * g.hitCount,
                0,
              ) / strengths.reduce((s, g) => s + g.hitCount, 0);
      return {
        numeric: strength,
        booleanValue: null,
        kind: "numeric",
        unit: "0–1",
      };
    }
    case "avgInterventionScore":
      return {
        numeric: averageScore(record.measures, "intervention_score"),
        booleanValue: null,
        kind: "numeric",
        unit: "1–7",
      };
    case "avgActivityShiftScore":
      return {
        numeric: averageScore(record.measures, "activity_shift_score"),
        booleanValue: null,
        kind: "numeric",
        unit: "1–7",
      };
    case "planChars":
      return {
        numeric: record.markdownChars,
        booleanValue: null,
        kind: "numeric",
        unit: "chars",
      };
    case "hasQuantifiedTargets":
      return {
        numeric: record.hasQuantifiedTargets
          ? 1
          : record.hasQuantifiedTargets == null
            ? null
            : 0,
        booleanValue: record.hasQuantifiedTargets,
        kind: "boolean",
        unit: "yes/no",
      };
    case "parisMentioned":
      return {
        numeric: record.parisMentioned
          ? 1
          : record.parisMentioned == null
            ? null
            : 0,
        booleanValue: record.parisMentioned,
        kind: "boolean",
        unit: "yes/no",
      };
    case "climateRelevantShare": {
      if (
        record.climateRelevantCommitmentCount == null ||
        record.commitmentCount === 0
      ) {
        return {
          numeric: null,
          booleanValue: null,
          kind: "numeric",
          unit: "share",
        };
      }
      return {
        numeric: record.climateRelevantCommitmentCount / record.commitmentCount,
        booleanValue: null,
        kind: "numeric",
        unit: "share",
      };
    }
  }
}

export function mergeRegionRecords(
  records: ExploreMunicipalityRecord[],
  regionName: string,
): ExploreMunicipalityRecord {
  const tefHits = records.flatMap((r) => r.tefHits);
  const measures = records.flatMap((r) => r.measures);
  const goals = records.flatMap((r) => r.goals);
  const markdownChars = records.every((r) => r.markdownChars == null)
    ? null
    : records.reduce((s, r) => s + (r.markdownChars ?? 0), 0);
  const climateRelevant = records.every(
    (r) => r.climateRelevantCommitmentCount == null,
  )
    ? null
    : records.reduce((s, r) => s + (r.climateRelevantCommitmentCount ?? 0), 0);
  const climateGroups = records.every(
    (r) => r.climateCommitmentGroupCount == null,
  )
    ? null
    : records.reduce((s, r) => s + (r.climateCommitmentGroupCount ?? 0), 0);

  const bools = (pick: (r: ExploreMunicipalityRecord) => boolean | null) => {
    const known = records.map(pick).filter((v): v is boolean => v != null);
    if (known.length === 0) return null;
    return known.some(Boolean);
  };

  return {
    id: `region:${regionName}`,
    name: regionName,
    regionName,
    measures,
    commitmentCount: records.reduce((s, r) => s + r.commitmentCount, 0),
    commitmentSource: records.some(
      (r) => r.commitmentSource === "pipeline-commitments",
    )
      ? "pipeline-commitments"
      : "measures-as-proxy",
    climateRelevantCommitmentCount: climateRelevant,
    climateCommitmentGroupCount: climateGroups,
    markdownChars,
    tefHits,
    goals,
    hasQuantifiedTargets: bools((r) => r.hasQuantifiedTargets),
    parisMentioned: bools((r) => r.parisMentioned),
    onePointFiveMentioned: bools((r) => r.onePointFiveMentioned),
    carbonBudgetReferenced: bools((r) => r.carbonBudgetReferenced),
    documentTitle: null,
    documentType: null,
    adoptionDate: null,
    planPeriodStart: null,
    planPeriodEnd: null,
    primaryFocus: null,
    adoptedYear: null,
    sourceUrl: null,
    county: regionName,
    dataSources: [...new Set(records.flatMap((r) => r.dataSources))],
  };
}

export const MAP_KPI_META: Record<
  MapKpiId,
  { label: string; data: string; calculation: string }
> = {
  uniqueCommitments: {
    label: "Extracted commitments",
    data: "Pipeline Commitment rows after extractCommitments (all unique texts). Static files have no Commitment table, so unique scored measures are used as a proxy.",
    calculation:
      "Set size of commitment.text. This is before climate / actionable filters and before similar-grouping.",
  },
  climateRelevantCommitments: {
    label: "Climate-relevant commitments",
    data: "Pipeline filterCommitmentsClimate: Commitment.climateRelevant === true. Not available on static measures files.",
    calculation:
      "Row count where climateRelevant is true (null/false are excluded). Still one row per extracted commitment — duplicates have not been grouped yet.",
  },
  climateCommitmentGroups: {
    label: "Climate commitment groups",
    data: "Pipeline groupCommitmentsSimilar, after filterCommitmentsClimate and filterCommitmentsActionable. Uses similarGroupId on climate-relevant + actionable rows.",
    calculation:
      "Count distinct similarGroupId values, plus each climate+actionable commitment that has no group id (a singleton). That is the unique-commitment set the later measure steps see.",
  },
  goalCount: {
    label: "Goals in the plan",
    data: "static-emission-targets own_commitments[] (and any pipeline-equivalent once it exists).",
    calculation:
      "Length of own_commitments. Includes qualitative and quantitative goals.",
  },
  quantifiedGoalCount: {
    label: "Quantified reduction goals",
    data: "own_commitments[].reduction_percentage when it parses as a number.",
    calculation: "Count of goals with a numeric reduction_percentage.",
  },
  distinctTefs: {
    label: "Distinct TEFs",
    data: "activity_shifts[].transition_element_matches[].stable_id from scored measures.",
    calculation:
      "Set size of stable_id. Missing match_confidence is inferred from cosine score (≥0.55 high, ≥0.40 mid).",
  },
  distinctTefGroups: {
    label: "TEF groups covered",
    data: "sector_path first segment (e.g. Transport > Mobility > … → Transport).",
    calculation: "Set size of those group labels.",
  },
  tefGroupStrength: {
    label: "TEF strength",
    data: "Match confidence (high=3, mid=2, low=1) on TEF hits, optionally filtered to one group.",
    calculation:
      "Sum(weights) / (3 × hit count). 1.0 means every hit is high-confidence.",
  },
  avgInterventionScore: {
    label: "Avg intervention score",
    data: "measures[].intervention_score (1–7) from scoreMeasures / static JSON.",
    calculation: "Mean across measures for that municipality.",
  },
  avgActivityShiftScore: {
    label: "Avg activity-shift score",
    data: "measures[].activity_shift_score (1–7).",
    calculation: "Mean across measures for that municipality.",
  },
  planChars: {
    label: "Plan length (markdown)",
    data: "Pipeline plan.markdown character count after Docling. Static JSON extracts have no source document.",
    calculation: "markdown.length. Rough page estimate = chars / 3000.",
  },
  hasQuantifiedTargets: {
    label: "Has quantified targets",
    data: "emission_targets.summary.has_quantified_targets.",
    calculation: "Boolean as extracted. Grey = field missing.",
  },
  parisMentioned: {
    label: "Paris mentioned",
    data: "emission_targets.framework_alignment.paris_agreement_mentioned.",
    calculation: "Boolean as extracted. Grey = field missing.",
  },
  climateRelevantShare: {
    label: "Climate-relevant share",
    data: "Pipeline commitments.climateRelevant === true versus all extracted unique texts. Not available on static measures files.",
    calculation: "climate-relevant row count / extracted unique-text count.",
  },
};
