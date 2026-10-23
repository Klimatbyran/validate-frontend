import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Loader2,
  Check,
  ChevronsDown,
  ChevronsUp,
  Code,
  Copy,
  FileCheck,
  FileText,
  FileWarning,
  Image,
  ChevronLeft,
  ChevronRight,
  Play,
  Plus,
  RotateCw,
  SearchCheck,
  Tags,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/ui/modal";
import { CollapsibleSection } from "@/ui/collapsible-section";
import { MarkdownVectorPagesDisplay } from "@/ui/markdown-display";
import { PdfHighlightViewer, PdfHighlightPanel } from "./PdfHighlightViewer";
import { ResizableSplitView } from "./ResizableSplitView";
import { RecoveredImagesGallery } from "./RecoveredImagesGallery";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  getClimatePlansPipelineApiUrl,
  getClimatePlansPipelineWebhookUrl,
  CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
} from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import { createJobsFromUrls } from "@/tabs/upload/lib/upload-api";
import { StatusPill } from "@/components/StatusPill";
import {
  toSwimlaneStatus,
  type ClimatePipelinePlan,
  type PipelineStepRun,
} from "../hooks/useClimatePipelinePlans";
import {
  useClimatePlanDetail,
  approvePlan,
  type ActivityShift,
  type Commitment,
  type RecoveredTransitionElement,
  type TransitionElementCandidate,
  type TransitionElementMatch,
  type DocumentReference,
  type DocumentReferenceRelationship,
  type ExtractedMeasure,
  type ClimatePlanDetail,
} from "../hooks/useClimatePlanDetail";
import {
  indexReviewsByEntity,
  reviewKey,
  type PipelineReview,
} from "../hooks/usePipelineReviews";
import { ReviewControls } from "./ReviewControls";
import { StepReviewMode } from "./StepReviewMode";
import { QaReviewToolbar } from "./QaReviewToolbar";
import {
  COMMITMENT_THEME_OPTIONS,
  actionableFilterSuggestEditor,
  climateFilterSuggestEditor,
  extractCommitmentSuggestEditor,
  isTeMatchAddSuggestion,
  similarGroupSuggestEditor,
  teMatchAddEditor,
  teMatchSelectEditor,
  themeSuggestEditor,
} from "./structuredSuggestEditors";
import {
  activityShiftEntityKey,
  commitmentEntityId,
  measureEntityId,
} from "../lib/stepReviewEntities";
import {
  buildStepReviewItems,
  commitmentsForStep,
  countByQaStatus,
  filterByQaStatus,
  filterCommitmentsByQaStatus,
  filterMeasuresByQaStatus,
  filterTeMatchesForListView,
  getReviewableItemCount,
  getStepReviewPrompt,
  stepSupportsReviewMode,
  type QaStatusFilter,
  type StepViewMode,
} from "../lib/stepReviewQueue";
import {
  aiReviewHeadline,
  aiReviewPillLabel,
  legacyExportTag,
  matchMechanismLine,
  matchOutcomeLabel,
  reviewerChosenStableId,
  shiftTypesAgree,
  tefCategoryOf,
} from "../lib/tef-match-display";
import { StepReviewItemCard } from "./StepReviewItemCard";

/** Count of items shown in each step's dialog — same filters the dialog
 * content itself applies, so the title badge always matches what's below. */
function getStepItemCount(
  step: string,
  detail: ClimatePlanDetail,
): number | null {
  const reviewable = getReviewableItemCount(step, detail);
  if (reviewable !== null) return reviewable;
  switch (step) {
    case "documentReferences":
      return detail.documentReferences.length;
    case "classifyActivityShiftTypes":
      return detail.extractedMeasures.reduce(
        (n, m) => n + (m.score?.activityShifts.length ?? 0),
        0,
      );
    default:
      return null;
  }
}

type ReviewLookup = Map<string, PipelineReview>;

interface ReviewContext {
  planId: string;
  step: string;
  reviewsByEntity: ReviewLookup;
  onReviewChanged: (review: PipelineReview | null, key: string) => void;
}

/** A commitment's own text, split into independently-searchable parts when
 * it was merged from several source sentences (see Commitment.extractionParts)
 * — a merge doesn't always sit contiguously in the source, so searching for
 * the whole merged text as one string would miss every part after the
 * first. Falls back to [commitment.text] when there are no parts. */
function commitmentParts(commitment: Commitment): string[] {
  return commitment.extractionParts && commitment.extractionParts.length > 0
    ? commitment.extractionParts.map((p) => p.text)
    : [commitment.text];
}

function documentReferenceTone(
  relationship: DocumentReferenceRelationship,
): MetaChipTone {
  switch (relationship) {
    case "companion":
      return "type";
    case "initiative":
      return "relevance";
    default:
      return "score";
  }
}

function QaFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 pt-2 border-t border-gray-03/60 min-w-0">
      {children}
    </div>
  );
}

type MetaChipTone = "neutral" | "score" | "type" | "relevance";

function metaChipToneClass(tone: MetaChipTone): string {
  switch (tone) {
    case "score":
      return "border-blue-03/40 bg-blue-03/15 text-blue-03";
    case "type":
      return "border-orange-03/40 bg-orange-03/15 text-orange-03";
    case "relevance":
      return "border-green-03/40 bg-green-03/15 text-green-03";
    default:
      return "border-gray-03 bg-gray-03/40 text-gray-01";
  }
}

function MetaChip({
  label,
  children,
  tone = "neutral",
  large = false,
}: {
  label: string;
  children: React.ReactNode;
  tone?: MetaChipTone;
  large?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${large ? "px-2.5 py-1.5 text-sm" : "px-2 py-1 text-xs"} ${metaChipToneClass(tone)}`}
    >
      <span
        className={`uppercase tracking-wide opacity-80 ${large ? "text-xs" : "text-[10px]"}`}
      >
        {label}
      </span>
      <span className="font-semibold tabular-nums">{children}</span>
    </span>
  );
}

/** Visual weight for 1–7 scores: all stay readable; higher = stronger fill/type. */
function scoreStrengthClass(score: number | null | undefined): string {
  const level = Math.min(7, Math.max(1, Math.round(score ?? 1)));
  switch (level) {
    case 1:
      return "border-blue-03/25 bg-blue-03/8 text-blue-03/65 font-medium";
    case 2:
      return "border-blue-03/30 bg-blue-03/12 text-blue-03/75 font-medium";
    case 3:
      return "border-blue-03/40 bg-blue-03/18 text-blue-03/85 font-semibold";
    case 4:
      return "border-blue-03/50 bg-blue-03/25 text-blue-03 font-semibold";
    case 5:
      return "border-blue-03/60 bg-blue-03/35 text-blue-03 font-bold";
    case 6:
      return "border-blue-03/80 bg-blue-03/45 text-blue-03 font-bold";
    default:
      return "border-blue-03 bg-blue-03/55 text-blue-03 font-bold ring-1 ring-blue-03/50";
  }
}

function ScoreChip({
  label,
  score,
  large = false,
}: {
  label: string;
  score: number | null | undefined;
  large?: boolean;
}) {
  const display = score ?? "—";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border tabular-nums ${large ? "px-2.5 py-1.5 text-sm" : "px-2 py-1 text-xs"} ${scoreStrengthClass(score)}`}
      title={`${label}: ${display} (1 weak → 7 strong)`}
    >
      <span
        className={`uppercase tracking-wide opacity-80 ${large ? "text-xs" : "text-[10px]"}`}
      >
        {label}
      </span>
      <span>{display}</span>
    </span>
  );
}

function teConfidenceChipClass(
  confidence: "high" | "mid" | "low",
  score: number,
): string {
  // Blend confidence with similarity score (typically ~0–1) for fill strength.
  const strength = Math.min(
    7,
    Math.max(
      1,
      Math.round(
        (confidence === "high" ? 5 : confidence === "mid" ? 3 : 1) + score * 2,
      ),
    ),
  );
  const base =
    confidence === "high"
      ? "border-green-03 text-green-03"
      : confidence === "mid"
        ? "border-blue-03 text-blue-03"
        : "border-gray-02 text-gray-02";
  const fill =
    strength >= 6
      ? confidence === "high"
        ? "bg-green-03/45 font-bold"
        : confidence === "mid"
          ? "bg-blue-03/45 font-bold"
          : "bg-gray-03/60 font-semibold"
      : strength >= 4
        ? confidence === "high"
          ? "bg-green-03/30 font-semibold"
          : confidence === "mid"
            ? "bg-blue-03/30 font-semibold"
            : "bg-gray-03/40 font-medium"
        : confidence === "high"
          ? "bg-green-03/15 font-medium"
          : confidence === "mid"
            ? "bg-blue-03/15 font-medium"
            : "bg-gray-03/25 font-medium";
  return `${base} ${fill}`;
}

/** Whether the measure's own text directly names this match (explicit) vs.
 * only a reasonable inference (implied) — an LLM judgment from tePicker's
 * judge() call, not word-overlap. Undefined on matches made before this
 * field existed. */
function ExplicitBadge({ explicit }: { explicit: boolean | undefined }) {
  if (explicit === undefined) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs uppercase tracking-wide",
        explicit
          ? "border-green-03/40 bg-green-03/10 text-green-03"
          : "border-gray-03 bg-gray-03/50 text-gray-01 font-semibold",
      )}
      title={
        explicit
          ? "The measure's own text directly names this match"
          : "Only a reasonable inference — not directly named by the measure's text"
      }
    >
      {explicit ? "explicit" : "implied"}
    </span>
  );
}

function outcomeTone(kind: string | null | undefined): MetaChipTone {
  if (kind === "specific" || kind === "multiple_specific") return "relevance";
  if (kind === "ambiguous") return "score";
  if (kind === "too_narrow" || kind === "none") return "type";
  return "neutral";
}

function TefCategoryPill({
  category,
  shiftType,
}: {
  category: string | null;
  shiftType: string;
}) {
  if (!category) return null;
  const agrees = shiftTypesAgree(shiftType, category);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm",
        agrees
          ? "border-green-03/40 bg-green-03/10 text-green-03"
          : "border-orange-03/40 bg-orange-03/10 text-orange-03",
      )}
      title={
        agrees
          ? "TEF's category matches our classification of this shift"
          : "TEF's category differs from our classification of this shift"
      }
    >
      <span className="uppercase tracking-wide text-xs opacity-80">TEF</span>
      <span className="font-semibold">{category}</span>
    </span>
  );
}

