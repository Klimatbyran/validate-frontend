import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  ChevronsDown,
  ChevronsUp,
  Plus,
  RotateCw,
} from "lucide-react";
import { Modal } from "@/ui/modal";
import { Button } from "@/ui/button";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { StatusPill } from "@/components/StatusPill";
import {
  toSwimlaneStatus,
  type ClimatePipelinePlan,
  type PipelineStepRun,
} from "../hooks/useClimatePipelinePlans";
import {
  useClimatePlanDetail,
  type ActivityShift,
  type Commitment,
  type ExtractedMeasure,
  type ClimatePlanDetail,
} from "../hooks/useClimatePlanDetail";
import {
  indexReviewsByEntity,
  reviewKey,
  type PipelineReview,
} from "../hooks/usePipelineReviews";
import { ReviewControls } from "./ReviewControls";
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

/** Count of items shown in each step's dialog — same filters the dialog
 * content itself applies, so the title badge always matches what's below. */
function getStepItemCount(
  step: string,
  detail: ClimatePlanDetail,
): number | null {
  switch (step) {
    case "extractCommitments":
      return detail.commitments.length;
    case "filterCommitmentsClimate":
      return detail.commitments.length;
    case "filterCommitmentsActionable":
      return detail.commitments.filter((c) => c.climateRelevant).length;
    case "groupCommitmentsSimilar":
    case "groupCommitmentsThemes":
      return detail.commitments.filter((c) => c.climateRelevant && c.actionable)
        .length;
    case "extractMeasures":
      return detail.extractedMeasures.length;
    case "scoreMeasures":
      return detail.extractedMeasures.length;
    case "matchTransitionElements":
      return detail.extractedMeasures.filter(
        (m) => m.score && m.score.activityShifts.length > 0,
      ).length;
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

/** Survive extractCommitments delete+recreate by keying on stableId. */
function commitmentEntityId(commitment: Commitment): string {
  return commitment.stableId;
}

/** Survive extractMeasures recreate when measure text is unchanged. */
function measureEntityId(measure: ExtractedMeasure): string {
  let hash = 0;
  for (let i = 0; i < measure.measureText.length; i++) {
    hash = (hash * 31 + measure.measureText.charCodeAt(i)) | 0;
  }
  return `measure:${(hash >>> 0).toString(36)}`;
}

/** Survive scoreMeasures recreate when shift content is unchanged. */
function activityShiftEntityKey(shift: ActivityShift): string {
  return [
    shift.type,
    shift.shiftFrom,
    shift.shiftTo,
    shift.need,
    shift.activity,
  ]
    .join("|")
    .slice(0, 200);
}

function QaFooter({ children }: { children: React.ReactNode }) {
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
}: {
  label: string;
  children: React.ReactNode;
  tone?: MetaChipTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${metaChipToneClass(tone)}`}
    >
      <span className="uppercase tracking-wide text-[10px] opacity-80">
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
}: {
  label: string;
  score: number | null | undefined;
}) {
  const display = score ?? "—";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs tabular-nums ${scoreStrengthClass(score)}`}
      title={`${label}: ${display} (1 weak → 7 strong)`}
    >
      <span className="uppercase tracking-wide text-[10px] opacity-80">
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

function ActivityShiftTeBlock({
  shift,
  reviewCtx,
}: {
  shift: ActivityShift;
  reviewCtx: ReviewContext;
}) {
  const [pendingAddSlotIds, setPendingAddSlotIds] = useState<string[]>([]);

  const shiftKey = activityShiftEntityKey(shift);
  const matchedIds = new Set(
    shift.transitionElementMatches.map((match) => match.stableId),
  );
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

  return (
    <div className="pl-3 border-l-2 border-gray-03 space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <MetaChip label="Shift type" tone="type">
          {shift.type}
        </MetaChip>
      </div>
      <p className="text-xs text-gray-02 break-words">
        {shift.shiftFrom} → {shift.shiftTo}{" "}
        <span className="text-gray-02/70">(need: {shift.need})</span>
      </p>
      {shift.transitionElementMatches.length === 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-02 italic">No matches</p>
          {canAddMore && (
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
                  onClick={requestAddSlot}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-blue-03">Add a TE match</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {shift.transitionElementMatches.map((match) => {
            const entityId = `${shiftKey}:${match.stableId}`;
            const entityKey = reviewKey(reviewCtx.step, "teMatch", entityId);
            return (
              <div
                key={match.stableId}
                className="rounded-md border border-gray-03/50 bg-gray-05/40 p-2 space-y-2 min-w-0"
              >
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${teConfidenceChipClass(match.matchConfidence, match.score)}`}
                  title={`${match.shortLabel} · ${match.matchConfidence} · ${match.score.toFixed(2)}`}
                >
                  <span className="break-words">{match.shortLabel}</span>
                  <span className="opacity-80 tabular-nums">
                    {match.score.toFixed(2)}
                  </span>
                </span>
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
                    onChanged={(next) =>
                      reviewCtx.onReviewChanged(next, entityKey)
                    }
                  />
                </QaFooter>
              </div>
            );
          })}
        </div>
      )}
      <TeMatchAddSlots
        shiftId={shiftKey}
        matchedIds={matchedIds}
        allCandidates={allCandidates}
        suggestedNew={suggestedNew}
        reviewCtx={reviewCtx}
        onRequestAddSlot={requestAddSlot}
        pendingSlotIds={pendingAddSlotIds}
      />
    </div>
  );
}

function TransitionElementsView({
  measures,
  reviewCtx,
}: {
  measures: ExtractedMeasure[];
  reviewCtx: ReviewContext;
}) {
  const withShifts = measures.filter(
    (m) => m.score && m.score.activityShifts.length > 0,
  );
  if (withShifts.length === 0) {
    return (
      <p className="text-sm text-gray-02">No activity shifts to match yet.</p>
    );
  }
  return (
    <div className="space-y-4">
      {withShifts.map((m) => (
        <div
          key={m.id}
          className="bg-gray-03/30 rounded-lg p-3 space-y-3 min-w-0"
        >
          <p className="text-sm text-gray-01 break-words">{m.measureText}</p>
          {m.score!.activityShifts.map((shift) => (
            <ActivityShiftTeBlock
              key={shift.id}
              shift={shift}
              reviewCtx={reviewCtx}
            />
          ))}
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${getClimatePlansPipelineApiUrl()}/plans/${planId}/rerun/${step}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      onRerun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rerun");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className="h-7 px-3 text-xs"
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        ) : (
          <RotateCw className="w-3 h-3 mr-1.5" />
        )}
        Rerun from here
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
}

function YesNo({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-gray-02">—</span>;
  return (
    <span className={value ? "text-green-03" : "text-pink-03"}>
      {value ? "Yes" : "No"}
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

function CommitmentsList({
  commitments,
  columns,
  reviewCtx,
}: {
  commitments: Commitment[];
  columns: "extract" | "climate" | "actionable" | "similar" | "themes";
  reviewCtx: ReviewContext;
}) {
  if (commitments.length === 0) {
    return <p className="text-sm text-gray-02">No commitments yet.</p>;
  }

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
    const groupOptions = [...groups.keys()];

    const renderCommitmentRow = (c: Commitment) => {
      const entityKey = reviewKey(
        reviewCtx.step,
        "commitment",
        commitmentEntityId(c),
      );
      return (
        <li key={c.id} className="min-w-0 space-y-1.5 px-3 py-2.5">
          <p className="text-sm text-gray-01 break-words">
            <span className="mr-2 font-mono text-[11px] text-gray-02">
              {c.stableId}
            </span>
            {c.text}
          </p>
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

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-02">
          {groups.size} duplicate group(s), {singletons.length} unique
          commitment(s) — QA is still per commitment
        </p>
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
      ...[...byTheme.keys()].filter(
        (key) =>
          key !== "(none)" &&
          !(COMMITMENT_THEME_OPTIONS as readonly string[]).includes(key),
      ),
    ];

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-02">
          Commitments grouped by theme — QA is still per commitment
        </p>
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
                {members.map((c) => {
                  const entityKey = reviewKey(
                    reviewCtx.step,
                    "commitment",
                    c.id,
                  );
                  return (
                    <li key={c.id} className="min-w-0 space-y-1.5 px-3 py-2.5">
                      <p className="text-sm text-gray-01 break-words">
                        <span className="mr-2 font-mono text-[11px] text-gray-02">
                          {c.stableId}
                        </span>
                        {c.text}
                      </p>
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
                          }}
                          review={reviewCtx.reviewsByEntity.get(entityKey)}
                          defaultSuggestedValue={{
                            theme: c.theme ?? "other",
                          }}
                          suggestEditor={themeSuggestEditor(
                            c.theme ?? "(none)",
                            themeOptions,
                          )}
                          onChanged={(next) =>
                            reviewCtx.onReviewChanged(next, entityKey)
                          }
                        />
                      </QaFooter>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {columns === "extract" && (
        <p className="text-xs text-gray-02">
          Pipeline checks whether each extracted quote can be found in the plan
          markdown. Review{" "}
          <span className="text-gray-01">Found in document</span> — Yes means
          the extraction is grounded; No means it looks invented or unfindable.
        </p>
      )}
      {commitments.map((c) => (
        <article
          key={c.id}
          className="rounded-lg border border-gray-03/50 bg-gray-03/20 p-3 min-w-0 space-y-2"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-xs text-gray-02">{c.stableId}</span>
            {columns === "extract" && (
              <>
                <MetaChip label="Type">{c.type}</MetaChip>
                <MetaChip
                  label="Found in document"
                  tone={c.unverified ? "type" : "relevance"}
                >
                  <YesNo value={!c.unverified} />
                </MetaChip>
              </>
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
      ))}
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

export function StepResultDialog({
  plan,
  step,
  runId,
  open,
  onOpenChange,
  onRerun,
}: StepResultDialogProps) {
  const { detail, isLoading, error, refresh } = useClimatePlanDetail(
    open ? (plan?.id ?? null) : null,
  );
  const [localReviews, setLocalReviews] = useState<Map<
    string,
    PipelineReview
  > | null>(null);

  const reviewsByEntity = useMemo(() => {
    if (localReviews) return localReviews;
    return indexReviewsByEntity(detail?.reviews ?? []);
  }, [detail?.reviews, localReviews]);

  const detailReviewsKey = detail?.reviews?.map((r) => r.id).join(",") ?? "";
  useEffect(() => {
    setLocalReviews(null);
  }, [detail?.id, detailReviewsKey]);

  if (!plan || !step) return null;

  const stepRuns = plan.pipelineSteps.filter((s) => s.step === step);
  const run = runId
    ? (stepRuns.find((s) => s.runId === runId) ?? stepRuns[0])
    : stepRuns[0];
  const previousRuns = stepRuns.slice(1);
  const itemCount = detail ? getStepItemCount(step, detail) : null;
  const viewingPastRun = Boolean(runId) && run !== stepRuns[0];

  const reviewCtx: ReviewContext = {
    planId: plan.id,
    step,
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

    switch (step) {
      case "extractMunicipality": {
        const entityKey = reviewKey(step, "municipality", plan.id);
        const snapshot = {
          extractedMunicipalityName: detail.extractedMunicipalityName,
          approvedMunicipalityName: detail.municipality?.name ?? null,
        };
        return (
          <div className="space-y-3 text-sm min-w-0">
            <div className="space-y-1">
              <p>
                <span className="text-gray-02">Extracted name: </span>
                <span className="text-gray-01 break-words">
                  {detail.extractedMunicipalityName ?? "—"}
                </span>
              </p>
              <p>
                <span className="text-gray-02">Approved municipality: </span>
                <span className="text-gray-01 break-words">
                  {detail.municipality?.name ?? "(not yet approved)"}
                </span>
              </p>
            </div>
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
        return (
          <CommitmentsList
            commitments={detail.commitments}
            columns="extract"
            reviewCtx={reviewCtx}
          />
        );
      case "filterCommitmentsClimate":
        return (
          <CommitmentsList
            commitments={detail.commitments}
            columns="climate"
            reviewCtx={reviewCtx}
          />
        );
      case "filterCommitmentsActionable":
        return (
          <CommitmentsList
            commitments={detail.commitments.filter((c) => c.climateRelevant)}
            columns="actionable"
            reviewCtx={reviewCtx}
          />
        );
      case "groupCommitmentsSimilar":
        return (
          <CommitmentsList
            commitments={detail.commitments.filter(
              (c) => c.climateRelevant && c.actionable,
            )}
            columns="similar"
            reviewCtx={reviewCtx}
          />
        );
      case "groupCommitmentsThemes":
        return (
          <CommitmentsList
            commitments={detail.commitments.filter(
              (c) => c.climateRelevant && c.actionable,
            )}
            columns="themes"
            reviewCtx={reviewCtx}
          />
        );
      case "extractMeasures":
        return (
          <MeasuresList
            measures={detail.extractedMeasures}
            columns="extract"
            reviewCtx={reviewCtx}
          />
        );
      case "scoreMeasures":
        return (
          <MeasuresList
            measures={detail.extractedMeasures}
            columns="score"
            reviewCtx={reviewCtx}
          />
        );
      case "matchTransitionElements":
        return (
          <TransitionElementsView
            measures={detail.extractedMeasures}
            reviewCtx={reviewCtx}
          />
        );
      default:
        return (
          <p className="text-sm text-gray-02">No details for this step.</p>
        );
    }
  })();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="6xl"
      scrollable
      title={
        <div className="flex flex-wrap items-center gap-3">
          <span>{step}</span>
          {itemCount !== null && (
            <span className="text-xs font-normal text-gray-02">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          )}
          <StatusPill
            label={run?.status ?? "pending"}
            status={toSwimlaneStatus(run?.status)}
            isActive={run?.status === "running"}
          />
          <RerunButton
            planId={plan.id}
            step={step}
            onRerun={() => {
              refresh();
              onRerun?.();
            }}
          />
        </div>
      }
      description={
        run ? (
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
              QA marks are an overlay — they do not change live pipeline
              outputs. Use the review board to export feedback for improving the
              pipeline.
            </span>
            <PreviousStepRuns runs={previousRuns} />
          </div>
        ) : (
          "This step hasn't run yet."
        )
      }
    >
      <div className="mt-4 min-w-0 overflow-x-hidden">{content}</div>
    </Modal>
  );
}
