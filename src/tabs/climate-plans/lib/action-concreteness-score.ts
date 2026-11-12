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
export type MeasureWording =
  | "explicit"
  | "implied-only"
  | "unjudged"
  | "no-tef";

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
      headlineEn: "No plan actions to score yet.",
      summaryEn:
        "We have not found scored actions in this plan extract yet — the detail score is blank, not zero.",
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
  const beforeBroadness = mean(breakdowns.map((b) => 100 * b.slotScore));
  const broadnessPointsLost = Math.max(0, beforeBroadness - score);

  const impliedOnlyCount = breakdowns.filter(
    (b) => b.wording === "implied-only",
  ).length;
  const explicitCount = breakdowns.filter(
    (b) => b.wording === "explicit",
  ).length;
  const withTef = breakdowns.filter((b) => b.wording !== "no-tef").length;
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
  const headlineEn = `Plan action detail: ${rounded}/100 (average of ${n} action${n === 1 ? "" : "s"} in the plan).`;
  const summaryEn = [
    `Each action can score up to 100: ${Math.round(SLOT_WEIGHTS.what * 100)} for what will be done, ${Math.round(SLOT_WEIGHTS.how * 100)} for how, ${Math.round(SLOT_WEIGHTS.who * 100)} for who is responsible, ${Math.round(SLOT_WEIGHTS.when * 100)} for when.`,
    `Actions written only in broad terms keep ${Math.round(IMPLIED_ONLY_BROADNESS_FACTOR * 100)}% of that score (at most ${Math.round((1 - IMPLIED_ONLY_BROADNESS_FACTOR) * 100)} points trimmed).`,
    judgedMeasureCount === 0
      ? "No clear vs broad wording labels yet — this score is based only on who/what/when/how."
      : `${impliedOnlyCount} of ${judgedMeasureCount} labelled actions are written only in broad terms.`,
    "This describes how specific the plan text is — not how ambitious or effective it will be.",
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
      return "Clear wording";
    case "partial":
      return "Mixed wording";
    case "vague":
      return "Vague wording";
    case "unscored":
      return "Not scored";
  }
}

export function evidenceVolumeLabel(volume: EvidenceVolume): string {
  switch (volume) {
    case "none":
      return "No actions yet";
    case "limited":
      return "Based on few actions";
    case "moderate":
      return "Based on some actions";
    case "broad":
      return "Based on many actions";
  }
}

export function formatConcretenessScore(score: number | null): string {
  if (score == null) return "—";
  return String(Math.round(score));
}

/** Methodology copy for the Website visuals v2 panel. */
export const ACTION_CONCRETENESS_METHODOLOGY = {
  title: "How we estimate plan action detail",
  shortEn:
    "This score summarises how much practical detail shows up in the climate-plan actions we analysed. What will be done counts for 35%, how for 25%, and who is responsible and when for 20% each. Actions that only match a climate framework in broad terms keep 85% of that score. Repeated actions are already merged, so municipalities are compared on the average across unique actions. The number describes plan wording — not ambition or impact.",
  weights: SLOT_WEIGHTS,
  impliedFactor: IMPLIED_ONLY_BROADNESS_FACTOR,
  version: ACTION_CONCRETENESS_METHOD_VERSION,
  steps: [
    {
      title: "1. Unique actions",
      body: "Start from actions extracted from the plan. Similar climate commitments are already collapsed before scoring, so the count is unique interventions — not every repeated line in the document.",
    },
    {
      title: "2. Who / what / when / how (yes or no for now)",
      body: "Each action’s who, what, when, and how fields count as filled when they are non-empty and not the placeholder “none”. We keep this simple until finer quality (named unit vs “the municipality”, a year vs “during the plan period”) is reliable enough to audit.",
    },
    {
      title: "3. What comes first",
      body: "If what is empty, the action scores 0 even if who, when, or how are filled. That stops pure targets or actor-and-deadline lines from looking specific without a real action.",
    },
    {
      title: "4. Weighted detail score",
      body: "Score = 0.35·what + 0.25·how + 0.20·who + 0.20·when. What weighs most because it is the intervention; how is next because it names the instrument; who and when are equal signals that someone can check the plan.",
    },
    {
      title: "5. Broad-wording trim",
      body: "If every judged framework match on the action is only broad/implied, multiply by 0.85. Any clearly stated match, no framework match, or missing labels leaves the factor at 1.0. Experimental gap matches are ignored here. Broad wording can trim at most 15 points and cannot invent points when who/what/when/how are empty.",
    },
    {
      title: "6. Municipal average",
      body: "Unweighted mean of action scores (0–100). A longer plan does not inflate the score. Always show how many actions were scored and whether that evidence is few, some, or many.",
    },
  ],
  caveats: [
    "Extraction quality (OCR, lost table columns for responsibility or timing) can make specific actions look vague.",
    "Who/what/when/how are model paraphrases, not verbatim quotes — a filled who may be an assumed “municipality”.",
    "Companion action plans or budgets may hold responsibility and timing not present in the scored document.",
    "A broad framework match can mean catalogue mismatch or nearby sibling themes, not only vague writing.",
    "Clear wording ≠ effective action; vague wording ≠ unambitious plan. Differences of a few points are not meaningful rankings.",
    "Older extracts without clear-vs-broad labels are scored on slots only; maps mark the score as an early estimate when label coverage is thin.",
  ],
  rejectedAlternatives: [
    "Mean of the model’s intervention_score (1–7) — opaque and hard to reproduce.",
    "A hard framework penalty on the municipal score — double-counts “what” and depends on how dense the sector catalogue is.",
    "Share of broad hits at the hit level — one broad action with many sibling matches would dominate; we stay action-level.",
    "Weighting actions by emissions — mixes relevance with wording detail; keep as a separate view later.",
  ],
} as const;
