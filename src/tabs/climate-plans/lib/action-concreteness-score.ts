/**
 * Action specification score (Website visuals v2).
 *
 * Primary score = who / what / when / how completeness only.
 * Framework directness (TEF explicit vs implied) is reported beside it.
 * Combined (slots × implied-only 0.85 trim) is kept as an experimental
 * comparison so we can see impact — not as the published primary.
 *
 * Measures what the plan *text* specifies — not ambition, impact, or quality.
 * Methodology version is frozen in ACTION_CONCRETENESS_METHOD_VERSION.
 */

import type { ExploreMunicipalityRecord, TefHit } from "./explore-types";
import type { Measure } from "./measures-types";

/** Bump when weights, gates, or aggregation change. */
export const ACTION_CONCRETENESS_METHOD_VERSION = "v2.1-slots-primary-2026-03";

/** Slot weights sum to 1. WHAT dominates; HOW next; WHO and WHEN equal. */
export const SLOT_WEIGHTS = {
  what: 0.35,
  how: 0.25,
  who: 0.2,
  when: 0.2,
} as const;

/**
 * Experimental combined score only: implied-only measures keep this fraction
 * of their slot score (15% max deduction). Not applied to the primary score.
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
  /** Primary: slots only (0–100). */
  score: number;
  /** Experimental: slots × implied-only trim (0–100). */
  combinedScore: number;
}

export interface ActionConcretenessResult {
  methodVersion: string;
  measureCount: number;
  /**
   * Primary municipal average: who/what/when/how only (0–100).
   * Null when no measures.
   */
  score: number | null;
  /** Experimental average with implied-only 0.85 trim. */
  combinedScore: number | null;
  /**
   * Share of judged TEF-matched actions whose measure text directly names
   * the matched transition (explicit). Null when nothing was judged.
   */
  directWordingShare: number | null;
  /** Share of actions with all four slots filled. */
  fullSpecShare: number | null;
  band: ConcretenessBand;
  evidenceVolume: EvidenceVolume;
  whoRate: number | null;
  whatRate: number | null;
  whenRate: number | null;
  howRate: number | null;
  /** Average points contributed by each slot (0–100 scale). */
  slotPoints: {
    who: number | null;
    what: number | null;
    when: number | null;
    how: number | null;
  };
  /** Average points the experimental trim would remove vs primary. */
  broadnessPointsLost: number | null;
  judgedMeasureCount: number;
  impliedOnlyCount: number;
  explicitCount: number;
  impliedOnlyShare: number | null;
  /** Share of TEF-matched measures that carry an explicit/implied label. */
  judgedCoverageShare: number | null;
  /**
   * True when TEF wording labels cover <80% of matched measures — flags the
   * experimental combined / direct-wording views, not the primary slot score.
   */
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
 *
 * Pipeline meaning of explicit: the measure's own text directly names this
 * TEF's destination/mechanism (or a synonym / specific instance). Implied
 * means the match is a reasonable inference, or the text names a broad
 * category while this TEF is one of many equally plausible siblings — not
 * necessarily that who/what/when/how are missing.
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
  const score = 100 * slotScore;
  const combinedScore = 100 * slotScore * broadnessFactor;

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
    combinedScore,
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
      combinedScore: null,
      directWordingShare: null,
      fullSpecShare: null,
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
  const combinedScore = mean(breakdowns.map((b) => b.combinedScore));
  const whoRate = mean(breakdowns.map((b) => b.who));
  const whatRate = mean(breakdowns.map((b) => b.what));
  const whenRate = mean(breakdowns.map((b) => b.when));
  const howRate = mean(breakdowns.map((b) => b.how));
  const fullSpecShare = mean(
    breakdowns.map((b) =>
      b.who === 1 && b.what === 1 && b.when === 1 && b.how === 1 ? 1 : 0,
    ),
  );

  // Gated slot contributions: what-empty measures contribute 0 to every bar,
  // so the bars sum to the primary municipal score.
  const gatedPoints = breakdowns.map((b) => {
    if (b.what === 0) return { who: 0, what: 0, when: 0, how: 0 };
    return {
      who: 100 * SLOT_WEIGHTS.who * b.who,
      what: 100 * SLOT_WEIGHTS.what * b.what,
      when: 100 * SLOT_WEIGHTS.when * b.when,
      how: 100 * SLOT_WEIGHTS.how * b.how,
    };
  });
  const slotPoints = {
    who: mean(gatedPoints.map((p) => p.who)),
    what: mean(gatedPoints.map((p) => p.what)),
    when: mean(gatedPoints.map((p) => p.when)),
    how: mean(gatedPoints.map((p) => p.how)),
  };