function ConfidenceScore({
  confidence,
  score,
}: {
  confidence: "high" | "mid" | "low" | undefined;
  score: number;
}) {
  const label = confidence
    ? `${confidence} · ${score.toFixed(4)}`
    : score.toFixed(4);
  const tone = confidence
    ? teConfidenceChipClass(confidence, score)
    : "border-gray-03 bg-gray-03/40 text-gray-01";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-sm tabular-nums ${tone}`}
    >
      {label}
    </span>
  );
}

function LegacyExportTag({ tag }: { tag: string | null }) {
  if (!tag) return null;
  return (
    <span
      className="text-xs text-gray-02/60"
      title="Older TEF shift/improve tag — not a reliable category"
    >
      Legacy: {tag}
    </span>
  );
}

type TeMatchView =
  | TransitionElementMatch
  | RecoveredTransitionElement
  | TransitionElementCandidate;

type MatchSource = "primary" | "judge" | "retrieval" | "shadow";

function SourcePill({ kind }: { kind: MatchSource }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-wide",
        sourcePillClass(kind),
      )}
      title={sourcePillTitle(kind)}
    >
      {sourcePillLabel(kind)}
    </span>
  );
}

function sourcePillLabel(source: MatchSource): string {
  if (source === "primary") return "Primary";
  if (source === "judge") return "Judge error";
  if (source === "retrieval") return "Taxonomy miss";
  return "Shadow TEF · reviewer";
}

function sourcePillClass(source: MatchSource): string {
  if (source === "judge")
    return "border-orange-03/50 bg-orange-03/15 text-orange-03";
  if (source === "retrieval")
    return "border-blue-03/50 bg-blue-03/15 text-blue-03";
  if (source === "shadow")
    return "border-purple-03/40 bg-purple-03/10 text-purple-03";
  return "border-gray-03 bg-gray-03/50 text-gray-01";
}

function sourcePillTitle(source: MatchSource): string {
  if (source === "judge") {
    return "The AI reviewer says the first matcher should have accepted this candidate.";
  }
  if (source === "retrieval") {
    return "The AI reviewer found this existing TEF after the first search missed it.";
  }
  if (source === "shadow") {
    return "The AI reviewer added this shadow element during review.";
  }
  return "Accepted by the first matcher. The reviewer did not add this one.";
}

function ReviewVerdictPill({ category }: { category: string }) {
  const label = aiReviewPillLabel(category);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1.5 text-sm font-semibold",
        reviewVerdictClass(category),
      )}
    >
      {label}
    </span>
  );
}

function reviewVerdictClass(category: string): string {
  if (category === "JUDGE_ERROR")
    return "border-orange-03/50 bg-orange-03/15 text-orange-03";
  if (category === "RETRIEVAL_MISS")
    return "border-blue-03/50 bg-blue-03/15 text-blue-03";
  if (category === "TAXONOMY_GAP")
    return "border-purple-03/40 bg-purple-03/10 text-purple-03";
  if (category === "ENABLING_NOT_SHIFT")
    return "border-teal-03/50 bg-teal-03/15 text-teal-03";
  return "border-gray-03 bg-gray-03/50 text-gray-01";
}

function TeMatchBody({
  match,
  shiftType,
  matchSource = null,
}: {
  match: TeMatchView;
  shiftType: string;
  matchSource?: MatchSource | null;
}) {
  const mechanism = matchMechanismLine(match);
  return (
    <div className="space-y-1.5 min-w-0">
      <TeMatchTitle stableId={match.stableId} shortLabel={match.shortLabel} />
      <div className="flex flex-wrap items-center gap-1.5">
        {matchSource && <SourcePill kind={matchSource} />}
        {"explicit" in match && <ExplicitBadge explicit={match.explicit} />}
        <ConfidenceScore
          confidence={
            "matchConfidence" in match ? match.matchConfidence : undefined
          }
          score={match.score}
        />
        <TefCategoryPill
          category={tefCategoryOf(match)}
          shiftType={shiftType}
        />
        <LegacyExportTag tag={legacyExportTag(match)} />
      </div>
      {match.sectorPath && (
        <p className="text-sm text-gray-02 break-words">{match.sectorPath}</p>
      )}
      {mechanism && (
        <p className="text-sm text-gray-01/80 break-words">{mechanism}</p>
      )}
    </div>
  );
}

function TeMatchTitle({
  stableId,
  shortLabel,
}: {
  stableId: string;
  shortLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-mono text-sm text-gray-02">{stableId}</span>
      <span className="text-base font-medium text-gray-01 break-words">
        {shortLabel}
      </span>
    </div>
  );
}

function ShiftMetaRow({
  shift,
  showMatches,
}: {
  shift: ActivityShift;
  showMatches: boolean;
}) {
  const outcome = showMatches
    ? matchOutcomeLabel(
        shift.transitionElementGroupKind,
        shift.transitionElementGateDomain,
        shift.transitionElementGroupLabel,
      )
    : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MetaChip label="Ours" tone="type" large>
        {shift.type}
      </MetaChip>
      <ScoreChip label="Score" score={shift.score} large />
      {outcome && (
        <MetaChip
          label="Outcome"
          tone={outcomeTone(shift.transitionElementGroupKind)}
          large
        >
          {outcome}
        </MetaChip>
      )}
      {showMatches && shift.aiReviewCategory && (
        <ReviewVerdictPill category={shift.aiReviewCategory} />
      )}
    </div>
  );
}

function ShiftContextLine({
  shift,
  showDomain,
}: {
  shift: ActivityShift;
  showDomain: boolean;
}) {
  const domain = shift.transitionElementGateDomain;
  return (
    <p className="text-sm text-gray-02 break-words">
      Activity: {shift.activity} · Need: {shift.need}
      {showDomain && domain ? ` · Domain: ${domain}` : ""}
    </p>
  );
}

function MatchOutcomeNotes({
  groupKind,
  groupLabel,
}: {
  groupKind: string | null | undefined;
  groupLabel: string | null | undefined;
}) {
  if (groupKind === "too_narrow" && groupLabel) {
    return (
      <p className="text-sm text-orange-03 bg-orange-03/10 border border-orange-03/20 rounded-md px-2.5 py-2">
        Match is narrower than the shift's own wording — a broader TE (&ldquo;
        {groupLabel}&rdquo;) may fit better.
      </p>
    );
  }
  if (groupKind === "ambiguous" && groupLabel) {
    return (
      <p className="text-sm text-blue-03 bg-blue-03/10 border border-blue-03/20 rounded-md px-2.5 py-2">
        Several candidates cluster under &ldquo;{groupLabel}&rdquo; — the
        shift's own wording doesn't commit to one of them.
      </p>
    );
  }
  if (groupKind === "multiple_specific") {
    return (
      <p className="text-sm text-gray-02 bg-gray-03/20 border border-gray-03/30 rounded-md px-2.5 py-2">
        This shift names several distinct destinations — each match below is
        independently valid, not competing alternatives.
      </p>
    );
  }
  return null;
}

function ProposedElementCard({
  suggested,
  hasExistingMatch,
}: {
  suggested: { shortLabel: string; description: string };
  hasExistingMatch: boolean;
}) {
  return (
    <div className="rounded-md border border-gray-03/50 p-2 space-y-1">
      <p className="text-xs uppercase tracking-wide text-gray-02 font-medium">
        {hasExistingMatch
          ? "Broader element proposed"
          : "No existing match — new element proposed"}
      </p>
      <p className="text-base text-gray-01 break-words">
        <span className="font-medium">{suggested.shortLabel}</span>
        {suggested.description ? ` — ${suggested.description}` : ""}
      </p>
    </div>
  );
}

function opinionFrameClass(category: string | null | undefined): string {
  if (category === "JUDGE_ERROR") return "border-orange-03/25";
  if (category === "RETRIEVAL_MISS") return "border-blue-03/25";
  if (category === "TAXONOMY_GAP") return "border-purple-03/25";
  if (category === "ENABLING_NOT_SHIFT") return "border-teal-03/25";
  return "border-gray-03/50";
}

function OpinionLabel() {
  return (
    <span className="inline-flex items-center rounded-md border border-gray-02/50 bg-gray-04 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-01">
      AI second opinion
    </span>
  );
}

function AiSecondOpinion({
  category,
  explanation,
}: {
  category: string | null | undefined;
  explanation: string | null | undefined;
}) {
  const headline = aiReviewHeadline(category);
  if (!headline && !explanation) return null;
  return (
    <div
      className={cn(
        "rounded-md border p-2.5 space-y-2",
        opinionFrameClass(category),
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <OpinionLabel />
        {category && <ReviewVerdictPill category={category} />}
      </div>
      <OpinionBody explanation={explanation} headline={headline} />
    </div>
  );
}

function OpinionBody({
  explanation,
  headline,
}: {
  explanation: string | null | undefined;
  headline: string | null;
}) {
  if (explanation) {
    return <p className="text-sm text-gray-02 break-words">{explanation}</p>;
  }
  return <p className="text-sm text-gray-02">{headline}</p>;
}

function recoveredMatchToShow(
  shift: ActivityShift,
): RecoveredTransitionElement | null {
  const recovered = shift.aiRecoveredMatch;
  if (!recovered?.stableId) return null;
  const alreadyListed = shift.transitionElementMatches.some(
    (match) => match.stableId === recovered.stableId,
  );
  return alreadyListed ? null : recovered;
}

function TeMatchAddSlots({
  shiftId,
  matchedIds,
  allCandidates,
  suggestedNew,
  reviewCtx,
  onRequestAddSlot,
  pendingSlotIds,
}: {
  shiftId: string;
  matchedIds: Set<string>;
  allCandidates: Array<{ stableId: string; shortLabel: string; score: number }>;
  suggestedNew: { shortLabel: string; description: string } | null;
  reviewCtx: ReviewContext;
  onRequestAddSlot: () => void;
  pendingSlotIds: string[];
}) {
  const existingEntityIds: string[] = [];
  for (const review of reviewCtx.reviewsByEntity.values()) {
    if (review.step !== reviewCtx.step || review.entityType !== "teMatchAdd") {
      continue;
    }
    const isLegacy = review.entityId === shiftId;
    const isSlot = review.entityId.startsWith(`${shiftId}:add:`);
    if (isLegacy || isSlot) existingEntityIds.push(review.entityId);
  }

  const pendingEntityIds = pendingSlotIds
    .map((slotId) => `${shiftId}:add:${slotId}`)
    .filter((entityId) => !existingEntityIds.includes(entityId));

  const addEntityIds = [...existingEntityIds, ...pendingEntityIds];

  const claimedStableIds = new Set<string>();
  for (const entityId of addEntityIds) {
    const key = reviewKey(reviewCtx.step, "teMatchAdd", entityId);
    const review = reviewCtx.reviewsByEntity.get(key);
    if (
      isTeMatchAddSuggestion(review?.suggestedValue) &&
      review.suggestedValue.selectedStableId
    ) {
      claimedStableIds.add(review.suggestedValue.selectedStableId);
    }
  }

  if (addEntityIds.length === 0) return null;

  return (
    <div className="space-y-2">
      {addEntityIds.map((entityId) => {
        const entityKey = reviewKey(reviewCtx.step, "teMatchAdd", entityId);
        const review = reviewCtx.reviewsByEntity.get(entityKey);
        const selectedInThis =
          isTeMatchAddSuggestion(review?.suggestedValue) &&
          review.suggestedValue.selectedStableId
            ? review.suggestedValue.selectedStableId
            : null;
        const addableCandidates = allCandidates.filter(
          (c) =>
            !matchedIds.has(c.stableId) &&
            (!claimedStableIds.has(c.stableId) ||
              c.stableId === selectedInThis),
        );
        const canUseSuggestedNew =
          Boolean(suggestedNew) &&
          !addEntityIds.some((otherId) => {
            if (otherId === entityId) return false;
            const other = reviewCtx.reviewsByEntity.get(
              reviewKey(reviewCtx.step, "teMatchAdd", otherId),
            );
            return (
              isTeMatchAddSuggestion(other?.suggestedValue) &&
              other.suggestedValue.isSuggestedNew
            );
          });

        return (
          <div
            key={entityId}
            className="rounded-md border border-dashed border-blue-03/40 bg-blue-03/5 p-2 space-y-2 min-w-0"
          >
            <p className="text-xs font-medium text-blue-03">
              Suggested add
              {isTeMatchAddSuggestion(review?.suggestedValue) &&
              review.suggestedValue.selectedShortLabel
                ? `: ${review.suggestedValue.selectedShortLabel}`
                : ""}
            </p>
            <QaFooter>
              <ReviewControls
                planId={reviewCtx.planId}
                step={reviewCtx.step}
                entityType="teMatchAdd"
                entityId={entityId}
                reviewedSnapshot={{
                  activityShiftId: shiftId,
                  currentMatchIds: [...matchedIds],
                  addableCandidates,
                  suggestedNew: canUseSuggestedNew ? suggestedNew : null,
                }}
                review={review}
                initialPanel={review ? null : "suggest"}
                defaultSuggestedValue={
                  addableCandidates[0]
                    ? {
                        action: "add" as const,
                        selectedStableId: addableCandidates[0].stableId,
                        selectedShortLabel: addableCandidates[0].shortLabel,
                      }
                    : canUseSuggestedNew && suggestedNew
                      ? {
                          action: "add" as const,
                          selectedStableId: null,
                          selectedShortLabel: suggestedNew.shortLabel,
                          selectedDescription: suggestedNew.description,
                          isSuggestedNew: true,
                        }
                      : {
                          action: "add" as const,
                          selectedStableId: null,
                          selectedShortLabel: "",
                        }
                }
                suggestEditor={teMatchAddEditor({
                  candidates: addableCandidates,
                  suggestedNew: canUseSuggestedNew ? suggestedNew : null,
                })}
                showOk={false}
                onAdd={onRequestAddSlot}
                addTitle="Add another TE match"
                addDisabled={
                  addableCandidates.filter((c) => c.stableId !== selectedInThis)
                    .length === 0 && !canUseSuggestedNew
                }
                onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
              />
            </QaFooter>
          </div>
        );
      })}
    </div>
  );
}

function ListedTeMatch({
  match,
  shiftKey,
  shiftType,
  matchSource,
  allCandidates,
  canAddMore,
  requestAddSlot,
  reviewCtx,
}: {
  match: TransitionElementMatch;
  shiftKey: string;
  shiftType: string;
  matchSource: MatchSource | null;
  allCandidates: Array<{ stableId: string; shortLabel: string; score: number }>;
  canAddMore: boolean;
  requestAddSlot: () => void;
  reviewCtx: ReviewContext;
}) {
  const entityId = `${shiftKey}:${match.stableId}`;
  const entityKey = reviewKey(reviewCtx.step, "teMatch", entityId);
  return (
    <div className="rounded-md border border-gray-03/50 bg-gray-05/40 p-2 space-y-2 min-w-0">
      <TeMatchBody
        match={match}
        shiftType={shiftType}
        matchSource={matchSource}
      />
      <QaFooter>
        <ReviewControls
          planId={reviewCtx.planId}
          step={reviewCtx.step}
          entityType="teMatch"
          entityId={entityId}
          reviewedSnapshot={{
            activityShiftId: shiftKey,
            match,
            candidates: allCandidates,
          }}
          review={reviewCtx.reviewsByEntity.get(entityKey)}
          defaultSuggestedValue={{
            selectedStableId: match.stableId,
            selectedShortLabel: match.shortLabel,
          }}
          suggestEditor={teMatchSelectEditor({
            current: {
              stableId: match.stableId,
              shortLabel: match.shortLabel,
              score: match.score,
            },
            candidates: allCandidates,
          })}
          onAdd={canAddMore ? requestAddSlot : undefined}
          addTitle="Add another TE match"
          addDisabled={!canAddMore}
          onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
        />
      </QaFooter>
    </div>
  );
}

function AddMatchButton({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-blue-03/40 bg-blue-03/5 p-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-02 mr-1">
          QA
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-gray-02 hover:text-blue-03"
          title="Add a TE match"
          onClick={onAdd}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs text-blue-03">Add a TE match</span>
      </div>
    </div>
  );
}

function EmptyMatchPrompt({
  hasProposal,
  hasOtherDisplay,
  canAddMore,
  onAdd,
}: {
  hasProposal: boolean;
  hasOtherDisplay: boolean;
  canAddMore: boolean;
  onAdd: () => void;
}) {
  if ((hasProposal || hasOtherDisplay) && !canAddMore) return null;
  return (
    <div className="space-y-2">
      {!hasProposal && !hasOtherDisplay && (
        <p className="text-sm text-gray-02 italic">No matches</p>
      )}
      {canAddMore && <AddMatchButton onAdd={onAdd} />}
    </div>
  );
}

function RecoveredMatchCard({
  match,
  shiftType,
}: {
  match: RecoveredTransitionElement;
  shiftType: string;
}) {
  return (
    <div className="rounded-md border border-blue-03/40 bg-blue-03/5 p-2">
      <TeMatchBody
        match={match}
        shiftType={shiftType}
        matchSource="retrieval"
      />
    </div>
  );
}

function JudgePickCard({
  match,
  shiftType,
}: {
  match: TransitionElementCandidate;
  shiftType: string;
}) {
  return (
    <div className="rounded-md border border-orange-03/40 bg-orange-03/5 p-2">
      <TeMatchBody match={match} shiftType={shiftType} matchSource="judge" />
    </div>
  );
}

function shadowShortLabel(shift: ActivityShift): string | undefined {
  return (
    shift.shadowElement?.shortLabel ??
    shift.transitionElementSuggestedNew?.shortLabel
  );
}

function shadowDescription(shift: ActivityShift): string | undefined {
  return (
    shift.shadowElement?.description ??
    shift.transitionElementSuggestedNew?.description
  );
}

function ShadowElementName({ label }: { label: string }) {
  return (
    <p className="text-base font-medium text-gray-01 break-words">{label}</p>
  );
}

function ShadowMatchCard({ shift }: { shift: ActivityShift }) {
  const label = shadowShortLabel(shift);
  const description = shadowDescription(shift);
  // A rejected shadow is wrong -- the connection is deliberately kept (see
  // the API's PATCH .../status handler) so this shift doesn't get lost,
  // but it must never look like an ordinary trustworthy match. Greyed out
  // and explicitly flagged instead of styled like a normal shadow match.
  const isRejected = shift.shadowElement?.status === "rejected";
  return (
    <div
      className={cn(
        "rounded-md border p-2 space-y-1.5",
        isRejected
          ? "border-gray-03 bg-gray-03/10 opacity-70"
          : "border-purple-03/30 bg-purple-03/5",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <SourcePill kind="shadow" />
        <TefCategoryPill
          category={shift.shadowElement?.activityShiftCategory ?? null}
          shiftType={shift.type}
        />
        {isRejected && (
          <span className="inline-flex items-center rounded-md border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-red-400">
            Rejected -- needs manual reattachment
          </span>
        )}
      </div>
      {label && (
        <ShadowElementName label={isRejected ? `${label} (rejected)` : label} />
      )}
      {description && (
        <p className="text-sm text-gray-02 break-words">{description}</p>
      )}
    </div>
  );
}

function ActivityShiftTeBlock({
  shift,
  reviewCtx,
  showMatches = true,
  /** When set, only these matches are rendered; add-slot logic still uses
   * every id in `shift.transitionElementMatches` (plus optional extras). */
  visibleMatches,
  /** Extra known match ids when `shift.transitionElementMatches` was
   * narrowed for display — prefer leaving the full array on `shift`. */
  knownMatchedIds,
  hideAddSlots = false,
}: {
  shift: ActivityShift;
  reviewCtx: ReviewContext;
  // classifyActivityShiftTypes only sets type/typeReasoning -- the TE
  // matches, candidates, and gate/group metadata on this same row all come
  // from the LATER matchTransitionElements step, possibly from an older
  // run. Showing them under classifyActivityShiftTypes's own dialog would
  // make it look like this step did the matching itself.
  showMatches?: boolean;
  visibleMatches?: TransitionElementMatch[];
  knownMatchedIds?: Iterable<string>;
  hideAddSlots?: boolean;
}) {
  const [pendingAddSlotIds, setPendingAddSlotIds] = useState<string[]>([]);

  const shiftKey = activityShiftEntityKey(shift);
  const matchedIds = new Set<string>([
    ...shift.transitionElementMatches.map((match) => match.stableId),
    ...(knownMatchedIds ?? []),
  ]);
  const matchesToShow = visibleMatches ?? shift.transitionElementMatches;
  const focusingSingleMatch =
    visibleMatches !== undefined && visibleMatches.length === 1;
  const allCandidates = (shift.transitionElementCandidates ?? []).map((c) => ({
    stableId: c.stableId,
    shortLabel: c.shortLabel,
    score: c.score,
  }));
  const suggestedNew = shift.transitionElementSuggestedNew ?? null;

  const claimedByAdds = new Set<string>();
  let hasSuggestedNewClaim = false;
  for (const review of reviewCtx.reviewsByEntity.values()) {
    if (review.step !== reviewCtx.step || review.entityType !== "teMatchAdd") {
      continue;
    }
    if (
      review.entityId !== shiftKey &&
      !review.entityId.startsWith(`${shiftKey}:add:`)
    ) {
      continue;
    }
    if (!isTeMatchAddSuggestion(review.suggestedValue)) continue;
    if (review.suggestedValue.selectedStableId) {
      claimedByAdds.add(review.suggestedValue.selectedStableId);
    }
    if (review.suggestedValue.isSuggestedNew) hasSuggestedNewClaim = true;
  }

  const remainingAddable = allCandidates.filter(
    (c) => !matchedIds.has(c.stableId) && !claimedByAdds.has(c.stableId),
  );
  const canAddMore =
    remainingAddable.length > 0 ||
    (Boolean(suggestedNew) && !hasSuggestedNewClaim);

  const requestAddSlot = () => {
    if (!canAddMore) return;
    setPendingAddSlotIds((ids) => [...ids, crypto.randomUUID()]);
  };

  const groupKind = shift.transitionElementGroupKind;
  const groupLabel = shift.transitionElementGroupLabel;
  const hasMatches = shift.transitionElementMatches.length > 0;
  const recovered = showMatches ? recoveredMatchToShow(shift) : null;
  const reviewerPickId = reviewerPickIdFor(shift);
  const promotedCandidate = showMatches
    ? promotedJudgeCandidate(shift, reviewerPickId, matchedIds)
    : null;
  const hasShadow = showMatches && Boolean(shift.shadowElementId);
  // recovered/promotedCandidate/hasShadow are review-step cards with no add
  // action of their own -- they're exactly what's shown when the primary
  // pass found nothing (hasMatches=false), so gating the add button on
  // "any card is displayed" hid it on precisely the shifts that most need a
  // manual correction. The add button only needs to know whether the
  // PRIMARY match list (which has its own per-row add affordance) is empty.
  const hasOtherReviewCard =
    Boolean(recovered) || Boolean(promotedCandidate) || hasShadow;

  return (
    <div className="pl-3 border-l-2 border-gray-03 space-y-3 min-w-0">
      <ShiftStatement from={shift.shiftFrom} to={shift.shiftTo} />
      <ShiftMetaRow shift={shift} showMatches={showMatches} />
      {shift.typeReasoning && (
        <p className="text-sm text-gray-02/80 italic break-words">
          {shift.typeReasoning}
        </p>
      )}
      <ShiftContextLine shift={shift} showDomain={showMatches} />
      {showMatches && !focusingSingleMatch && (
        <MatchOutcomeNotes groupKind={groupKind} groupLabel={groupLabel} />
      )}
      {showMatches && matchesToShow.length > 0 && (
        <ListedMatches
          matches={matchesToShow}
          shift={shift}
          shiftKey={shiftKey}
          reviewerPickId={reviewerPickId}
          allCandidates={allCandidates}
          canAddMore={!hideAddSlots && canAddMore}
          requestAddSlot={requestAddSlot}
          reviewCtx={reviewCtx}
        />
      )}
      {!focusingSingleMatch && promotedCandidate && (
        <JudgePickCard match={promotedCandidate} shiftType={shift.type} />
      )}
      {!focusingSingleMatch && recovered && (
        <RecoveredMatchCard match={recovered} shiftType={shift.type} />
      )}
      {!focusingSingleMatch && hasShadow && <ShadowMatchCard shift={shift} />}
      {showMatches && !hideAddSlots && matchesToShow.length === 0 && (
        <EmptyMatchPrompt
          hasProposal={Boolean(suggestedNew)}
          hasOtherDisplay={hasOtherReviewCard}
          canAddMore={canAddMore}
          onAdd={requestAddSlot}
        />
      )}
      {showMatches && !focusingSingleMatch && suggestedNew && !hasShadow && (
        <ProposedElementCard
          suggested={suggestedNew}
          hasExistingMatch={hasMatches}
        />
      )}
      {showMatches && !focusingSingleMatch && (
        <AiSecondOpinion
          category={shift.aiReviewCategory}
          explanation={shift.aiReviewExplanation}
        />
      )}
      {showMatches && !hideAddSlots && (
        <TeMatchAddSlots
          shiftId={shiftKey}
          matchedIds={matchedIds}
          allCandidates={allCandidates}
          suggestedNew={suggestedNew}
          reviewCtx={reviewCtx}
          onRequestAddSlot={requestAddSlot}
          pendingSlotIds={pendingAddSlotIds}
        />
      )}
    </div>
  );
}

function ListedMatches({
  shift,
  matches,
  shiftKey,
  reviewerPickId,
  allCandidates,
  canAddMore,
  requestAddSlot,
  reviewCtx,
}: {
  shift: ActivityShift;
  matches: TransitionElementMatch[];
  shiftKey: string;
  reviewerPickId: string | null;
  allCandidates: Array<{ stableId: string; shortLabel: string; score: number }>;
  canAddMore: boolean;
  requestAddSlot: () => void;
  reviewCtx: ReviewContext;
}) {
  const labelSources = Boolean(shift.aiReviewCategory);
  return (
    <div className="space-y-2">
      {matches.map((match) => (
        <ListedTeMatch
          key={match.stableId}
          match={match}
          shiftKey={shiftKey}
          shiftType={shift.type}
          matchSource={listedMatchSource(
            labelSources,
            reviewerPickId,
            match.stableId,
          )}
          allCandidates={allCandidates}
          canAddMore={canAddMore}
          requestAddSlot={requestAddSlot}
          reviewCtx={reviewCtx}
        />
      ))}
    </div>
  );
}

function listedMatchSource(
  labelSources: boolean,
  reviewerPickId: string | null,
  stableId: string,
): MatchSource | null {
  if (!labelSources) return null;
  if (reviewerPickId === stableId) return "judge";
  return "primary";
}

function reviewerPickIdFor(shift: ActivityShift): string | null {
  if (shift.aiReviewCategory !== "JUDGE_ERROR") return null;
  const candidateIds = (shift.transitionElementCandidates ?? []).map(
    (candidate) => candidate.stableId,
  );
  return reviewerChosenStableId(shift.aiReviewExplanation, candidateIds);
}

function promotedJudgeCandidate(
  shift: ActivityShift,
  reviewerPickId: string | null,
  matchedIds: Set<string>,
): TransitionElementCandidate | null {
  if (!reviewerPickId || matchedIds.has(reviewerPickId)) return null;
  return (
    shift.transitionElementCandidates?.find(
      (candidate) => candidate.stableId === reviewerPickId,
    ) ?? null
  );
}

function CommitmentText({ text }: { text: string }) {
  return (
    <p className="text-lg font-semibold leading-snug text-gray-01 break-words">
      {text}
    </p>
  );
}

function ShiftStatement({ from, to }: { from: string; to: string }) {
  return (
    <p className="text-base font-medium text-gray-01 break-words">
      {from} → {to}
    </p>
  );
}

function TransitionElementsView({
  measures,
  reviewCtx,
  showMatches = true,
  visibleMatchIdsByShiftKey,
}: {
  measures: ExtractedMeasure[];
  reviewCtx: ReviewContext;
  showMatches?: boolean;
  /** When present, limits which matches render per shift (full match
   * arrays on each shift stay intact for add-slot logic). */
  visibleMatchIdsByShiftKey?: Map<string, Set<string>>;
}) {
  const withShifts = measures.filter(
    (m) => m.score && m.score.activityShifts.length > 0,
  );
  if (withShifts.length === 0) {
    return (
      <p className="text-sm text-gray-02">
        {showMatches
          ? "No activity shifts to match yet."
          : "No activity shifts to classify yet."}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {withShifts.map((m) => (
        <div
          key={m.id}
          className="rounded-lg border border-gray-03/70 bg-gray-04/50 p-4 space-y-4 min-w-0"
        >
          <CommitmentText text={m.measureText} />
          {m.score!.activityShifts.map((shift) => {
            const shiftKey = activityShiftEntityKey(shift);
            const visibleIds = visibleMatchIdsByShiftKey?.get(shiftKey);
            const visibleMatches =
              visibleIds === undefined
                ? undefined
                : shift.transitionElementMatches.filter((match) =>
                    visibleIds.has(match.stableId),
                  );
            return (
              <ActivityShiftTeBlock
                key={shift.id}
                shift={shift}
                reviewCtx={reviewCtx}
                showMatches={showMatches}
                visibleMatches={visibleMatches}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PreviousStepRuns({ runs }: { runs: PipelineStepRun[] }) {
  const [expanded, setExpanded] = useState(false);

  if (runs.length === 0) return null;

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded((v) => !v)}
        className="h-6 px-2 text-xs text-blue-03 hover:text-blue-04 hover:bg-blue-03/10"
      >
        {expanded ? (
          <>
            <ChevronsUp className="w-3 h-3 mr-1" /> Hide previous runs
          </>
        ) : (
          <>
            <ChevronsDown className="w-3 h-3 mr-1" /> {runs.length} previous{" "}
            {runs.length === 1 ? "run" : "runs"}
          </>
        )}
      </Button>
      {expanded && (
        <ul className="mt-2 space-y-1.5 border-l-2 border-gray-03 pl-3">
          {runs.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <StatusPill
                label={r.status}
                status={toSwimlaneStatus(r.status)}
                isActive={false}
              />
              <span className="text-gray-02">
                {new Date(r.startedAt).toLocaleString()}
                {r.completedAt &&
                  ` · finished ${new Date(r.completedAt).toLocaleString()}`}
              </span>
              {r.error && <span className="text-pink-03">{r.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RerunButton({
  planId,
  step,
  onRerun,
}: {
  planId: string;
  step: string;
  onRerun: () => void;
}) {
  const [loadingMode, setLoadingMode] = useState<"cascade" | "single" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (noCascade: boolean) => {
    setLoadingMode(noCascade ? "single" : "cascade");
    setError(null);
    try {
      const url = `${getClimatePlansPipelineApiUrl()}/plans/${planId}/rerun/${step}${
        noCascade ? "?noCascade=true" : ""
      }`;
      const res = await authenticatedFetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      onRerun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rerun");
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleClick(false)}
        disabled={loadingMode !== null}
        className="h-7 px-3 text-xs"
        title="Rerun this step and cascade through every step after it"
      >
        {loadingMode === "cascade" ? (
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        ) : (
          <RotateCw className="w-3 h-3 mr-1.5" />
        )}
        Rerun from here
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleClick(true)}
        disabled={loadingMode !== null}
        className="h-7 px-3 text-xs"
        title="Rerun only this step, without re-running anything downstream"
      >
        {loadingMode === "single" ? (
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        ) : (
          <RotateCw className="w-3 h-3 mr-1.5" />
        )}
        Rerun only this step
      </Button>
      {error && <span className="text-xs text-pink-03">{error}</span>}
    </div>
  );
}

interface StepResultDialogProps {
  plan: ClimatePipelinePlan | null;
  step: string | null;
  /** Set when opened from a previous-run pill — shows that specific run's
   * status/timestamps instead of defaulting to the latest. */
  runId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRerun?: () => void;
  /** Adjacent swimlane workers for outside-modal prev/next arrows. */
  adjacentSteps?: { prev: string | null; next: string | null };
  onNavigateStep?: (step: string) => void;
}

function YesNo({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-gray-02">—</span>;
  return (
    <span className={value ? "text-green-03" : "text-pink-03"}>
      {value ? "Yes" : "No"}
    </span>
  );
}

/** Compact groundedness flag — visible on every commitment step. */
function FoundInDocumentFlag({ unverified }: { unverified: boolean }) {
  const found = !unverified;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        found
          ? "border-green-03/40 bg-green-03/10 text-green-03"
          : "border-orange-03/40 bg-orange-03/10 text-orange-03",
      )}
      title={
        found
          ? "Found in document — quote grounded in plan markdown"
          : "Not found in document — may be invented or unfindable"
      }
    >
      {found ? (
        <FileCheck className="h-3 w-3" aria-hidden />
      ) : (
        <FileWarning className="h-3 w-3" aria-hidden />
      )}
      <span>{found ? "In markdown" : "Not in markdown"}</span>
    </span>
  );
}

/** Flags commitments sourced from a recovered image (OCR/AI description) —
 * these won't be findable via the PDF text layer's "Find in PDF" search. */
function ImageSourceFlag() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-03/40 bg-blue-03/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-03"
      title="Extracted from a recovered image (OCR/AI description), not the document's text layer — not searchable in the PDF"
    >
      <Image className="h-3 w-3" aria-hidden />
      <span>From image</span>
    </span>
  );
}

/** Shown after a PDF search couldn't re-locate a markdown-verified quote
 * in the pdf.js text layer — worth a manual look in the source PDF. */
function NotFoundInPdfFlag() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-pink-03/40 bg-pink-03/10 px-1.5 py-0.5 text-[10px] font-medium text-pink-03"
      title="Verified in plan markdown, but not found again in the PDF text layer — check manually if needed"
    >
      <FileWarning className="h-3 w-3" aria-hidden />
      <span>Not in PDF text</span>
    </span>
  );
}

const ORIGIN_LABELS: Record<string, string> = {
  region: "region",
  national: "national",
  eu: "EU",
  other: "other",
};

/** Flags a commitment whose target/measure is explicitly attributed to
 * another body rather than being the municipality's own — not always a
 * numeric "goal", can equally be a measure someone else suggested.
 * Independent of actor: the municipality is usually still the one doing
 * the committing. Can name more than one body at once. */
function OriginFlag({
  originatesFrom,
}: {
  originatesFrom: Commitment["originatesFrom"];
}) {
  if (!originatesFrom || originatesFrom.length === 0) return null;
  const label = originatesFrom.map((o) => ORIGIN_LABELS[o] ?? o).join(", ");
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-03/40 bg-blue-03/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-03"
      title={`Originates from ${label} — not a target/measure the municipality set itself`}
    >
      <Target className="h-3 w-3" aria-hidden />
      <span>Originates from: {label}</span>
    </span>
  );
}

function CommitmentReviewControls({
  commitment,
  columns,
  reviewCtx,
}: {
  commitment: Commitment;
  columns: "extract" | "climate" | "actionable";
  reviewCtx: ReviewContext;
}) {
  const entityKey = reviewKey(
    reviewCtx.step,
    "commitment",
    commitmentEntityId(commitment),
  );
  const snapshot = {
    stableId: commitment.stableId,
    text: commitment.text,
    climateRelevant: commitment.climateRelevant,
    adaptation: commitment.adaptation,
    climateFilterReason: commitment.climateFilterReason,
    actionable: commitment.actionable,
    actionableReason: commitment.actionableReason,
    unverified: commitment.unverified,
    foundInDocument: !commitment.unverified,
    section: commitment.section,
    type: commitment.type,
  };

  const defaultSuggestedValue =
    columns === "climate"
      ? {
          climateRelevant: commitment.climateRelevant ?? false,
          adaptation: commitment.adaptation,
        }
      : columns === "actionable"
        ? { actionable: commitment.actionable ?? false }
        : {
            foundInDocument: !commitment.unverified,
          };

  const suggestEditor =
    columns === "climate"
      ? climateFilterSuggestEditor({
          climateRelevant: commitment.climateRelevant,
          adaptation: commitment.adaptation,
        })
      : columns === "actionable"
        ? actionableFilterSuggestEditor(commitment.actionable)
        : extractCommitmentSuggestEditor({
            unverified: commitment.unverified,
          });

  return (
    <ReviewControls
      planId={reviewCtx.planId}
      step={reviewCtx.step}
      entityType="commitment"
      entityId={commitmentEntityId(commitment)}
      reviewedSnapshot={snapshot}
      review={reviewCtx.reviewsByEntity.get(entityKey)}
      defaultSuggestedValue={defaultSuggestedValue}
      suggestEditor={suggestEditor}
      onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
    />
  );
}

/** Confirms extractMunicipality's guess (or a correction typed into
 * ReviewControls' suggested-value field, if one's been entered there) and
 * links this plan to a real Municipality row. This is the step that lets
 * two plans for the same municipality — a klimatplan and a companion
 * document, run separately — end up sharing one real relation instead of
 * just matching on a loose name string, so it's deliberately placed on
 * the extractMunicipality step itself rather than buried in a review
 * flow. */
function ApproveButton({
  planId,
  extractedName,
  approvedName,
  onApproved,
}: {
  planId: string;
  extractedName: string | null;
  approvedName: string | null;
  onApproved: () => void;
}) {
  const [isApproving, setIsApproving] = useState(false);

  if (approvedName) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-03">
        <Check className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approvePlan(planId);
      toast.success(`Approved — linked to ${result.municipalityName}`);
      onApproved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!extractedName || isApproving}
      onClick={() => void handleApprove()}
      className="h-6 px-2 text-xs border-green-03/40 text-green-03 hover:bg-green-03/10 hover:border-green-03"
      title={
        extractedName
          ? `Link this plan to the "${extractedName}" municipality`
          : "No extracted name to approve yet"
      }
    >
      {isApproving ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <Check className="w-3 h-3 mr-1" />
      )}
      Approve
    </Button>
  );
}

/** Same path the municipality-sources registry's Run button uses — a
 * companion document is just another url to run through the real
 * docling/Chroma pipeline, same as any other. Produces an entirely new,
 * independent ClimatePlan (url is the unique key), not an update to the
 * plan this reference was found on — there's nothing here to bookkeep
 * afterward the way the registry's lastRunAt is, so a toast is enough. */
function RunCompanionButton({ url, name }: { url: string; name: string }) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await createJobsFromUrls({
        urls: [url],
        autoApprove: false,
        forceReindex: false,
        readImages: true,
        callbackUrl: getClimatePlansPipelineWebhookUrl(),
        reportTypeSlug: CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
      });
      toast.success(`Started pipeline for "${name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isRunning}
      onClick={handleRun}
      className="h-6 px-2 text-xs border-green-03/40 text-green-03 hover:bg-green-03/10 hover:border-green-03"
      title={`Start the pipeline for "${name}" as its own climate plan`}
    >
      {isRunning ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <Play className="w-3 h-3 mr-1" />
      )}
      Run
    </Button>
  );
}

