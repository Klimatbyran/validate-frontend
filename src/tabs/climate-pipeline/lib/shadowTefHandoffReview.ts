import handoffReviewData from "../data/shadowTefHandoffReview.json";

export type HandoffOutcome =
  | "ADD"
  | "BROADEN"
  | "USE-EXISTING"
  | "DO-NOT-ADOPT";

export interface HandoffOutcomeEntry {
  component: string | null;
  outcome: HandoffOutcome;
  comment: string | null;
}

export interface HandoffReview {
  originalLabel: string;
  outcomes: HandoffOutcomeEntry[];
}

// Historic human review of the 81 shadow-taxonomy suggestions as they stood
// on 2026-11-05, from the TEF authority's handoff
// (shadow_tef_handoff_2026-11-07/suggestion_responses.csv). Keyed by
// suggestion_id, which is the ShadowTransitionElement's own database id at
// export time -- confirmed against
// klimatplaner/eval/test_set_shadow_tef_matching_real_examples.json, whose
// entries were pulled from the same production rows by that id. Frozen at
// review time: this never updates, so it stays correct evidence of "what
// the reviewer said" even after an element is promoted, rejected, merged,
// or deleted and its live `comment` field no longer reflects it (or no
// longer exists to reflect it at all).
const handoffReviewById = handoffReviewData as Record<string, HandoffReview>;

export function getHandoffReview(
  shadowElementId: string | null | undefined,
): HandoffReview | null {
  if (!shadowElementId) return null;
  return handoffReviewById[shadowElementId] ?? null;
}
