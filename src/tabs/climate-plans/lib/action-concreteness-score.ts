/**
 * Action concreteness score (Website visuals v2).
 *
 * Combines intervention slot completeness (who / what / when / how) with an
 * implied-TEF broadness modulator into one 0–100 municipal average.
 *
 * Measures what the plan *text* specifies — not ambition, impact, or quality.
 * Methodology version is frozen in ACTION_CONCRETENESS_METHOD_VERSION.
 */

import type { ExploreMunicipalityRecord, TefHit } from "./explore-types";
import type { Measure } from "./measures-types";

/** Bump when weights, gates, or aggregation change. */
export const ACTION_CONCRETENESS_METHOD_VERSION = "v2.0-binary-slots-2026-03";

/** Slot weights sum to 1. WHAT dominates; HOW next; WHO and WHEN equal. */
export const SLOT_WEIGHTS = {
  what: 0.35,
  how: 0.25,
  who: 0.2,
  when: 0.2,
} as const;

/**
 * Implied-only measures keep this fraction of their slot score (15% max
 * deduction). Explicit or unjudged / no-TEF leave the score untouched.
 */
export const IMPLIED_ONLY_BROADNESS_FACTOR = 0.85;

export type ConcretenessBand = "concrete" | "partial" | "vague" | "unscored";
export type EvidenceVolume = "limited" | "moderate" | "broad" | "none";
export type MeasureWording = "explicit" | "implied-only" | "unjudged" | "no-tef";

export interface MeasureConcretenessBreakdown {
  measureText: string;
  who: 0 | 1;
  what: 0 | 1;
  when: 0 | 1;
  how: 0 | 1;
  slotScore: number;
  wording: MeasureWording;
  broadnessFactor: number;
  score: number;
}

export interface ActionConcretenessResult {
  methodVersion: string;
  measureCount: number;
  /** Mean of measure scores; null when no measures. */
  score: number | null;
  band: ConcretenessBand;
  evidenceVolume: EvidenceVolume;
  whoRate: number | null;
  whatRate: number | null;
  whenRate: number | null;
  howRate: number | null;
  /** Average points contributed by each slot before broadness (0–100 scale). */
  slotPoints: {
    who: number | null;
    what: number | null;
    when: number | null;
    how: number | null;
  };
  /** Average points removed by implied-only deduction. */
  broadnessPointsLost: number | null;
  judgedMeasureCount: number;
  impliedOnlyCount: number;
  explicitCount: number;
  impliedOnlyShare: number | null;
  /** Share of TEF-matched measures that carry an explicit/implied label. */
  judgedCoverageShare: number | null;
  provisional: boolean;
  measures: MeasureConcretenessBreakdown[];
  headlineEn: string;
  summaryEn: string;
}

function fieldFilled(value: string | null | undefined): boolean {
  return Boolean(
    value && value.trim() && value.trim().toLowerCase() !== "none",
  );
}

function hitsForMeasure(measure: Measure, allHits: TefHit[]): TefHit[] {
  const text = measure.measure_text?.trim() ?? "";
  if (!text) return [];
  return allHits.filter((h) => (h.measureText ?? "").trim() === text);
}

/**
 * Explicit if any judged catalogue hit is explicit; implied-only when every
 * judged hit is implied. Runtime-shadow hits are ignored for wording (they are
 * gap proposals, not plan wording). Missing labels → unjudged.
 */
export function classifyMeasureWording(
  measure: Measure,
  allHits: TefHit[],
): MeasureWording {
  const hits = hitsForMeasure(measure, allHits).filter(
    (h) => (h.source ?? "official") !== "runtime-shadow",
  );
  if (hits.length === 0) return "no-tef";
  const judged = hits.filter((h) => typeof h.explicit === "boolean");
  if (judged.length === 0) return "unjudged";
  if (judged.some((h) => h.explicit === true)) return "explicit";
  return "implied-only";
}

export function scoreMeasureConcreteness(
  measure: Measure,
  allHits: TefHit[],
): MeasureConcretenessBreakdown {
  const who = fieldFilled(measure.intervention_who) ? 1 : 0;
  const what = fieldFilled(measure.intervention_what) ? 1 : 0;
  const when = fieldFilled(measure.intervention_when) ? 1 : 0;
  const how = fieldFilled(measure.intervention_how) ? 1 : 0;

  // No identifiable action content → zero (prevents actor+year targets scoring high).
  let slotScore =
    SLOT_WEIGHTS.who * who +
    SLOT_WEIGHTS.what * what +
    SLOT_WEIGHTS.when * when +
    SLOT_WEIGHTS.how * how;
  if (what === 0) slotScore = 0;

  const wording = classifyMeasureWording(measure, allHits);
  const broadnessFactor =
    wording === "implied-only" ? IMPLIED_ONLY_BROADNESS_FACTOR : 1;
  const score = 100 * slotScore * broadnessFactor;

  return {
    measureText: measure.measure_text ?? "",
    who: who as 0 | 1,
    what: what as 0 | 1,
    when: when as 0 | 1,
    how: how as 0 | 1,
    slotScore,
    wording,
    broadnessFactor,
    score,
  };
}

