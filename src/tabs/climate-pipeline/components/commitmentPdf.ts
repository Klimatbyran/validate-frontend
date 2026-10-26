import type { Commitment } from "../hooks/useClimatePlanDetail";

/** A commitment's own text, split into independently-searchable parts when
 * it was merged from several source sentences (see Commitment.extractionParts)
 * — a merge doesn't always sit contiguously in the source, so searching for
 * the whole merged text as one string would miss every part after the
 * first. Falls back to [commitment.text] when there are no parts. */
export function commitmentParts(commitment: Commitment): string[] {
  return commitment.extractionParts && commitment.extractionParts.length > 0
    ? commitment.extractionParts.map((p) => p.text)
    : [commitment.text];
}

// "focused" only searches for the one clicked commitment — much cheaper
// than "all", which searches every verified phrase against every page.
// Keeping them separate means a single "Find in PDF" click stays fast
// regardless of how many commitments the plan has. Lifted to
// StepResultDialog (rather than living inside CommitmentsList) so it can
// decide whether the PDF opens as a modal or a side-by-side panel.
// Green for "passed the climate filter" — gray for "filtered out" reuses
// PdfHighlightViewer's own default secondary color, so only this one needs
// defining here.
export const CLIMATE_PASSED_COLOR = "rgba(34, 197, 94, 0.45)";

export type PdfViewerState =
  | { mode: "focused"; commitment: Commitment }
  | { mode: "all" }
  // Only reachable from the climate-filter step's own "view all in PDF"
  // button — colors verified commitments green/gray by whether they
  // passed the climate filter instead of the usual flat yellow (see
  // CLIMATE_PASSED_COLOR above; the gray side reuses PdfHighlightViewer's
  // own default secondary color).
  | { mode: "all-climate" };
