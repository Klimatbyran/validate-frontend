/**
 * Plan-text concreteness signals from implied TEF matches + intervention slots.
 *
 * Measure-level (not hit-level) so one broad measure with many TEF hits does not
 * dominate. Safe framing: describes what the plan text contains, not municipal
 * ambition or quality.
 */

import type { ExploreMunicipalityRecord, TefHit } from "./explore-types";
import type { Measure } from "./measures-types";

function fieldFilled(value: string | null | undefined): boolean {
  return Boolean(
    value && value.trim() && value.trim().toLowerCase() !== "none",
  );
}

export interface PlanConcretenessResult {
  measureCount: number;
  judgedMeasureCount: number;
  /** Measures with ≥1 explicit TEF hit among judged measures. */
  explicitMeasureCount: number;
  /** Judged measures whose hits are all implied. */
  broadMeasureCount: number;
  /** broadMeasureCount / judgedMeasureCount. Null if none judged. */
  broadWordingShare: number | null;
  /** explicitMeasureCount / judgedMeasureCount. */
  explicitWordingShare: number | null;
  judgedShare: number | null;
  whoRate: number | null;
  whatRate: number | null;
  whenRate: number | null;
  howRate: number | null;
  /** Share with who+what+when+how all filled. */
  fullSpecShare: number | null;
  whoCount: number;
  whatCount: number;
  whenCount: number;
  howCount: number;
  fullSpecCount: number;
  summaryEn: string;
  publicHeadlineEn: string;
}

function hitsForMeasure(measure: Measure, allHits: TefHit[]): TefHit[] {
  const text = measure.measure_text?.trim() ?? "";
  if (!text) return [];
  return allHits.filter((h) => (h.measureText ?? "").trim() === text);
}

function classifyMeasureWording(
  measure: Measure,
  allHits: TefHit[],
): "explicit" | "broad" | "unjudged" {
  const hits = hitsForMeasure(measure, allHits).filter(
    (h) => (h.source ?? "official") !== "runtime-shadow",
  );
  const judged = hits.filter((h) => typeof h.explicit === "boolean");
  if (judged.length === 0) return "unjudged";
  // Explicit if any hit is explicit; broad only when every judged hit is implied.
  if (judged.some((h) => h.explicit === true)) return "explicit";
  return "broad";
}

export function computePlanConcreteness(
  record: ExploreMunicipalityRecord,
): PlanConcretenessResult {
  const measures = record.measures;
  const n = measures.length;
  let explicitMeasureCount = 0;
  let broadMeasureCount = 0;
  let judgedMeasureCount = 0;
  let whoCount = 0;
  let whatCount = 0;
  let whenCount = 0;
  let howCount = 0;
  let fullSpecCount = 0;

  for (const measure of measures) {
    const wording = classifyMeasureWording(measure, record.tefHits);
    if (wording === "explicit") {
      judgedMeasureCount += 1;
      explicitMeasureCount += 1;
    } else if (wording === "broad") {
      judgedMeasureCount += 1;
      broadMeasureCount += 1;
    }

    const who = fieldFilled(measure.intervention_who);
    const what = fieldFilled(measure.intervention_what);
    const when = fieldFilled(measure.intervention_when);
    const how = fieldFilled(measure.intervention_how);
    if (who) whoCount += 1;
    if (what) whatCount += 1;
    if (when) whenCount += 1;
    if (how) howCount += 1;
    if (who && what && when && how) fullSpecCount += 1;
  }

  const broadWordingShare =
    judgedMeasureCount === 0 ? null : broadMeasureCount / judgedMeasureCount;
  const explicitWordingShare =
    judgedMeasureCount === 0 ? null : explicitMeasureCount / judgedMeasureCount;
  const judgedShare = n === 0 ? null : judgedMeasureCount / n;
  const whoRate = n === 0 ? null : whoCount / n;
  const whatRate = n === 0 ? null : whatCount / n;
  const whenRate = n === 0 ? null : whenCount / n;
  const howRate = n === 0 ? null : howCount / n;
  const fullSpecShare = n === 0 ? null : fullSpecCount / n;

  const publicHeadlineEn =
    n === 0
      ? "No measures analysed yet."
      : `In the plan text, ${fullSpecCount} of ${n} measures name who does what, when, and how.`;

  const summaryEn =
    n === 0
      ? "No scored measures in this extract."
      : [
          judgedMeasureCount === 0
            ? "No judged explicit/implied labels on TEF matches yet (older extracts may omit them)."
            : `${broadMeasureCount} of ${judgedMeasureCount} judged measures are written broadly (could fit several kinds of action); ${explicitMeasureCount} name a match more directly.`,
          `${fullSpecCount} of ${n} measures fill who, what, when and how in the extract.`,
          "Based on plan wording only — other documents may add detail. Broad wording is not automatically a problem.",
        ].join(" ");

  return {
    measureCount: n,
    judgedMeasureCount,
    explicitMeasureCount,
    broadMeasureCount,
    broadWordingShare,
    explicitWordingShare,
    judgedShare,
    whoRate,
    whatRate,
    whenRate,
    howRate,
    fullSpecShare,
    whoCount,
    whatCount,
    whenCount,
    howCount,
    fullSpecCount,
    summaryEn,
    publicHeadlineEn,
  };
}

/** Map KPI: share of judged measures that are broad/implied-only. Lower → more direct wording. */
export function broadWordingShare(
  record: ExploreMunicipalityRecord,
): number | null {
  return computePlanConcreteness(record).broadWordingShare;
}

/** Map KPI: share of measures with who+what+when+how filled. Higher → more slots named. */
export function interventionCompletenessShare(
  record: ExploreMunicipalityRecord,
): number | null {
  return computePlanConcreteness(record).fullSpecShare;
}

export function concretenessAskPromptEn(
  result: PlanConcretenessResult,
  placeName: string,
): string | null {
  if (result.measureCount === 0) return null;
  if (
    result.fullSpecShare != null &&
    result.fullSpecShare < 0.35 &&
    result.measureCount >= 5
  ) {
    return `You could ask: in ${placeName}’s plan, only ${result.fullSpecCount} of ${result.measureCount} measures name who, what, when and how — can the municipality clarify responsibility and timing for the rest?`;
  }
  if (
    result.broadWordingShare != null &&
    result.broadWordingShare >= 0.4 &&
    result.judgedMeasureCount >= 5
  ) {
    return `You could ask: ${result.broadMeasureCount} of ${result.judgedMeasureCount} analysed measures in ${placeName} are written broadly — which concrete next steps sit behind those lines?`;
  }
  return `You could ask: for the measures in ${placeName}’s climate plan, who is responsible, by when, and how will they be carried out?`;
}