function DocumentReferencesList({
  documentReferences,
}: {
  documentReferences: DocumentReference[];
}) {
  if (documentReferences.length === 0) {
    return (
      <p className="text-sm text-gray-02">
        No referenced documents found in this plan.
      </p>
    );
  }

  // groupDocumentReferences assigns groupId to rows naming the same
  // document from different sections — collapse those into one card so
  // the list doesn't repeat "avfallsplan" and "Avfallsplan" separately.
  // Ungrouped rows (groupId null) fall back to a group of one, keyed by
  // their own id.
  const groups = new Map<string, DocumentReference[]>();
  for (const ref of documentReferences) {
    const key = ref.groupId ?? ref.id;
    const list = groups.get(key) ?? [];
    list.push(ref);
    groups.set(key, list);
  }
  // A group's relationship is whichever member is "companion" — one
  // mention explicitly tying it to this plan's own measures outweighs
  // other mentions that were merely topically relevant. "initiative" is
  // the next strongest signal (an explicit adoption act), then "related".
  const groupedRefs = [...groups.values()].map((members) => ({
    name: members[0].name,
    relationship: members.some((m) => m.relationship === "companion")
      ? ("companion" as const)
      : members.some((m) => m.relationship === "initiative")
        ? ("initiative" as const)
        : ("related" as const),
    members,
  }));

  const companions = groupedRefs.filter((g) => g.relationship === "companion");
  const initiatives = groupedRefs.filter(
    (g) => g.relationship === "initiative",
  );
  const related = groupedRefs.filter((g) => g.relationship === "related");

  const renderGroup = (group: (typeof groupedRefs)[number]) => (
    <article
      key={group.members[0].id}
      className="rounded-lg border border-gray-03/50 bg-gray-03/20 p-3 min-w-0 space-y-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <MetaChip
          label="Relationship"
          tone={documentReferenceTone(group.relationship)}
        >
          {group.relationship}
        </MetaChip>
        <span className="text-sm font-medium text-gray-01">{group.name}</span>
        {group.members.length > 1 && (
          <span className="text-xs text-gray-02">
            mentioned {group.members.length}×
          </span>
        )}
        {group.relationship === "companion" &&
          (() => {
            const runUrl = group.members.find((m) => m.url)?.url;
            return runUrl ? (
              <RunCompanionButton url={runUrl} name={group.name} />
            ) : null;
          })()}
      </div>
      <div className="space-y-2 border-l-2 border-gray-03/50 pl-3">
        {group.members.map((ref) => (
          <div key={ref.id} className="space-y-0.5">
            <p className="text-xs text-gray-02 break-words">
              Section: {ref.section}
            </p>
            <p className="text-sm text-gray-01 break-words">
              &ldquo;{ref.quote}&rdquo;
            </p>
            <p className="text-xs italic text-gray-02 break-words">
              {ref.reasoning}
            </p>
            {ref.url && (
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block break-all text-xs text-blue-500 underline"
              >
                {ref.url}
              </a>
            )}
          </div>
        ))}
      </div>
    </article>
  );

  return (
    <div className="space-y-4">
      {companions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-02">
            Companion — likely holds this plan&apos;s own measures (
            {companions.length})
          </p>
          <div className="space-y-2">{companions.map(renderGroup)}</div>
        </div>
      )}
      {initiatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-02">
            Initiative — a regional/national program the municipality has
            explicitly joined ({initiatives.length})
          </p>
          <div className="space-y-2">{initiatives.map(renderGroup)}</div>
        </div>
      )}
      {related.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-02">
            Related documents ({related.length})
          </p>
          <div className="space-y-2">{related.map(renderGroup)}</div>
        </div>
      )}
    </div>
  );
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
const CLIMATE_PASSED_COLOR = "rgba(34, 197, 94, 0.45)";

