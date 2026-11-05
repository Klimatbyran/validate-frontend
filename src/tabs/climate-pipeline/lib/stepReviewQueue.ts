import type {
  ActivityShift,
  ClimatePlanDetail,
  Commitment,
  ExtractedMeasure,
  TransitionElementMatch,
} from "../hooks/useClimatePlanDetail";
import { reviewKey, type PipelineReview } from "../hooks/usePipelineReviews";
import {
  activityShiftEntityKey,
  commitmentEntityId,
  measureEntityId,
  teMatchEntityId,
} from "./stepReviewEntities";

export type QaStatusFilter =
  | "all"
  | "with-comment"
  | "verified"
  | "not-reviewed";

export type StepViewMode = "list" | "review";

export type CommitmentReviewColumns =
  | "extract"
  | "climate"
  | "actionable"
  | "similar"
  | "themes";

export type MeasureReviewColumns = "extract" | "score";

/** Synthetic entityId suffix for a shift with no TE matches yet. */
export const TE_UNMATCHED_SUFFIX = "__unmatched__";

export function teUnmatchedEntityId(shift: ActivityShift): string {
  return `${activityShiftEntityKey(shift)}:${TE_UNMATCHED_SUFFIX}`;
}

export type StepReviewItem =
  | {
      kind: "commitment";
      entityType: "commitment";
      entityId: string;
      commitment: Commitment;
      columns: CommitmentReviewColumns;
    }
  | {
      /** One theme or similar-group (or a unique singleton) for grouped steps. */
      kind: "commitmentGroup";
      entityType: "commitmentGroup";
      entityId: string;
      groupLabel: string;
      columns: "similar" | "themes";
      commitments: Commitment[];
    }
  | {
      kind: "measure";
      entityType: "measure";
      entityId: string;
      measure: ExtractedMeasure;
      columns: MeasureReviewColumns;
    }
  | {
      kind: "teMatch";
      entityType: "teMatch";
      entityId: string;
      measure: ExtractedMeasure;
      shift: ActivityShift;
      match: TransitionElementMatch;
    }
  | {
      kind: "teUnmatched";
      entityType: "teMatch";
      entityId: string;
      measure: ExtractedMeasure;
      shift: ActivityShift;
    };

const STEP_REVIEW_PROMPTS: Record<string, string> = {
  extractCommitments:
    "Is this a real commitment, correctly quoted from the plan?",
  filterCommitmentsClimate: "Is the climate / adaptation judgment correct?",
  filterCommitmentsActionable: "Is the actionable judgment correct?",
  groupCommitmentsSimilar:
    "Are these duplicates correctly grouped — or is this correctly unique?",
  groupCommitmentsThemes: "Do these commitments belong under this theme?",
  extractMeasures: "Is this a real measure, correctly extracted?",
  scoreMeasures:
    "Are the activity-shift / intervention scores and type reasonable?",
  matchTransitionElements: "Does this correctly link to the right TEF?",
};

export function getStepReviewPrompt(step: string): string | null {
  return STEP_REVIEW_PROMPTS[step] ?? null;
}

export function stepSupportsReviewMode(step: string): boolean {
  return step in STEP_REVIEW_PROMPTS;
}

export function commitmentsForStep(
  step: string,
  detail: ClimatePlanDetail,
): Commitment[] {
  switch (step) {
    case "extractCommitments":
    case "filterCommitmentsClimate":
      return detail.commitments;
    case "filterCommitmentsActionable":
      return detail.commitments.filter((c) => c.climateRelevant);
    case "groupCommitmentsSimilar":
    case "groupCommitmentsThemes":
      return detail.commitments.filter(
        (c) => c.climateRelevant && c.actionable,
      );
    default:
      return [];
  }
}

function commitmentColumnsForStep(step: string): CommitmentReviewColumns {
  switch (step) {
    case "filterCommitmentsClimate":
      return "climate";
    case "filterCommitmentsActionable":
      return "actionable";
    case "groupCommitmentsSimilar":
      return "similar";
    case "groupCommitmentsThemes":
      return "themes";
    default:
      return "extract";
  }
}

/** Whether a review record matches a QA status chip. */
export function matchesQaFilter(
  review: PipelineReview | undefined,
  filter: QaStatusFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "verified":
      return review?.status === "OK";
    case "with-comment":
      // Non-OK statuses count even without free-text (suggest-only / issue mark).
      return (
        Boolean(review?.comment?.trim()) ||
        review?.status === "ISSUE" ||
        review?.status === "SUGGESTED_FIX"
      );
    case "not-reviewed":
      return !review;
    default:
      return true;
  }
}

/**
 * Reviews that count toward an unmatched shift's QA state: the synthetic
 * teMatch (__unmatched__) row plus any teMatchAdd suggestions for the shift.
 * Add TEF saves as teMatchAdd, so filters must look there too.
 */
