import { useState, useEffect, useCallback } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import type { PipelineReview } from "./usePipelineReviews";

/** One sentence-level piece the model produced before this commitment's
 * `text` was merged from possibly-several such parts (see
 * commitmentExtraction.ts's merge loop) — kept so a merged commitment can
 * still be searched/verified/highlighted per-part in the PDF even when the
 * merged whole isn't one contiguous excerpt of the document (a gap sits
 * between two parts, e.g. excluded background or a bullet marker). Only
 * `text` is used on this side; the rest of the JSON blob (reasoning
 * fields, etc.) is ignored here. */
export interface ExtractionPart {
  text: string;
}

/** One other cell from this commitment's table row (a responsible party, a
 * deadline, a status column, ...) — see commitmentText.ts's
 * parseTableRowMetadata. `label` falls back to a positional "Column N" when
 * the source table's header cell was blank/malformed. */
export interface TableRowField {
  label: string;
  value: string;
}

export interface Commitment {
  id: string;
  stableId: string;
  section: string;
  text: string;
  context: string;
  type: "TEXT" | "TABLE";
  tableHeader: string | null;
  rowRaw: string | null;
  /** Only ever set when type is "TABLE". Null for a TEXT commitment, a
   * TABLE one with no other non-empty cells, or a row from before this
   * existed. */
  tableMetadata: TableRowField[] | null;
  unverified: boolean;
  /** Null on rows from before this existed. */
  extractionParts: ExtractionPart[] | null;
  // True when the commitment came from a recovered-image block (OCR/AI
  // description of a picture, not verbatim document text) — not findable
  // via the PDF's text layer, so "Find in PDF" won't locate it.
  fromRecoveredImage: boolean;
  // Which other body/bodies, if any, this commitment's target or measure
  // is explicitly said to come from: a municipality can commit to a
  // region's and/or the EU's target/measure rather than its own. Empty
  // array (or null, on rows from before this existed) means nothing else
  // was named.
  originatesFrom: Array<"region" | "national" | "eu" | "other"> | null;
  climateRelevant: boolean | null;
  adaptation: boolean | null;
  climateFilterReason: string | null;
  actionable: boolean | null;
  actionableReason: string | null;
  similarGroupId: string | null;
  theme: string | null;
}

export interface TransitionElementMatch {
  stableId: string;
  shortLabel: string;
  sectorPath: string;
  description?: string;
  score: number;
  matchConfidence: "high" | "mid" | "low";
  matchReasoning?: string;
  // Whether the measure's own text directly names this match (vs. only a
  // reasonable inference) — an LLM judgment, read straight from tePicker's
  // judge() call, not computed from word overlap.
  explicit?: boolean;
  // Our own classification of this TE element into the same six Activity
  // Shift categories the shift itself is classified into (see
  // classifyTeTypes.ts) — temporary scaffolding until TEF sends real
  // per-element categories. Compare against the shift's own `type` to see
  // whether the two sides agree.
  ourShiftType?: string | null;
  // TEF's own undocumented binary tag — "shift" (genuine mode/technology
  // change) or "improve" (same activity, done more efficiently/less of
  // it). Kept for reference; not a reliable compatibility signal on its
  // own (see ourShiftType).
  type?: "shift" | "improve" | null;
}

/** Cosine candidates from the TE picker — may lack matchConfidence. */
export interface TransitionElementCandidate {
  stableId: string;
  shortLabel: string;
  sectorPath?: string;
  description?: string;
  score: number;
  ourShiftType?: string | null;
  type?: "shift" | "improve" | null;
}

export type DocumentReferenceRelationship = "companion" | "related" | "initiative";

export interface DocumentReference {
  id: string;
  section: string;
  name: string;
  quote: string;
  url: string | null;
  relationship: DocumentReferenceRelationship;
  reasoning: string;
  /** Set by groupDocumentReferences — rows sharing a value name the same
   * underlying document, mentioned in different sections. Null if this
   * reference had no duplicate. */
  groupId: string | null;
}

export interface ActivityShift {
  id: string;
  activity: string;
  shiftFrom: string;
  shiftTo: string;
  need: string;
  type: string;
  typeReasoning: string;
  score: number;
  reasoning: string;
  transitionElementMatches: TransitionElementMatch[];
  transitionElementCandidates?: TransitionElementCandidate[] | null;
  transitionElementSuggestedNew?: {
    shortLabel: string;
    description: string;
  } | null;
  // Outcome of tePicker's domain-specificity gate and structural grouping
  // step — "specific" | "multiple_specific" | "too_narrow" | "ambiguous" |
  // "none". transitionElementGroupLabel carries the broader-category label
  // for "too_narrow"/"ambiguous" results (e.g. the shared sector ancestor,
  // or the broader TE that should exist instead).
  transitionElementGateDomain?: string | null;
  transitionElementGroupKind?: string | null;
  transitionElementGroupLabel?: string | null;
}