type PdfViewerState =
  | { mode: "focused"; commitment: Commitment }
  | { mode: "all" }
  // Only reachable from the climate-filter step's own "view all in PDF"
  // button — colors verified commitments green/gray by whether they
  // passed the climate filter instead of the usual flat yellow (see
  // CLIMATE_PASSED_COLOR above; the gray side reuses PdfHighlightViewer's
  // own default secondary color).
  | { mode: "all-climate" };

function CommitmentsList({
  commitments,
  documentReferences,
  columns,
  reviewCtx,
  allVerifiedPhrases,
  climatePassedPhrases,
  climateFilteredOutPhrases,
  pdfMissingPhrases,
  setPdfViewer,
  /** Hide list-only chrome (bulk PDF, groundedness filters, group headers
   * copy) so Review mode can show one clean card. */
  focusSingle = false,
  /** Review mode for theme/similar: one group with its section header,
   * without the list-wide intro line. */
  focusGroup = false,
  /** Full eligible set for suggest editors — when the visible list is
   * filtered or single-item, options still cover every group/theme. */
  optionCommitments,
}: {
  commitments: Commitment[];
  documentReferences?: DocumentReference[];
  columns: "extract" | "climate" | "actionable" | "similar" | "themes";
  reviewCtx: ReviewContext;
  allVerifiedPhrases: string[];
  /** Only used when columns === "climate" — see the view-all-in-PDF button
   * further down, which colors these green/gray instead of flat yellow. */
  climatePassedPhrases: string[];
  climateFilteredOutPhrases: string[];
  pdfMissingPhrases: Set<string>;
  setPdfViewer: (v: PdfViewerState | null) => void;
  focusSingle?: boolean;
  focusGroup?: boolean;
  optionCommitments?: Commitment[];
}) {
  const optionsSource = optionCommitments ?? commitments;
  // Declared before the early return below so it's called unconditionally
  // on every render, per rules of hooks — only used by the default
  // (extract/climate/actionable) list further down, not the grouped
  // similar/themes views.
  const [flagFilter, setFlagFilter] = useState<
    "all" | "not-in-markdown" | "not-in-pdf"
  >("all");

  if (commitments.length === 0) {
    return <p className="text-sm text-gray-02">No commitments yet.</p>;
  }

  const referencesBySection = new Map<string, DocumentReference[]>();
  for (const ref of documentReferences ?? []) {
    const list = referencesBySection.get(ref.section) ?? [];
    list.push(ref);
    referencesBySection.set(ref.section, list);
  }

  const missingInView = commitments.filter((c) =>
    pdfMissingPhrases.has(c.text),
  ).length;

  if (columns === "similar") {
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
    const groupOptions = [
      ...new Set(
        optionsSource
          .map((c) => c.similarGroupId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const renderCommitmentRow = (c: Commitment) => {
      const entityKey = reviewKey(
        reviewCtx.step,
        "commitment",
        commitmentEntityId(c),
      );
      return (
        <li key={c.id} className="min-w-0 space-y-1.5 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-gray-02">
              {c.stableId}
            </span>
            <FoundInDocumentFlag unverified={c.unverified} />
            {c.fromRecoveredImage && <ImageSourceFlag />}
            {pdfMissingPhrases.has(c.text) && <NotFoundInPdfFlag />}
            <OriginFlag originatesFrom={c.originatesFrom} />
          </div>
          <p className="text-sm text-gray-01 break-words">{c.text}</p>
          <QaFooter>
            <ReviewControls
              planId={reviewCtx.planId}
              step={reviewCtx.step}
              entityType="commitment"
              entityId={commitmentEntityId(c)}
              reviewedSnapshot={{
                id: c.id,
                stableId: c.stableId,
                text: c.text,
                similarGroupId: c.similarGroupId,
                unverified: c.unverified,
                foundInDocument: !c.unverified,
              }}
              review={reviewCtx.reviewsByEntity.get(entityKey)}
              defaultSuggestedValue={{ similarGroupId: c.similarGroupId }}
              suggestEditor={similarGroupSuggestEditor(
                c.similarGroupId,
                groupOptions,
              )}
              onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
            />
          </QaFooter>
        </li>
      );
    };

    if (focusSingle) {
      return (
        <ul className="divide-y divide-gray-03/40 rounded-lg border border-gray-03/60 bg-gray-03/15">
          {commitments.map(renderCommitmentRow)}
        </ul>
      );
    }

    return (
      <div className="space-y-3">
        {!focusGroup && (
          <p className="text-xs text-gray-02">
            {groups.size} duplicate group(s), {singletons.length} unique
            commitment(s) — mark each commitment; Review mode walks one group at
            a time
          </p>
        )}
        {[...groups.entries()]
          .sort(([, a], [, b]) => b.length - a.length)
          .map(([groupId, members]) => (
            <section
              key={groupId}
              className="min-w-0 overflow-hidden rounded-lg border border-gray-03/60 bg-gray-03/15"
            >
              <header className="flex flex-wrap items-center gap-2 border-b border-gray-03/50 bg-gray-03/40 px-3 py-2">
                <span className="text-sm font-semibold text-gray-01">
                  Duplicate group
                </span>
                <span className="rounded-full bg-gray-04/60 px-2 py-0.5 text-[11px] tabular-nums text-gray-02">
                  {members.length}
                </span>
                <span
                  className="max-w-full truncate font-mono text-[10px] text-gray-02"
                  title={groupId}
                >
                  {groupId}
                </span>
              </header>
              <ul className="divide-y divide-gray-03/40">
                {members.map(renderCommitmentRow)}
              </ul>
            </section>
          ))}
        {singletons.length > 0 && (
          <section className="min-w-0 overflow-hidden rounded-lg border border-gray-03/60 bg-gray-03/15">
            <header className="flex flex-wrap items-center gap-2 border-b border-gray-03/50 bg-gray-03/40 px-3 py-2">
              <span className="text-sm font-semibold text-gray-01">Unique</span>
              <span className="rounded-full bg-gray-04/60 px-2 py-0.5 text-[11px] tabular-nums text-gray-02">
                {singletons.length}
              </span>
            </header>
            <ul className="divide-y divide-gray-03/40">
              {singletons.map(renderCommitmentRow)}
            </ul>
          </section>
        )}
      </div>
    );
  }

  if (columns === "themes") {
    const byTheme = new Map<string, Commitment[]>();
    for (const c of commitments) {
      const key = c.theme ?? "(none)";
      const list = byTheme.get(key) ?? [];
      list.push(c);
      byTheme.set(key, list);
    }
    const themeOptions = [
      ...COMMITMENT_THEME_OPTIONS,
      ...[
        ...new Set(
          optionsSource
            .map((c) => c.theme)
            .filter((theme): theme is string => Boolean(theme)),
        ),
      ].filter(
        (key) =>
          key !== "(none)" &&
          !(COMMITMENT_THEME_OPTIONS as readonly string[]).includes(key),
      ),
    ];

    const renderThemeRow = (c: Commitment) => {
      const entityKey = reviewKey(
        reviewCtx.step,
        "commitment",
        commitmentEntityId(c),
      );
      return (
        <li key={c.id} className="min-w-0 space-y-1.5 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-gray-02">
              {c.stableId}
            </span>
            <FoundInDocumentFlag unverified={c.unverified} />
            {c.fromRecoveredImage && <ImageSourceFlag />}
            {pdfMissingPhrases.has(c.text) && <NotFoundInPdfFlag />}
            <OriginFlag originatesFrom={c.originatesFrom} />
          </div>
          <p className="text-sm text-gray-01 break-words">{c.text}</p>
          <QaFooter>
            <ReviewControls
              planId={reviewCtx.planId}
              step={reviewCtx.step}
              entityType="commitment"
              entityId={commitmentEntityId(c)}
              reviewedSnapshot={{
                id: c.id,
                stableId: c.stableId,
                text: c.text,
                theme: c.theme,
                unverified: c.unverified,
                foundInDocument: !c.unverified,
              }}
              review={reviewCtx.reviewsByEntity.get(entityKey)}
              defaultSuggestedValue={{
                theme: c.theme ?? "other",
              }}
              suggestEditor={themeSuggestEditor(
                c.theme ?? "(none)",
                themeOptions,
              )}
              onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
            />
          </QaFooter>
        </li>
      );
    };

    if (focusSingle) {
      return (
        <ul className="divide-y divide-gray-03/40 rounded-lg border border-gray-03/60 bg-gray-03/15">
          {commitments.map(renderThemeRow)}
        </ul>
      );
    }

    return (
      <div className="space-y-3">
        {!focusGroup && (
          <p className="text-xs text-gray-02">
            Commitments grouped by theme — mark each commitment; Review mode
            walks one theme at a time
          </p>
        )}
        {[...byTheme.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([theme, members]) => (
            <section
              key={theme}
              className="min-w-0 overflow-hidden rounded-lg border border-gray-03/60 bg-gray-03/15"
            >
              <header className="flex flex-wrap items-center gap-2 border-b border-gray-03/50 bg-gray-03/40 px-3 py-2">
                <span className="text-sm font-semibold capitalize text-gray-01">
                  {theme}
                </span>
                <span className="rounded-full bg-gray-04/60 px-2 py-0.5 text-[11px] tabular-nums text-gray-02">
                  {members.length}
                </span>
              </header>
              <ul className="divide-y divide-gray-03/40">
                {members.map(renderThemeRow)}
              </ul>
            </section>
          ))}
      </div>
    );
  }

  const filteredCommitments = commitments.filter((c) => {
    if (flagFilter === "not-in-markdown") return c.unverified;
    if (flagFilter === "not-in-pdf") return pdfMissingPhrases.has(c.text);
    return true;
  });

  return (
    <div className="space-y-3">
      {!focusSingle &&
        (columns === "climate"
          ? (climatePassedPhrases.length > 0 ||
              climateFilteredOutPhrases.length > 0) && (
              <button
                onClick={() => setPdfViewer({ mode: "all-climate" })}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-03 bg-gray-03/40 px-2.5 py-1.5 text-xs text-gray-01 hover:bg-gray-03/60"
                title="Open the source PDF — climate-relevant commitments in green, filtered-out ones in gray"
              >
                <SearchCheck className="w-3.5 h-3.5" />
                View all in PDF ({
                  climatePassedPhrases.length
                } climate-relevant, {climateFilteredOutPhrases.length} filtered
                out)
              </button>
            )
          : allVerifiedPhrases.length > 0 && (
              <button
                onClick={() => setPdfViewer({ mode: "all" })}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-03 bg-gray-03/40 px-2.5 py-1.5 text-xs text-gray-01 hover:bg-gray-03/60"
                title="Open the source PDF with every verified commitment highlighted"
              >
                <SearchCheck className="w-3.5 h-3.5" />
                View all {allVerifiedPhrases.length} verified passages in PDF
              </button>
            ))}
      {!focusSingle && pdfMissingPhrases.size > 0 && (
        <p className="rounded-md border border-pink-03/30 bg-pink-03/10 px-2.5 py-1.5 text-xs text-pink-03">
          {missingInView > 0
            ? `${missingInView} markdown-verified commitment(s) in this list weren't found in the PDF text layer after search — marked “Not in PDF text” for manual check.`
            : `${pdfMissingPhrases.size} markdown-verified commitment(s) weren't found in the PDF text layer (may be on another step's filtered list).`}
        </p>
      )}
      {!focusSingle && columns === "extract" && (
        <p className="text-xs text-gray-02">
          <span className="text-gray-01">In markdown / Not in markdown</span>{" "}
          shows whether the quote was found in the plan markdown.{" "}
          <span className="text-gray-01">Not in PDF text</span> is a second,
          separate check — it only ever appears on markdown-verified quotes
          where the PDF's own text layer search still couldn't locate them.
        </p>
      )}
      {!focusSingle &&
        (commitments.some((c) => c.unverified) ||
          pdfMissingPhrases.size > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFlagFilter("all")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                flagFilter === "all"
                  ? "border-gray-01/40 bg-gray-01/10 text-gray-01"
                  : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
              )}
            >
              All ({commitments.length})
            </button>
            <button
              onClick={() => setFlagFilter("not-in-markdown")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                flagFilter === "not-in-markdown"
                  ? "border-orange-03/50 bg-orange-03/15 text-orange-03"
                  : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
              )}
            >
              Not in markdown ({commitments.filter((c) => c.unverified).length})
            </button>
            <button
              onClick={() => setFlagFilter("not-in-pdf")}
              disabled={pdfMissingPhrases.size === 0}
              title={
                pdfMissingPhrases.size === 0
                  ? 'Open "View all verified passages in PDF" above first to run this check'
                  : undefined
              }
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40",
                flagFilter === "not-in-pdf"
                  ? "border-pink-03/50 bg-pink-03/15 text-pink-03"
                  : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
              )}
            >
              Not in PDF text ({missingInView})
            </button>
          </div>
        )}
      {filteredCommitments.length === 0 ? (
        <p className="text-sm text-gray-02">
          No commitments match this filter.
        </p>
      ) : (
        filteredCommitments.map((c, idx) => (
          <div key={c.id} id={`commitment-${c.id}`} className="space-y-3">
            {columns === "extract" &&
              c.section !== filteredCommitments[idx - 1]?.section &&
              referencesBySection.get(c.section)?.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-gray-01"
                >
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <MetaChip
                      label="Relationship"
                      tone={documentReferenceTone(ref.relationship)}
                    >
                      {ref.relationship}
                    </MetaChip>
                    This section references: {ref.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-02 break-words">
                    &ldquo;{ref.quote}&rdquo;
                  </p>
                  <p className="mt-1 text-xs italic text-gray-02 break-words">
                    {ref.reasoning}
                  </p>
                  {ref.url && (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block break-all text-xs text-blue-500 underline"
                    >
                      {ref.url}
                    </a>
                  )}
                </div>
              ))}
            <article className="rounded-lg border border-gray-03/50 bg-gray-03/20 p-3 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-gray-02">
                  {c.stableId}
                </span>
                <FoundInDocumentFlag unverified={c.unverified} />
                {c.fromRecoveredImage && <ImageSourceFlag />}
                {pdfMissingPhrases.has(c.text) && <NotFoundInPdfFlag />}
                <OriginFlag originatesFrom={c.originatesFrom} />
                {!c.unverified && (
                  <button
                    onClick={() =>
                      setPdfViewer({ mode: "focused", commitment: c })
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-gray-03 bg-gray-03/40 px-2 py-1 text-xs text-gray-01 hover:bg-gray-03/60"
                    title={
                      c.fromRecoveredImage
                        ? "Search for this passage in the source PDF — docling routed it through image recovery, but the PDF sometimes has real selectable text there anyway"
                        : "Find and highlight this passage in the source PDF"
                    }
                  >
                    <SearchCheck className="w-3 h-3" />
                    Find in PDF
                  </button>
                )}
                {columns === "extract" && (
                  <MetaChip label="Type">{c.type}</MetaChip>
                )}
                {columns === "climate" && (
                  <>
                    <MetaChip label="Climate">
                      <YesNo value={c.climateRelevant} />
                    </MetaChip>
                    <MetaChip label="Adaptation">
                      <YesNo value={c.adaptation} />
                    </MetaChip>
                  </>
                )}
                {columns === "actionable" && (
                  <MetaChip label="Actionable">
                    <YesNo value={c.actionable} />
                  </MetaChip>
                )}
              </div>
              <p className="text-sm text-gray-01 break-words whitespace-pre-wrap">
                {c.text}
              </p>
              {c.type === "TABLE" &&
                c.tableMetadata &&
                c.tableMetadata.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.tableMetadata.map((field, i) => (
                      <MetaChip key={i} label={field.label}>
                        {field.value}
                      </MetaChip>
                    ))}
                  </div>
                )}
              {columns === "extract" && c.section && (
                <p className="text-xs text-gray-02 break-words">
                  Section: {c.section}
                </p>
              )}
              {columns === "climate" && c.climateFilterReason && (
                <p className="text-xs text-gray-02 break-words">
                  {c.climateFilterReason}
                </p>
              )}
              {columns === "actionable" && c.actionableReason && (
                <p className="text-xs text-gray-02 break-words">
                  {c.actionableReason}
                </p>
              )}
              <QaFooter>
                <CommitmentReviewControls
                  commitment={c}
                  columns={columns}
                  reviewCtx={reviewCtx}
                />
              </QaFooter>
            </article>
          </div>
        ))
      )}
    </div>
  );
}

