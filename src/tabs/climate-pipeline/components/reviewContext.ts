import type { PipelineReview } from "../hooks/usePipelineReviews";

export type ReviewLookup = Map<string, PipelineReview>;

export interface ReviewContext {
  planId: string;
  step: string;
  reviewsByEntity: ReviewLookup;
  onReviewChanged: (review: PipelineReview | null, key: string) => void;
  /** Advance review queue after Looks good (review mode only). */
  onAdvanceAfterOk?: () => void;
}