export function teUnmatchedRelatedReviews(
  shift: ActivityShift,
  step: string,
  reviewsByEntity: Map<string, PipelineReview>,
): PipelineReview[] {
  const shiftKey = activityShiftEntityKey(shift);
  const related: PipelineReview[] = [];
  const unmatched = reviewsByEntity.get(
    reviewKey(step, "teMatch", teUnmatchedEntityId(shift)),
  );
  if (unmatched) related.push(unmatched);
  for (const review of reviewsByEntity.values()) {
    if (review.step !== step || review.entityType !== "teMatchAdd") continue;
    if (
      review.entityId === shiftKey ||
      review.entityId.startsWith(`${shiftKey}:add:`)
    ) {
      related.push(review);
    }
  }
  return related;
}

export function unmatchedMatchesQaFilter(
  shift: ActivityShift,
  step: string,
  reviewsByEntity: Map<string, PipelineReview>,
  filter: QaStatusFilter,
): boolean {
  if (filter === "all") return true;
  const related = teUnmatchedRelatedReviews(shift, step, reviewsByEntity);
  if (filter === "not-reviewed") return related.length === 0;
  return related.some((review) => matchesQaFilter(review, filter));
}

function buildThemeGroupItems(commitments: Commitment[]): StepReviewItem[] {
  const byTheme = new Map<string, Commitment[]>();
  for (const c of commitments) {
    const key = c.theme ?? "(none)";
    const list = byTheme.get(key) ?? [];
    list.push(c);
    byTheme.set(key, list);
  }
  return [...byTheme.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([theme, members]) => ({
      kind: "commitmentGroup" as const,
      entityType: "commitmentGroup" as const,
      entityId: `theme:${theme}`,
      groupLabel: theme,
      columns: "themes" as const,
      commitments: members,
    }));
}

function buildSimilarGroupItems(commitments: Commitment[]): StepReviewItem[] {
  const groups = new Map<string, Commitment[]>();
  const singletons: Commitment[] = [];
  for (const c of commitments) {
    if (c.similarGroupId) {
      const list = groups.get(c.similarGroupId) ?? [];
      list.push(c);
      groups.set(c.similarGroupId, list);
    } else {
      singletons.push(c);
    }
  }
  const items: StepReviewItem[] = [...groups.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([groupId, members]) => ({
      kind: "commitmentGroup" as const,
      entityType: "commitmentGroup" as const,
      entityId: `similar:${groupId}`,
      groupLabel: "Duplicate group",
      columns: "similar" as const,
      commitments: members,
    }));
  for (const c of singletons) {
    items.push({
      kind: "commitmentGroup",
      entityType: "commitmentGroup",
      entityId: `unique:${commitmentEntityId(c)}`,
      groupLabel: "Unique",
      columns: "similar",
      commitments: [c],
    });
  }
  return items;
}

/** Aggregate member commitment reviews for a grouped review-queue item. */
function groupMatchesQaFilter(
  commitments: Commitment[],
  step: string,
  reviewsByEntity: Map<string, PipelineReview>,
  filter: QaStatusFilter,
): boolean {
  if (filter === "all") return true;
  const memberReviews = commitments.map((c) =>
    reviewsByEntity.get(reviewKey(step, "commitment", commitmentEntityId(c))),
  );
  switch (filter) {
    case "verified":
      return (
        memberReviews.length > 0 &&
        memberReviews.every((r) => r?.status === "OK")
      );
    case "with-comment":
      return memberReviews.some((r) => matchesQaFilter(r, "with-comment"));
    case "not-reviewed":
      return memberReviews.some((r) => !r);
    default:
      return true;
  }
}

/** Flatten the same entities the step list already QA's into a review queue. */
export function buildStepReviewItems(
  step: string,
  detail: ClimatePlanDetail,
): StepReviewItem[] {
  switch (step) {
    case "extractCommitments":
    case "filterCommitmentsClimate":
    case "filterCommitmentsActionable": {
      const columns = commitmentColumnsForStep(step);
      return commitmentsForStep(step, detail).map((commitment) => ({
        kind: "commitment" as const,
        entityType: "commitment" as const,
        entityId: commitmentEntityId(commitment),
        commitment,
        columns,
      }));
    }
    case "groupCommitmentsThemes":
      return buildThemeGroupItems(commitmentsForStep(step, detail));
    case "groupCommitmentsSimilar":
      return buildSimilarGroupItems(commitmentsForStep(step, detail));
    case "extractMeasures":
      return detail.extractedMeasures.map((measure) => ({
        kind: "measure" as const,
        entityType: "measure" as const,
        entityId: measureEntityId(measure),
        measure,
        columns: "extract" as const,
      }));
    case "scoreMeasures":
      return detail.extractedMeasures.map((measure) => ({
        kind: "measure" as const,
        entityType: "measure" as const,
        entityId: measureEntityId(measure),
        measure,
        columns: "score" as const,
      }));
    case "matchTransitionElements": {
      const items: StepReviewItem[] = [];
      for (const measure of detail.extractedMeasures) {
        for (const shift of measure.score?.activityShifts ?? []) {
          if (shift.transitionElementMatches.length === 0) {
            items.push({
              kind: "teUnmatched",
              entityType: "teMatch",
              entityId: teUnmatchedEntityId(shift),
              measure,
              shift,
            });
            continue;
          }
          for (const match of shift.transitionElementMatches) {
            items.push({
              kind: "teMatch",
              entityType: "teMatch",
              entityId: teMatchEntityId(shift, match.stableId),
              measure,
              shift,
              match,
            });
          }
        }
      }
      return items;
    }
    default:
      return [];
  }
}