function MeasuresList({
  measures,
  columns,
  reviewCtx,
}: {
  measures: ExtractedMeasure[];
  columns: "extract" | "score";
  reviewCtx: ReviewContext;
}) {
  if (measures.length === 0) {
    return <p className="text-sm text-gray-02">No measures yet.</p>;
  }
  return (
    <div className="space-y-3">
      {measures.map((m) => {
        const entityKey = reviewKey(
          reviewCtx.step,
          "measure",
          measureEntityId(m),
        );
        const snapshot =
          columns === "extract"
            ? {
                measureText: m.measureText,
                climateRelevanceScore: m.climateRelevanceScore,
              }
            : {
                measureText: m.measureText,
                activityShiftScore: m.score?.activityShiftScore ?? null,
                interventionScore: m.score?.interventionScore ?? null,
                interventionType: m.score?.interventionType ?? null,
              };
        return (
          <article
            key={m.id}
            className="rounded-lg border border-gray-03/50 bg-gray-03/20 p-3 min-w-0 space-y-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              {columns === "extract" && (
                <MetaChip label="Relevance" tone="relevance">
                  {m.climateRelevanceScore}
                </MetaChip>
              )}
              {columns === "score" && (
                <>
                  <ScoreChip
                    label="Activity shift"
                    score={m.score?.activityShiftScore}
                  />
                  <ScoreChip
                    label="Intervention"
                    score={m.score?.interventionScore}
                  />
                  <MetaChip label="Type" tone="type">
                    {m.score?.interventionType ?? "—"}
                  </MetaChip>
                </>
              )}
            </div>
            <p className="text-sm text-gray-01 break-words whitespace-pre-wrap">
              {m.measureText}
            </p>
            <QaFooter>
              <ReviewControls
                planId={reviewCtx.planId}
                step={reviewCtx.step}
                entityType="measure"
                entityId={measureEntityId(m)}
                reviewedSnapshot={snapshot}
                review={reviewCtx.reviewsByEntity.get(entityKey)}
                defaultSuggestedValue={snapshot}
                onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
              />
            </QaFooter>
          </article>
        );
      })}
    </div>
  );
}