function bandFor(score: number | null, n: number): ConcretenessBand {
  if (n === 0 || score == null) return "unscored";
  if (score >= 70) return "concrete";
  if (score >= 35) return "partial";
  return "vague";
}

function evidenceFor(n: number): EvidenceVolume {
  if (n === 0) return "none";
  if (n < 5) return "limited";
  if (n < 20) return "moderate";
  return "broad";
}

export function computeActionConcreteness(
  record: ExploreMunicipalityRecord,
): ActionConcretenessResult {
  const breakdowns = record.measures.map((m) =>
    scoreMeasureConcreteness(m, record.tefHits),
  );
  const n = breakdowns.length;

  if (n === 0) {
    return {
      methodVersion: ACTION_CONCRETENESS_METHOD_VERSION,
      measureCount: 0,
      score: null,
      band: "unscored",
      evidenceVolume: "none",
      whoRate: null,
      whatRate: null,
      whenRate: null,
      howRate: null,
      slotPoints: { who: null, what: null, when: null, how: null },
      broadnessPointsLost: null,
      judgedMeasureCount: 0,
      impliedOnlyCount: 0,
      explicitCount: 0,
      impliedOnlyShare: null,
      judgedCoverageShare: null,
      provisional: false,
      measures: [],
      headlineEn: "No measures analysed yet.",
      summaryEn:
        "No scored measures in this extract — the concreteness score is blank, not zero.",
    };
  }

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const score = mean(breakdowns.map((b) => b.score));
  const whoRate = mean(breakdowns.map((b) => b.who));
  const whatRate = mean(breakdowns.map((b) => b.what));
  const whenRate = mean(breakdowns.map((b) => b.when));
  const howRate = mean(breakdowns.map((b) => b.how));

  const slotPoints = {
    who: 100 * SLOT_WEIGHTS.who * whoRate,
    what: 100 * SLOT_WEIGHTS.what * whatRate,
    when: 100 * SLOT_WEIGHTS.when * whenRate,
    how: 100 * SLOT_WEIGHTS.how * howRate,
  };

  // Points that would exist without the broadness factor, minus actual score.
  const beforeBroadness = mean(
    breakdowns.map((b) => 100 * b.slotScore),
  );
  const broadnessPointsLost = Math.max(0, beforeBroadness - score);

  const impliedOnlyCount = breakdowns.filter(
    (b) => b.wording === "implied-only",
  ).length;
  const explicitCount = breakdowns.filter(
    (b) => b.wording === "explicit",
  ).length;
  const withTef = breakdowns.filter(
    (b) => b.wording !== "no-tef",
  ).length;
  const judgedMeasureCount = breakdowns.filter(
    (b) => b.wording === "explicit" || b.wording === "implied-only",
  ).length;
  const judgedCoverageShare =
    withTef === 0 ? null : judgedMeasureCount / withTef;
  const impliedOnlyShare =
    judgedMeasureCount === 0 ? null : impliedOnlyCount / judgedMeasureCount;

  // Map comparison is provisional when TEF wording labels cover <80% of matched measures.
  const provisional =
    judgedCoverageShare != null && judgedCoverageShare < 0.8 && withTef >= 3;

  const rounded = Math.round(score);
  const headlineEn = `Action concreteness ${rounded}/100 across ${n} unique measure${n === 1 ? "" : "s"}.`;
  const summaryEn = [
    `Each measure earns up to 100 points: ${Math.round(SLOT_WEIGHTS.what * 100)} for what, ${Math.round(SLOT_WEIGHTS.how * 100)} for how, ${Math.round(SLOT_WEIGHTS.who * 100)} for who, ${Math.round(SLOT_WEIGHTS.when * 100)} for when.`,
    `Implied-only TEF wording keeps ${Math.round(IMPLIED_ONLY_BROADNESS_FACTOR * 100)}% of that score (max ${Math.round((1 - IMPLIED_ONLY_BROADNESS_FACTOR) * 100)}-point deduction).`,
    judgedMeasureCount === 0
      ? "No explicit/implied TEF labels yet — score is slot-only."
      : `${impliedOnlyCount} of ${judgedMeasureCount} judged measures are implied-only.`,
    "Describes plan wording, not climate ambition or expected impact.",
  ].join(" ");

  return {
    methodVersion: ACTION_CONCRETENESS_METHOD_VERSION,
    measureCount: n,
    score,
    band: bandFor(score, n),
    evidenceVolume: evidenceFor(n),
    whoRate,
    whatRate,
    whenRate,
    howRate,
    slotPoints,
    broadnessPointsLost,
    judgedMeasureCount,
    impliedOnlyCount,
    explicitCount,
    impliedOnlyShare,
    judgedCoverageShare,
    provisional,
    measures: breakdowns,
    headlineEn,
    summaryEn,
  };
}