  const broadnessPointsLost = Math.max(0, score - combinedScore);

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
  const directWordingShare =
    judgedMeasureCount === 0 ? null : explicitCount / judgedMeasureCount;

  // Direct-wording / combined views: flag thin or incomplete label coverage,
  // including small samples (n < 3 judged) that would otherwise look definitive.
  const provisional =
    withTef > 0 &&
    (judgedCoverageShare == null ||
      judgedCoverageShare < 0.8 ||
      judgedMeasureCount < 3);

  const rounded = Math.round(score);
  const headlineEn = `Plan action detail: ${rounded}/100 (average of ${n} action${n === 1 ? "" : "s"} in the plan).`;
  const summaryEn = [
    `Primary score uses who/what/when/how only: ${Math.round(SLOT_WEIGHTS.what * 100)} for what, ${Math.round(SLOT_WEIGHTS.how * 100)} for how, ${Math.round(SLOT_WEIGHTS.who * 100)} for who, ${Math.round(SLOT_WEIGHTS.when * 100)} for when.`,
    judgedMeasureCount === 0
      ? "No clear vs inferred framework labels yet — framework directness is blank."
      : `${explicitCount} of ${judgedMeasureCount} labelled actions name their matched theme directly (${Math.round((directWordingShare ?? 0) * 100)}% direct).`,
    broadnessPointsLost > 0.05
      ? `Experimental combined score (slots × ${Math.round(IMPLIED_ONLY_BROADNESS_FACTOR * 100)}% when only inferred matches) averages ${Math.round(combinedScore)}/100 — ${broadnessPointsLost.toFixed(1)} pts below primary.`
      : "Experimental combined score matches the primary here (no implied-only trim applied).",
    "This describes plan wording detail and theme-naming directness — not ambition or expected impact.",
  ].join(" ");