export function filterByQaStatus(
  items: StepReviewItem[],
  step: string,
  reviewsByEntity: Map<string, PipelineReview>,
  filter: QaStatusFilter,
): StepReviewItem[] {
  if (filter === "all") return items;

  return items.filter((item) => {
    if (item.kind === "commitmentGroup") {
      return groupMatchesQaFilter(
        item.commitments,
        step,
        reviewsByEntity,
        filter,
      );
    }
    if (item.kind === "teUnmatched") {
      return unmatchedMatchesQaFilter(
        item.shift,
        step,
        reviewsByEntity,
        filter,
      );
    }
    const review = reviewsByEntity.get(
      reviewKey(step, item.entityType, item.entityId),
    );
    return matchesQaFilter(review, filter);
  });
}

export function countByQaStatus(
  items: StepReviewItem[],
  step: string,
  reviewsByEntity: Map<string, PipelineReview>,
): Record<QaStatusFilter, number> {
  return {
    all: items.length,
    verified: filterByQaStatus(items, step, reviewsByEntity, "verified").length,
    "with-comment": filterByQaStatus(
      items,
      step,
      reviewsByEntity,
      "with-comment",
    ).length,
    "not-reviewed": filterByQaStatus(
      items,
      step,
      reviewsByEntity,
      "not-reviewed",
    ).length,
  };
}

/** Commitments still visible after applying the QA status filter. */
export function filterCommitmentsByQaStatus(
  commitments: Commitment[],
  step: string,
  reviewsByEntity: Map<string, PipelineReview>,
  filter: QaStatusFilter,
): Commitment[] {
  if (filter === "all") return commitments;
  return commitments.filter((c) => {
    const review = reviewsByEntity.get(
      reviewKey(step, "commitment", commitmentEntityId(c)),
    );
    return matchesQaFilter(review, filter);
  });
}

export function filterMeasuresByQaStatus(
  measures: ExtractedMeasure[],
  step: string,
  reviewsByEntity: Map<string, PipelineReview>,
  filter: QaStatusFilter,
): ExtractedMeasure[] {
  if (filter === "all") return measures;
  return measures.filter((m) => {
    const review = reviewsByEntity.get(
      reviewKey(step, "measure", measureEntityId(m)),
    );
    return matchesQaFilter(review, filter);
  });
}

export type TeMatchListFilterResult = {
  /** Original measures that still have something to show. */
  measures: ExtractedMeasure[];
  /**
   * Per activity-shift key: which match stableIds to render.
   * Missing key → show all matches. Empty set → show the shift with no
   * match cards (unmatched / filtered-out matches).
   */
  visibleMatchIdsByShiftKey: Map<string, Set<string>>;
};

/**
 * List-view filter for matchTransitionElements. Keeps full match arrays on
 * each shift (so add-slot logic stays correct) and reports which matches to
 * display. Includes unmatched shifts under All / Not reviewed.
 */
export function filterTeMatchesForListView(
  measures: ExtractedMeasure[],
  step: string,
  reviewsByEntity: Map<string, PipelineReview>,
  filter: QaStatusFilter,
): TeMatchListFilterResult {
  const visibleMatchIdsByShiftKey = new Map<string, Set<string>>();
  const out: ExtractedMeasure[] = [];

  for (const measure of measures) {
    if (!measure.score) continue;
    const keptShifts: ActivityShift[] = [];

    for (const shift of measure.score.activityShifts) {
      const shiftKey = activityShiftEntityKey(shift);
      const matches = shift.transitionElementMatches;

      if (matches.length === 0) {
        if (unmatchedMatchesQaFilter(shift, step, reviewsByEntity, filter)) {
          visibleMatchIdsByShiftKey.set(shiftKey, new Set());
          keptShifts.push(shift);
        }
        continue;
      }

      if (filter === "all") {
        keptShifts.push(shift);
        continue;
      }

      const visible = new Set<string>();
      for (const match of matches) {
        const review = reviewsByEntity.get(
          reviewKey(step, "teMatch", teMatchEntityId(shift, match.stableId)),
        );
        if (matchesQaFilter(review, filter)) {
          visible.add(match.stableId);
        }
      }
      if (visible.size === 0) continue;
      visibleMatchIdsByShiftKey.set(shiftKey, visible);
      keptShifts.push(shift);
    }

    if (keptShifts.length === 0) continue;
    out.push({
      ...measure,
      score: { ...measure.score, activityShifts: keptShifts },
    });
  }

  return { measures: out, visibleMatchIdsByShiftKey };
}

/** Item count for the dialog badge — aligned with the review queue where possible. */
export function getReviewableItemCount(
  step: string,
  detail: ClimatePlanDetail,
): number | null {
  if (!stepSupportsReviewMode(step)) return null;
  return buildStepReviewItems(step, detail).length;
}