export function concretenessBandLabel(band: ConcretenessBand): string {
  switch (band) {
    case "concrete":
      return "More specified";
    case "partial":
      return "Partly specified";
    case "vague":
      return "Less specified";
    case "unscored":
      return "Not scored";
  }
}

export function formatConcretenessScore(score: number | null): string {
  if (score == null) return "—";
  return String(Math.round(score));
}

/** Methodology copy for the Website visuals v2 panel. */
export const ACTION_CONCRETENESS_METHODOLOGY = {
  title: "How the action concreteness score works",
  shortEn:
    "The score summarises how much implementation detail appears in analysed climate-plan actions. Action content (what) contributes 35%, method (how) 25%, and responsibility and timing 20% each. Measures whose transition is only implied keep 85% of that score. Repeated actions are already deduped in the pipeline; municipalities are compared using the average across unique measures. The number describes plan wording — not ambition or impact.",
  weights: SLOT_WEIGHTS,
  impliedFactor: IMPLIED_ONLY_BROADNESS_FACTOR,
  version: ACTION_CONCRETENESS_METHOD_VERSION,
  steps: [
    {
      title: "1. Unique measures",
      body: "Start from pipeline-extracted measures. Climate-relevant actionable commitments are already collapsed by similarGroupId before scoring, so the count is unique interventions — not raw commitment lines.",
    },
    {
      title: "2. Slot coding (binary for now)",
      body: "Each measure’s who / what / when / how fields count as filled when non-empty and not the placeholder “none”. We deliberately use binary coding until graded slot quality (named unit vs “kommunen”, year vs “under planperioden”) is reliable and auditable.",
    },
    {
      title: "3. What-gate",
      body: "If what is empty, the measure scores 0 even if who/when/how are filled. That stops pure targets or actor+deadline lines from looking concrete without an action.",
    },
    {
      title: "4. Weighted slot score",
      body: "S = 0.35·what + 0.25·how + 0.20·who + 0.20·when. What weighs most because it is the intervention; how is next because it names the instrument; who and when are equal checkability signals.",
    },
    {
      title: "5. Implied-TEF broadness modulator",
      body: "If every judged official/proposed TEF match on the measure is implied (explicit=false), multiply by 0.85. Any explicit match, no TEF, or missing labels leaves the factor at 1.0. Runtime-shadow hits are ignored here. Broadness can trim at most 15 points and cannot create points when slots are empty.",
    },
    {
      title: "6. Municipal average",
      body: "Unweighted mean of measure scores (0–100). Plan length does not inflate the score. Always show the measure count and an evidence label (limited / moderate / broad).",
    },
  ],
  caveats: [
    "Extraction quality (OCR, lost table columns for Ansvarig/Tidplan) can make concrete actions look vague.",
    "Slots are model paraphrases, not verbatim quotes — a filled who may be an assumed “municipality”.",
    "Companion action plans or budgets may hold responsibility and timing not present in the scored document.",
    "An implied TEF can mean catalogue mismatch or sibling TEFs, not only vague writing.",
    "Concrete ≠ effective; vague ≠ unambitious. Differences of a few points are not meaningful rankings.",
    "Older extracts without explicit/implied labels are slot-only; maps mark the score provisional when label coverage is thin.",
  ],
  rejectedAlternatives: [
    "Mean of the model’s intervention_score (1–7) — opaque and non-reproducible at temperature 1.",
    "Hard TEF penalty subtracted from the municipal score — double-counts what and depends on sector taxonomy density.",
    "Hit-level implied share — one broad measure with many sibling hits would dominate; we stay measure-level.",
    "Weighting measures by emissions — mixes relevance with concreteness; keep as a separate view later.",
  ],
} as const;