  return {
    methodVersion: ACTION_CONCRETENESS_METHOD_VERSION,
    measureCount: n,
    score,
    combinedScore,
    directWordingShare,
    fullSpecShare,
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
      return "Most details stated";
    case "partial":
      return "Some details stated";
    case "vague":
      return "Few details stated";
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

export function formatSharePercent(share: number | null): string {
  if (share == null) return "—";
  return `${Math.round(share * 100)}%`;
}

/** Methodology copy for the Website visuals v2 panel. */
export const ACTION_CONCRETENESS_METHODOLOGY = {
  title: "How we estimate plan action detail",
  shortEn:
    "We score how completely each analysed climate-plan action is described — who is responsible, what will be done, when, and how. That primary number is an average of unique actions. Separately, we report whether those actions’ own wording directly names the climate theme we matched them to. An experimental third number shows what happens if we still apply the old 15% trim for implied-only theme matches. None of these numbers measure ambition, climate impact, or likelihood of delivery.",
  whatItMeasures: [
    "How often the extracted action text includes identifiable who / what / when / how detail.",
    "Whether matched climate-theme links are named in the action’s own words (framework directness), reported beside the primary score.",
    "How many unique actions the extract contains, and whether evidence is based on few, some, or many actions.",
  ],
  whatItDoesNotMeasure: [
    "Whether the plan is ambitious enough.",
    "Whether actions will cut emissions enough, or at all.",
    "Whether a generic “municipality” actor is as good as a named department — binary fill cannot tell that yet.",
    "Whether more actions are better. A short list of specific actions aimed at the largest emission sources can outperform a long list of vague ones.",
    "PDF extraction quality itself — though extraction failures can make a concrete plan look incomplete.",
  ],
  readingWithOtherKpis:
    "Read the three Website visuals v2 views together. Plan action detail answers “how specified is the wording?” Biggest-source fit answers “does the plan engage the largest emission sector?” Actions in the plan is a volume count only — useful context, not a quality ranking. Prefer a municipality with fewer, well-specified actions that address the biggest source over one with many underspecified lines that miss it.",
  weights: SLOT_WEIGHTS,
  impliedFactor: IMPLIED_ONLY_BROADNESS_FACTOR,
  version: ACTION_CONCRETENESS_METHOD_VERSION,
  steps: [
    {
      title: "1. Start from unique actions",
      body: "We use climate-related actions already extracted from the municipal plan. Similar commitments are collapsed upstream, so each scored row is meant to be a distinct intervention — not every repeated sentence in the PDF.",
    },
    {
      title: "2. Mark who / what / when / how as present or absent",
      body: "For now each field is binary: filled if non-empty and not the placeholder “none”. We deliberately avoid graded judgements (named unit vs “the municipality”, a calendar year vs “during the plan period”) until those distinctions are reliable enough to audit. Important honesty limit: a filled who can be a model paraphrase such as “municipality” even when the plan never named an owner.",
    },
    {
      title: "3. Require an identifiable what",
      body: "If what is empty, the action scores 0 even when who, when, or how are filled. That stops pure targets or “someone by 2030” lines from looking specified without an intervention.",
    },
    {
      title: "4. Build the primary specification score",
      body: "Per action: 100 × (0.35·what + 0.25·how + 0.20·who + 0.20·when). What weighs most because it is the intervention; how names the instrument; who and when are equal checkability signals. The municipal figure is the unweighted mean across unique actions, so a longer plan does not automatically score higher. We also show the share of actions with all four slots filled and an evidence label (few / some / many actions).",
    },
    {
      title: "5. Report framework directness beside the primary",
      body: "When the matcher links an action to a climate-theme catalogue entry, the pipeline judges whether the action’s own text directly names that theme’s destination or mechanism (explicit) or only supports a reasonable inference / sits among many equally plausible siblings (implied). Among judged actions we report the share that are explicit. Implied is related to broader theme-naming, but it is not the same as missing who/what/when/how — so it is not folded into the primary score. Experimental gap (“runtime-shadow”) matches are ignored here.",
    },
    {
      title: "6. Keep the old combined trim only as a comparison",
      body: "Previously we multiplied implied-only actions by 0.85 inside the main score. That mixed two different questions. We still compute that combined number for side-by-side impact checks, but it is labelled experimental and is not the published primary.",
    },
  ],
  caveats: [
    "Extraction quality (OCR, lost table columns for responsibility or timing) can make specific actions look vague — the score can partly reflect document recovery, not only planning style.",
    "Who/what/when/how are model paraphrases, not verbatim quotes. A filled who may be an assumed “municipality”; until we can flag inferred actors, treat filled slots as “present in the extract,” not proven plan wording.",
    "Companion action plans or budgets may hold responsibility and timing that never appear in the scored document.",
    "An implied theme match can mean catalogue sibling sprawl or ontology gaps, not only vague writing — another reason it stays outside the primary score.",
    "Clear wording ≠ effective action; vague wording ≠ unambitious plan. Differences of a few points are not meaningful rankings.",
    "Action count is volume, not quality. Do not rank municipalities by how many actions they list.",
    "Older extracts without clear-vs-inferred labels leave framework directness and the combined score under-covered; those views may be marked as early estimates.",
  ],
  rejectedAlternatives: [
    "Mean of the model’s intervention_score (1–7) — opaque and hard to reproduce.",
    "Keeping the implied-TEF trim inside the primary score — conflates implementation detail with catalogue match style.",
    "A hard framework penalty on the municipal score — double-counts “what” and depends on how dense the sector catalogue is.",
    "Share of broad hits at the hit level — one broad action with many sibling matches would dominate; we stay action-level.",
    "Weighting the specification score by emissions — mixes relevance with wording detail; biggest-source fit stays a separate view.",
    "Treating action count as a quality KPI — rewards long lists over targeted, specified actions.",
  ],
} as const;

/** How to read the three Website visuals v2 public views together. */
export const WEBSITE_V2_KPI_READING_GUIDE = {
  title: "How to read these three views together",
  shortEn:
    "Action detail, biggest-source fit, and action count answer different questions. None of them alone says a plan is “good.” A few concrete actions aimed at the largest emission source can be more useful than many vague actions that miss it.",
  points: [
    {
      label: "Action detail",
      body: "How fully the plan’s actions are written up (who / what / when / how). Higher means more complete wording on average — not more climate impact. A short precise plan can score above a long vague one.",
    },
    {
      label: "Biggest-source fit",
      body: "Whether we found actions for the sector that dominates local emissions, and whether that sector also has the largest share of the plan’s mapped actions. Counts actions found — not how much each would cut.",
    },
    {
      label: "Actions found",
      body: "Count of unique climate-related actions after similar ones are merged. Volume only. More is not automatically better; use it with the other two views.",
    },
  ],
  biggestSourceMethod: {
    title: "How biggest-source fit is decided",
    body: "Using Unearth territorial emissions grouped into six mapped sectors (latest inventory year; machinery/product-use buckets are outside this set), we identify the largest sector. No actions mapped there → Not really. Some actions, but that sector is not among the top action counts or under 25% of the plan’s actions → Partly. Among the top count(s) and ≥25% of actions → Yes (ties allowed). One thin action can still count as “found”; whether those actions are well specified is the separate action-detail score.",
  },
} as const;