export interface MeasureScore {
  id: string;
  activity: string;
  activityShiftScore: number;
  interventionWho: string;
  interventionWhen: string;
  interventionWhat: string;
  interventionHow: string;
  interventionScore: number;
  interventionReasoning: string;
  interventionType: string;
  activityShifts: ActivityShift[];
}

export interface ExtractedMeasure {
  id: string;
  measureText: string;
  climateRelevanceScore: "high" | "mid" | "low";
  score: MeasureScore | null;
}

/** A picture docling recovered from the source PDF — its layout model
 * drops OCR text found inside picture-classified regions otherwise (see
 * climate-plans-pipeline's RecoveredImage). description/ocrText already
 * got folded into `markdown` in the picture's place; this is kept
 * separately so a reviewer can see which actual image a given
 * description/commitment (see Commitment.fromRecoveredImage) came from.
 * thumbnail is a small (400px max dim) base64 JPEG, no data-URI prefix —
 * good for "is this the right picture", not for reading fine print at
 * high zoom. */
export interface RecoveredImage {
  id: string;
  pictureIndex: number;
  page: number | null;
  description: string | null;
  ocrText: string | null;
  thumbnail: string;
  /** False when the picture had too little OCR-recognized text to be
   * worth a VLM call (skipped entirely to save the cost, not a failure).
   * Kept on every row, not just ones with a description/ocrText, so a
   * reviewer can audit whether this gate is catching the right pictures. */
  hasText: boolean;
}

export interface ClimatePlanDetail {
  id: string;
  url: string;
  extractedMunicipalityName: string | null;
  municipality: { id: string; name: string } | null;
  status: string;
  /** Extracted alongside the municipality name, from the same document —
   * lets this specific document be told apart from the municipality's
   * other ones (its klimatplan vs. a companion åtgärdsplan, ...). */
  documentTitle: string | null;
  documentDescription: string | null;
  adoptedAt: string | null;
  adoptedAtText: string | null;
  coveragePeriodStart: number | null;
  coveragePeriodEnd: number | null;
  coveragePeriodText: string | null;
  /** The full source document docling parsed — the same text every
   * commitment is verified/highlighted against. Null on a plan from before
   * this was persisted, or one whose markdown hasn't been fetched yet. */
  markdown: string | null;
  /** Debug view only — `markdown` with "[SYSTEM NOTE: ...]" markers
   * inserted wherever a heading is immediately preceded by a bare-number
   * decorative image (see annotateNumberedGoalHeadings in
   * commitmentText.ts). Computed fresh on every fetch, never stored —
   * shows exactly what chunking/extraction actually sees, but is never
   * itself used for verification. */
  annotatedMarkdown: string | null;
  commitments: Commitment[];
  documentReferences: DocumentReference[];
  extractedMeasures: ExtractedMeasure[];
  reviews?: PipelineReview[];
  recoveredImages: RecoveredImage[];
}

export interface ApprovedPlan {
  id: string;
  url: string;
  municipalityId: string;
  municipalityName: string;
  status: string;
}

/** Confirms (or corrects, via municipalityName) extractMunicipality's
 * guess — upserts a real Municipality row by that name (reusing one that
 * already exists for it) and links this plan to it. This is what lets
 * two plans for the same municipality (a klimatplan and a companion
 * document, run separately) end up sharing one real Municipality
 * relation rather than just matching on a loose name string. */
export async function approvePlan(
  planId: string,
  municipalityName?: string,
): Promise<ApprovedPlan> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/plans/${planId}/approve`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(municipalityName ? { municipalityName } : {}),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ApprovedPlan;
}

export function useClimatePlanDetail(planId: string | null) {
  const [detail, setDetail] = useState<ClimatePlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!planId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${getClimatePlansPipelineApiUrl()}/plans/${planId}`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setDetail((await res.json()) as ClimatePlanDetail);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    setDetail(null);
    fetchDetail();
  }, [fetchDetail]);

  return { detail, isLoading, error, refresh: fetchDetail };
}
