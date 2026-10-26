import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import type {
  ActivityShift,
  ExtractedMeasure,
  RecoveredTransitionElement,
  TransitionElementCandidate,
  TransitionElementMatch,
} from "../hooks/useClimatePlanDetail";
import { reviewKey } from "../hooks/usePipelineReviews";
import { ReviewControls } from "./ReviewControls";
import {
  isTeMatchAddSuggestion,
  teMatchAddEditor,
  teMatchSelectEditor,
} from "./structuredSuggestEditors";
import { activityShiftEntityKey } from "../lib/stepReviewEntities";
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
import type { ReviewContext } from "./reviewContext";
import {
  MetaChip,
  QaFooter,
  ScoreChip,
  type MetaChipTone,
} from "./stepResultListUi";

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
  onDismissPendingSlot,
  pendingSlotIds,
}: {
  shiftId: string;
  matchedIds: Set<string>;
  allCandidates: Array<{ stableId: string; shortLabel: string; score: number }>;
  suggestedNew: { shortLabel: string; description: string } | null;
  reviewCtx: ReviewContext;
  onRequestAddSlot: () => void;
  onDismissPendingSlot: (slotId: string) => void;
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
                onDismissUnsaved={
                  pendingEntityIds.includes(entityId)
                    ? () => {
                        const prefix = `${shiftId}:add:`;
                        if (!entityId.startsWith(prefix)) return;
                        onDismissPendingSlot(entityId.slice(prefix.length));
                      }
                    : undefined
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

  const dismissPendingSlot = (slotId: string) => {
    setPendingAddSlotIds((ids) => ids.filter((id) => id !== slotId));
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
          onDismissPendingSlot={dismissPendingSlot}
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

export function TransitionElementsView({
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