function StepNavArrow({
  direction,
  stepName,
  onClick,
}: {
  direction: "prev" | "next";
  stepName: string;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      title={stepName}
      aria-label={
        direction === "prev"
          ? `Previous worker: ${stepName}`
          : `Next worker: ${stepName}`
      }
      className={cn(
        "flex max-w-[9.5rem] flex-col items-center gap-1 rounded-xl border border-gray-03/80",
        "bg-gray-04/95 px-2.5 py-2.5 text-gray-01 shadow-lg backdrop-blur",
        "hover:border-blue-03/50 hover:bg-gray-03/80 hover:text-blue-03",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-03",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight">
        {stepName}
      </span>
    </button>
  );
}

export function StepResultDialog({
  plan,
  step,
  runId,
  open,
  onOpenChange,
  onRerun,
  adjacentSteps,
  onNavigateStep,
}: StepResultDialogProps) {
  const { detail, isLoading, error, refresh } = useClimatePlanDetail(
    open ? (plan?.id ?? null) : null,
  );
  const [localReviews, setLocalReviews] = useState<Map<
    string,
    PipelineReview
  > | null>(null);
  const [pdfViewer, setPdfViewer] = useState<PdfViewerState | null>(null);
  // Verified commitment texts the PDF text-layer search couldn't re-find
  // after opening the viewer — filled in by onVerifiedSearchComplete, kept
  // so the list can flag them for manual checking even after the PDF closes.
  const [pdfMissingPhrases, setPdfMissingPhrases] = useState<Set<string>>(
    () => new Set(),
  );
  // Wide enough to fit a commitments list and a PDF page side by side —
  // below this, the PDF instead opens as its own full-screen modal (see
  // the return statement below).
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [viewMode, setViewMode] = useState<StepViewMode>("list");
  const [qaFilter, setQaFilter] = useState<QaStatusFilter>("all");
  const [reviewIndex, setReviewIndex] = useState(0);

  const reviewsByEntity = useMemo(() => {
    if (localReviews) return localReviews;
    return indexReviewsByEntity(detail?.reviews ?? []);
  }, [detail?.reviews, localReviews]);

  const detailReviewsKey = detail?.reviews?.map((r) => r.id).join(",") ?? "";
  useEffect(() => {
    setLocalReviews(null);
  }, [detail?.id, detailReviewsKey]);

  // A PDF panel/modal left open from a previous step or plan would
  // otherwise linger, showing the wrong document's highlights.
  useEffect(() => {
    setPdfViewer(null);
    setPdfMissingPhrases(new Set());
  }, [plan?.id, step, open]);

  // Fresh dialog session / different step: start on list with All.
  useEffect(() => {
    setViewMode("list");
    setQaFilter("all");
    setReviewIndex(0);
  }, [plan?.id, step, open]);

  // Changing filter or entering review mode restarts at the first item.
  useEffect(() => {
    setReviewIndex(0);
  }, [qaFilter, viewMode]);

  // Clamp when the filtered queue shrinks (e.g. OK under Not reviewed).
  useEffect(() => {
    if (!detail || !step || !stepSupportsReviewMode(step)) return;
    const items = filterByQaStatus(
      buildStepReviewItems(step, detail),
      step,
      reviewsByEntity,
      qaFilter,
    );
    if (items.length === 0) {
      if (reviewIndex !== 0) setReviewIndex(0);
      return;
    }
    const max = items.length - 1;
    if (reviewIndex > max) setReviewIndex(max);
  }, [detail, step, reviewsByEntity, qaFilter, reviewIndex]);

  // Opening the split panel swaps the commitments list into a whole new
  // parent (plain scroll div -> ResizableSplitView's left pane), so React
  // remounts it at scroll position 0 — losing the spot the user was just
  // looking at. Re-find the clicked commitment in the fresh DOM and scroll
  // it back into view instead of leaving the list jumped to the top.
  useEffect(() => {
    if (pdfViewer?.mode !== "focused") return;
    const el = document.getElementById(`commitment-${pdfViewer.commitment.id}`);
    el?.scrollIntoView({ block: "center" });
  }, [pdfViewer]);

  if (!plan || !step) return null;

  // Local const so nested helpers keep `string` after the null guard
  // (function declarations would not retain the narrowing).
  const stepId = step;

  const stepRuns = plan.pipelineSteps.filter((s) => s.step === stepId);
  const run = runId
    ? (stepRuns.find((s) => s.runId === runId) ?? stepRuns[0])
    : stepRuns[0];
  const previousRuns = stepRuns.slice(1);
  const itemCount = detail ? getStepItemCount(stepId, detail) : null;
  const viewingPastRun = Boolean(runId) && run !== stepRuns[0];

  const reviewCtx: ReviewContext = {
    planId: plan.id,
    step: stepId,
    reviewsByEntity,
    onReviewChanged: (next, key) => {
      setLocalReviews((prev) => {
        const base = new Map(prev ?? reviewsByEntity);
        if (next) base.set(key, next);
        else base.delete(key);
        return base;
      });
    },
  };

  // Whole-plan list, independent of which step's filtered view is open —
  // "Find in PDF" always highlights every verified commitment, not just
  // the ones visible in the current step. Hoisted above the content IIFE
  // (rather than computed inside it) so the split-view PDF panel in the
  // return statement below can use the same values.
  // Flat per-part phrases, not one string per commitment — a merged
  // commitment's parts don't always sit next to each other in the source
  // (see commitmentExtraction.ts's merge loop), so searching for the whole
  // merged text as one string would miss every part after the first. Each
  // part is searched/highlighted independently (same pattern as the
  // focused-commitment path — see PdfHighlightViewer's verifiedPhrases
  // loop, which already unions per-phrase matches into one highlight set).
  // Includes fromRecoveredImage commitments too — docling routes a region
  // through image recovery when its OWN layout model misclassifies it as a
  // picture, which doesn't always mean the underlying PDF actually lacks
  // real selectable text there (confirmed on a real plan: pdftotext found
  // clean text at a spot docling had classified as an image). Searching
  // anyway and falling back to NotFoundInPdfFlag when it's a genuine image
  // costs nothing — the search already handles "not found" gracefully for
  // ordinary misses.
  const verifiedCommitments = detail
    ? detail.commitments.filter((c) => !c.unverified)
    : [];
  const allVerifiedPhrases = verifiedCommitments.flatMap(commitmentParts);
  // Maps each searched part phrase back to the commitment it belongs to,
  // so "this part wasn't found" can be reported as "this commitment wasn't
  // fully found" via pdfMissingPhrases (keyed by commitment text, per the
  // NotFoundInPdfFlag checks below) without changing what those checks key
  // on.
  const partToCommitmentText = new Map<string, string>();
  for (const c of verifiedCommitments) {
    for (const part of commitmentParts(c))
      partToCommitmentText.set(part, c.text);
  }
  // Same split, but by whether each commitment passed the climate filter —
  // feeds the "view all in PDF, climate-colored" button on that step (see
  // CommitmentsList's columns === "climate" branch). Still only
  // markdown-verified commitments — an unverified one can't be found in
  // the PDF text layer either, there's nothing useful to highlight.
  const climatePassedPhrases = verifiedCommitments
    .filter((c) => c.climateRelevant)
    .flatMap(commitmentParts);
  const climateFilteredOutPhrases = verifiedCommitments
    .filter((c) => !c.climateRelevant)
    .flatMap(commitmentParts);
  const pdfUrl = detail
    ? `${getClimatePlansPipelineApiUrl()}/plans/${detail.id}/pdf`
    : "";

  function handleVerifiedSearchComplete(result: {
    searchedPhrases: string[];
    missingPhrases: string[];
  }) {
    const missingFromThisSearch = new Set(result.missingPhrases);
    const searchedFullVerifiedSet =
      result.searchedPhrases.length === allVerifiedPhrases.length &&
      allVerifiedPhrases.every((phrase) =>
        result.searchedPhrases.includes(phrase),
      );

    if (searchedFullVerifiedSet) {
      // result.* here are per-part phrases (see allVerifiedPhrases above)
      // — a commitment counts as missing if ANY of its own parts wasn't
      // found, same "every part must hold" bar the worker's own
      // unverified check uses. pdfMissingPhrases stays keyed by
      // commitment text either way, so NotFoundInPdfFlag's checks don't
      // need to change.
      const missingCommitments = new Set<string>();
      for (const phrase of missingFromThisSearch) {
        const commitmentText = partToCommitmentText.get(phrase);
        if (commitmentText) missingCommitments.add(commitmentText);
      }
      setPdfMissingPhrases(missingCommitments);
      return;
    }

    // Single-commitment find: merge into any prior "view all" result.
    // This path's phrases are already commitment-level (the focused path
    // reports missing/searched using the commitment's flat text as its
    // identifier — see PdfHighlightBody), unlike the view-all path above.
    setPdfMissingPhrases((previous) => {
      const next = new Set(previous);
      for (const phrase of result.searchedPhrases) {
        if (missingFromThisSearch.has(phrase)) next.add(phrase);
        else next.delete(phrase);
      }
      return next;
    });
  }

  const supportsReviewMode = stepSupportsReviewMode(stepId);
  const reviewPrompt = getStepReviewPrompt(stepId);
  const allReviewItems = detail ? buildStepReviewItems(stepId, detail) : [];
  const filteredReviewItems = filterByQaStatus(
    allReviewItems,
    stepId,
    reviewsByEntity,
    qaFilter,
  );
  const qaCounts = countByQaStatus(allReviewItems, stepId, reviewsByEntity);
  const safeReviewIndex =
    filteredReviewItems.length === 0
      ? 0
      : Math.min(Math.max(reviewIndex, 0), filteredReviewItems.length - 1);

  const optionCommitments = detail ? commitmentsForStep(stepId, detail) : [];

  const sharedCommitmentListProps = {
    reviewCtx,
    allVerifiedPhrases,
    climatePassedPhrases,
    climateFilteredOutPhrases,
    pdfMissingPhrases,
    setPdfViewer,
    optionCommitments,
  };

  function renderCommitmentsList(
    commitments: Commitment[],
    columns: "extract" | "climate" | "actionable" | "similar" | "themes",
    documentReferences?: DocumentReference[],
  ) {
    const filtered = filterCommitmentsByQaStatus(
      commitments,
      stepId,
      reviewsByEntity,
      qaFilter,
    );
    if (filtered.length === 0 && qaFilter !== "all") {
      return (
        <p className="text-sm text-gray-02">No items match this filter.</p>
      );
    }
    return (
      <CommitmentsList
        commitments={filtered}
        documentReferences={documentReferences}
        columns={columns}
        {...sharedCommitmentListProps}
      />
    );
  }

  function renderFilteredOrEmpty(isEmpty: boolean, node: ReactNode): ReactNode {
    if (isEmpty && qaFilter !== "all") {
      return (
        <p className="text-sm text-gray-02">No items match this filter.</p>
      );
    }
    return node;
  }

  const content = (() => {
    if (isLoading || !detail) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
        </div>
      );
    }
    if (error) {
      return <p className="text-sm text-pink-03">Could not load: {error}</p>;
    }

    if (supportsReviewMode && viewMode === "review" && reviewPrompt) {
      const current = filteredReviewItems[safeReviewIndex] ?? null;
      if (!current) {
        return (
          <StepReviewMode
            prompt={reviewPrompt}
            itemCount={0}
            index={0}
            onIndexChange={setReviewIndex}
            className="h-full min-h-0"
          >
            {null}
          </StepReviewMode>
        );
      }
      return (
        <StepReviewItemCard
          key={current.entityId}
          item={current}
          reviewCtx={reviewCtx}
          optionCommitments={optionCommitments}
          pdfMissingPhrases={pdfMissingPhrases}
          onFindInPdf={(commitment) =>
            setPdfViewer({ mode: "focused", commitment })
          }
          onNavigateToEntityId={(entityId) => {
            const idx = filteredReviewItems.findIndex(
              (item) => item.entityId === entityId,
            );
            if (idx >= 0) setReviewIndex(idx);
          }}
        >
          {({ body, dock, contextLabel, subProgress }) => (
            <StepReviewMode
              prompt={reviewPrompt}
              itemCount={filteredReviewItems.length}
              index={safeReviewIndex}
              onIndexChange={setReviewIndex}
              contextLabel={contextLabel}
              subProgress={subProgress}
              footer={dock}
              className="h-full min-h-0"
            >
              {body}
            </StepReviewMode>
          )}
        </StepReviewItemCard>
      );
    }

    switch (step) {
      // "documentReferences" is a synthetic pseudo-step opened from the
      // plan row's reference-count badge (see PlanRow's
      // DOCUMENT_REFERENCES_STEP); "groupDocumentReferences" is the real
      // pipeline step's own swimlane pill. Both show the same list — the
      // pill needs its own case too, or clicking it falls through to "No
      // details for this step" below.
      case "documentReferences":
      case "groupDocumentReferences":
        return (
          <DocumentReferencesList
            documentReferences={detail.documentReferences}
          />
        );
      case "extractMunicipality": {
        const entityKey = reviewKey(step, "municipality", plan.id);
        const snapshot = {
          extractedMunicipalityName: detail.extractedMunicipalityName,
          approvedMunicipalityName: detail.municipality?.name ?? null,
        };
        const adoptedDisplay = detail.adoptedAt
          ? new Date(detail.adoptedAt).toLocaleDateString()
          : detail.adoptedAtText;
        const coverageDisplay =
          detail.coveragePeriodText ??
          (detail.coveragePeriodStart
            ? `${detail.coveragePeriodStart}–${detail.coveragePeriodEnd ?? "?"}`
            : null);
        return (
          <div className="space-y-4 text-sm min-w-0">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-01 break-words">
                {detail.documentTitle ?? "Untitled document"}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <MetaChip label="Municipality" tone="relevance">
                  {detail.municipality?.name ??
                    detail.extractedMunicipalityName ??
                    "—"}
                </MetaChip>
                {adoptedDisplay && (
                  <MetaChip label="Adopted" tone="score">
                    {adoptedDisplay}
                  </MetaChip>
                )}
                {coverageDisplay && (
                  <MetaChip label="Covers" tone="type">
                    {coverageDisplay}
                  </MetaChip>
                )}
                <ApproveButton
                  planId={plan.id}
                  extractedName={detail.extractedMunicipalityName}
                  approvedName={detail.municipality?.name ?? null}
                  onApproved={refresh}
                />
              </div>
              {/* Only shown when it actually differs — the common case
                  (approval just confirmed the extraction) doesn't need two
                  near-identical lines competing for attention. */}
              {detail.municipality &&
                detail.extractedMunicipalityName &&
                detail.municipality.name !==
                  detail.extractedMunicipalityName && (
                  <p className="text-xs text-gray-02">
                    Originally extracted as &ldquo;
                    {detail.extractedMunicipalityName}&rdquo;
                  </p>
                )}
            </div>
            {detail.documentDescription && (
              <p className="text-sm text-gray-01 border-l-2 border-gray-03 pl-3 italic">
                {detail.documentDescription}
              </p>
            )}
            <QaFooter>
              <ReviewControls
                planId={plan.id}
                step={step}
                entityType="municipality"
                entityId={plan.id}
                reviewedSnapshot={snapshot}
                review={reviewsByEntity.get(entityKey)}
                defaultSuggestedValue={{
                  municipalityName: detail.extractedMunicipalityName ?? "",
                }}
                onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
              />
            </QaFooter>
          </div>
        );
      }
      case "extractCommitments":
        return renderCommitmentsList(
          detail.commitments,
          "extract",
          detail.documentReferences,
        );
      case "filterCommitmentsClimate":
        return renderCommitmentsList(detail.commitments, "climate");
      case "filterCommitmentsActionable":
        return renderCommitmentsList(
          detail.commitments.filter((c) => c.climateRelevant),
          "actionable",
        );
      case "groupCommitmentsSimilar":
        return renderCommitmentsList(
          detail.commitments.filter((c) => c.climateRelevant && c.actionable),
          "similar",
        );
      case "groupCommitmentsThemes":
        return renderCommitmentsList(
          detail.commitments.filter((c) => c.climateRelevant && c.actionable),
          "themes",
        );
      case "extractMeasures": {
        const measures = filterMeasuresByQaStatus(
          detail.extractedMeasures,
          stepId,
          reviewsByEntity,
          qaFilter,
        );
        return renderFilteredOrEmpty(
          measures.length === 0,
          <MeasuresList
            measures={measures}
            columns="extract"
            reviewCtx={reviewCtx}
          />,
        );
      }
      case "scoreMeasures": {
        const measures = filterMeasuresByQaStatus(
          detail.extractedMeasures,
          stepId,
          reviewsByEntity,
          qaFilter,
        );
        return renderFilteredOrEmpty(
          measures.length === 0,
          <MeasuresList
            measures={measures}
            columns="score"
            reviewCtx={reviewCtx}
          />,
        );
      }
      case "classifyActivityShiftTypes":
        return (
          <TransitionElementsView
            measures={detail.extractedMeasures}
            reviewCtx={reviewCtx}
            showMatches={false}
          />
        );
      case "matchTransitionElements": {
        const { measures, visibleMatchIdsByShiftKey } =
          filterTeMatchesForListView(
            detail.extractedMeasures,
            stepId,
            reviewsByEntity,
            qaFilter,
          );
        return renderFilteredOrEmpty(
          measures.length === 0,
          <TransitionElementsView
            measures={measures}
            reviewCtx={reviewCtx}
            visibleMatchIdsByShiftKey={
              qaFilter === "all" ? undefined : visibleMatchIdsByShiftKey
            }
          />,
        );
      }
      default:
        return (
          <p className="text-sm text-gray-02">No details for this step.</p>
        );
    }
  })();

  // On large screens, the PDF opens as a panel to the right of the
  // content instead of stacking a second modal on top — both stay
  // visible and independently scrollable at once. Smaller screens don't
  // have room for that, so the PDF still opens as its own full-screen
  // modal there (see the non-split branch below).
  const showSplitPanel = isLargeScreen && pdfViewer !== null;

  // Climate step's PDF view shows green/gray (passed/filtered-out) instead
  // of the usual flat yellow — bound to which step is active rather than
  // pdfViewer.mode, since the panel below always shows the full background
  // set regardless of mode ("focused" only adds a red overlay on top of
  // it), so its color choice needs the same binding the modal's
  // "all-climate" mode uses.
  const isClimateStep = step === "filterCommitmentsClimate";

  const qaToolbar = supportsReviewMode ? (
    <div className="mt-2">
      <QaReviewToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        qaFilter={qaFilter}
        onQaFilterChange={setQaFilter}
        counts={qaCounts}
      />
    </div>
  ) : null;

  // Keep interactive controls out of DialogTitle / <h2> for a11y.
  const dialogTitle = (
    <div className="flex flex-wrap items-center gap-3">
      <span>{stepId}</span>
      {itemCount !== null && (
        <span className="text-xs font-normal text-gray-02">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      )}
      {stepId !== "documentReferences" && (
        <>
          <StatusPill
            label={run?.status ?? "pending"}
            status={toSwimlaneStatus(run?.status)}
            isActive={run?.status === "running"}
          />
          <RerunButton
            planId={plan.id}
            step={stepId}
            onRerun={() => {
              refresh();
              onRerun?.();
            }}
          />
        </>
      )}
    </div>
  );
  // Lets a reviewer check how docling's parsed markdown actually renders
  // (tables in particular — table-structure bugs like the banner-row one
  // fixed in commitmentText.ts are much easier to spot rendered than in
  // raw pipe-syntax) without leaving the dialog. Same rendering component
  // used for company markdown (see markdown-display.tsx).
  const sourceMarkdownSection = detail?.markdown ? (
    <div className="mt-3">
      <CollapsibleSection
        title="Source markdown — pretty"
        icon={<FileText />}
        accentIconBg="bg-blue-03/20"
        accentTextColor="text-blue-03"
      >
        <div className="prose prose-sm prose-invert max-w-none">
          <MarkdownVectorPagesDisplay value={detail.markdown} />
        </div>
      </CollapsibleSection>
      <CollapsibleSection
        title="Source markdown — raw"
        icon={<Code />}
        accentIconBg="bg-pink-03/20"
        accentTextColor="text-pink-03"
      >
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(detail.markdown!);
              toast.success("Raw markdown copied");
            }}
            className="text-gray-02 hover:bg-gray-03/40"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
        </div>
        <pre className="text-xs text-gray-02 overflow-x-auto whitespace-pre-wrap">
          {detail.markdown}
        </pre>
      </CollapsibleSection>
      {detail.annotatedMarkdown && (
        <CollapsibleSection
          title="Source markdown — annotated"
          icon={<Tags />}
          accentIconBg="bg-orange-03/20"
          accentTextColor="text-orange-03"
        >
          <p className="text-xs text-gray-02 mb-2">
            The source markdown with "[SYSTEM NOTE: ...]" markers inserted
            wherever a heading is immediately preceded by a bare-number
            decorative image — exactly what chunking/extraction actually sees
            for those headings (see rule 8). Computed fresh on every fetch,
            never stored, never used for verification.
          </p>
          <pre className="text-xs text-gray-02 overflow-x-auto whitespace-pre-wrap">
            {detail.annotatedMarkdown}
          </pre>
        </CollapsibleSection>
      )}
    </div>
  ) : null;

  // Same dialog-level data as sourceMarkdownSection above (fetched once
  // per plan, not per step) — shown on every step's dialog, not just
  // docling's, since a reviewer checking e.g. extractCommitments'
  // output for a fromRecoveredImage commitment needs to see the actual
  // picture it came from just as much as someone checking docling itself.
  const recoveredImagesSection = (
    <RecoveredImagesGallery images={detail?.recoveredImages ?? []} />
  );

  const dialogDescription =
    step === "documentReferences" ? (
      "Collected by extractCommitments across all sections, then deduplicated by groupDocumentReferences — this view itself isn't a separate pipeline step."
    ) : run ? (
      <div>
        <span className="text-xs">
          Started {new Date(run.startedAt).toLocaleString()}
          {run.completedAt &&
            ` · finished ${new Date(run.completedAt).toLocaleString()}`}
          {run.error && (
            <span className="block text-pink-03 mt-1">{run.error}</span>
          )}
        </span>
        {viewingPastRun && (
          <span className="block text-xs text-blue-03 mt-1">
            Viewing a past run — status/timing only; commitment and measure
            content below always reflects the current data.
          </span>
        )}
        <span className="block text-xs text-gray-02 mt-1">
          QA marks are an overlay — they do not change live pipeline outputs.
          Use the review board to export feedback for improving the pipeline.
        </span>
        <PreviousStepRuns runs={previousRuns} />
      </div>
    ) : (
      "This step hasn't run yet."
    );

  const sideNav =
    onNavigateStep && adjacentSteps
      ? {
          left: adjacentSteps.prev ? (
            <StepNavArrow
              direction="prev"
              stepName={adjacentSteps.prev}
              onClick={() => onNavigateStep(adjacentSteps.prev!)}
            />
          ) : undefined,
          right: adjacentSteps.next ? (
            <StepNavArrow
              direction="next"
              stepName={adjacentSteps.next}
              onClick={() => onNavigateStep(adjacentSteps.next!)}
            />
          ) : undefined,
        }
      : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size={showSplitPanel || viewMode === "review" ? "full" : "6xl"}
      scrollable={!showSplitPanel && viewMode !== "review"}
      fillHeight={showSplitPanel || viewMode === "review"}
      sideNav={sideNav}
      // The split-view case moves this into the left pane instead (see
      // below) — the shared header would otherwise push the PDF pane down
      // by however tall the run's timing/QA/previous-runs block happens
      // to be, capping how much vertical room the PDF actually gets. The
      // PDF pane doesn't need any of that context; the commitments list
      // does.
      title={showSplitPanel ? undefined : dialogTitle}
      description={
        showSplitPanel || viewMode === "review" ? undefined : dialogDescription
      }
    >
      {showSplitPanel ? (
        <ResizableSplitView
          className="min-h-0 flex-1"
          left={
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 mb-3 border-b border-gray-03 bg-gray-04 pb-3">
                <h2 className="text-lg font-medium text-gray-01">
                  {dialogTitle}
                </h2>
                {viewMode !== "review" && (
                  <div className="mt-1 text-sm text-gray-02">
                    {dialogDescription}
                  </div>
                )}
                {qaToolbar}
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {content}
              </div>
              {viewMode !== "review" && sourceMarkdownSection}
              {viewMode !== "review" && recoveredImagesSection}
            </div>
          }
          right={
            <PdfHighlightPanel
              url={pdfUrl}
              // Always the full set (never just the one clicked
              // commitment) so the panel renders the same document with
              // the same highlights every time it's opened for this plan
              // — clicking a different commitment's "Find in PDF" while
              // the panel stays open then only has to move the red
              // highlight (see PdfHighlightBody's refocus effect), not
              // reload anything. On the climate step this is the
              // green/gray passed/filtered-out split instead of flat
              // yellow (see isClimateStep above).
              verifiedPhrases={
                isClimateStep ? climatePassedPhrases : allVerifiedPhrases
              }
              verifiedColor={isClimateStep ? CLIMATE_PASSED_COLOR : undefined}
              secondaryPhrases={
                isClimateStep ? climateFilteredOutPhrases : undefined
              }
              focusedPhrase={
                pdfViewer?.mode === "focused"
                  ? pdfViewer.commitment.text
                  : undefined
              }
              focusedPhraseParts={
                pdfViewer?.mode === "focused"
                  ? pdfViewer.commitment.extractionParts?.map((p) => p.text)
                  : undefined
              }
              onVerifiedSearchComplete={handleVerifiedSearchComplete}
              onClose={() => setPdfViewer(null)}
            />
          }
        />
      ) : viewMode === "review" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 shrink-0">{qaToolbar}</div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {content}
          </div>
        </div>
      ) : (
        <>
          {qaToolbar}
          <div className="mt-4 min-w-0 overflow-x-hidden">
            {content}
            {sourceMarkdownSection}
            {recoveredImagesSection}
          </div>
          {pdfViewer && (
            <PdfHighlightViewer
              open
              onOpenChange={(nextOpen) => {
                if (!nextOpen) setPdfViewer(null);
              }}
              url={pdfUrl}
              verifiedPhrases={
                pdfViewer.mode === "all-climate"
                  ? climatePassedPhrases
                  : pdfViewer.mode === "all"
                    ? allVerifiedPhrases
                    : []
              }
              verifiedColor={
                pdfViewer.mode === "all-climate"
                  ? CLIMATE_PASSED_COLOR
                  : undefined
              }
              secondaryPhrases={
                pdfViewer.mode === "all-climate"
                  ? climateFilteredOutPhrases
                  : undefined
              }
              focusedPhrase={
                pdfViewer.mode === "focused"
                  ? pdfViewer.commitment.text
                  : undefined
              }
              focusedPhraseParts={
                pdfViewer.mode === "focused"
                  ? pdfViewer.commitment.extractionParts?.map((p) => p.text)
                  : undefined
              }
              onVerifiedSearchComplete={handleVerifiedSearchComplete}
            />
          )}
        </>
      )}
    </Modal>
  );
}
