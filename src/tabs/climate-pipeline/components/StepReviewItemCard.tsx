import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, SearchCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import type {
  ActivityShift,
  Commitment,
  ExtractedMeasure,
  TransitionElementMatch,
} from "../hooks/useClimatePlanDetail";
import {
  reviewKey,
  upsertPipelineReview,
  type PipelineReview,
} from "../hooks/usePipelineReviews";
import { useAuth } from "@/hooks/useAuth";
import { resolveQaReviewerForSave } from "../lib/qaReviewerIdentity";
import {
  activityShiftEntityKey,
  commitmentEntityId,
  measureEntityId,
  teMatchEntityId,
} from "../lib/stepReviewEntities";
import type { StepReviewItem } from "../lib/stepReviewQueue";
import {
  aiReviewHeadline,
  canonicalShiftType,
  legacyExportTag,
  matchMechanismLine,
  matchOutcomeLabel,
  shiftTypesAgree,
  tefCategoryOf,
} from "../lib/tef-match-display";
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

export interface ReviewCardContext {
  planId: string;
  step: string;
  reviewsByEntity: Map<string, PipelineReview>;
  onReviewChanged: (review: PipelineReview | null, key: string) => void;
  /** Advance the review queue after Looks good (skipped when filter removes the item). */
  onAdvanceAfterOk?: () => void;
}

export interface ReviewItemSlots {
  contextLabel: string;
  subProgress?: string;
  body: ReactNode;
  dock: ReactNode;
}

interface StepReviewItemCardProps {
  item: StepReviewItem;
  reviewCtx: ReviewCardContext;
  optionCommitments?: Commitment[];
  pdfMissingPhrases?: Set<string>;
  onFindInPdf?: (commitment: Commitment) => void;
  /** Jump the review queue to another entity (TE sibling matches). */
  onNavigateToEntityId?: (entityId: string) => void;
  children: (slots: ReviewItemSlots) => ReactNode;
}

function SoftChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        tone === "ok" && "border-green-03/40 bg-green-03/10 text-green-03",
        tone === "warn" && "border-orange-03/40 bg-orange-03/10 text-orange-03",
        tone === "info" && "border-blue-03/40 bg-blue-03/10 text-blue-03",
        tone === "neutral" && "border-gray-03 bg-gray-03/40 text-gray-01",
      )}
    >
      {children}
    </span>
  );
}

function Panel({
  label,
  children,
  tone = "neutral",
  className,
}: {
  label?: string;
  children: ReactNode;
  tone?: "neutral" | "match" | "shift" | "judge" | "ai";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-2 rounded-lg border px-3.5 py-3",
        tone === "match" && "border-blue-03/35 bg-blue-03/5",
        tone === "shift" && "border-gray-03/70 bg-gray-03/20",
        tone === "judge" && "border-green-03/30 bg-green-03/5",
        tone === "ai" && "border-purple-03/30 bg-purple-03/5",
        tone === "neutral" && "border-gray-03/60 bg-gray-03/15",
        className,
      )}
    >
      {label ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-02">
          {label}
        </p>
      ) : null}
      {children}
    </section>
  );
}

function JudgmentBand({
  items,
}: {
  items: Array<{ label: string; value: string; ok?: boolean }>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-lg border px-3 py-2.5",
            item.ok === true && "border-green-03/40 bg-green-03/10",
            item.ok === false && "border-orange-03/40 bg-orange-03/10",
            item.ok === undefined && "border-gray-03/60 bg-gray-03/20",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-02">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-lg font-semibold",
              item.ok === true && "text-green-03",
              item.ok === false && "text-orange-03",
              item.ok === undefined && "text-gray-01",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-03/60 bg-gray-03/20 px-3 py-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-02">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-gray-01">
        {value}
      </p>
    </div>
  );
}

/** Progressive disclosure for secondary evidence (IDs, long reasons, AI). */
function Details({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-blue-03 hover:text-blue-04 hover:underline"
      >
        {open ? "Hide" : "Show"} {label}
      </button>
      {open ? <div className="space-y-2">{children}</div> : null}
    </div>
  );
}

function commitmentSuggest(
  commitment: Commitment,
  columns: "extract" | "climate" | "actionable" | "similar" | "themes",
  optionsSource: Commitment[],
) {
  const groupOptions = [
    ...new Set(
      optionsSource
        .map((c) => c.similarGroupId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
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

  const suggestEditor =
    columns === "climate"
      ? climateFilterSuggestEditor({
          climateRelevant: commitment.climateRelevant,
          adaptation: commitment.adaptation,
        })
      : columns === "actionable"
        ? actionableFilterSuggestEditor(commitment.actionable)
        : columns === "similar"
          ? similarGroupSuggestEditor(commitment.similarGroupId, groupOptions)
          : columns === "themes"
            ? themeSuggestEditor(commitment.theme ?? "(none)", themeOptions)
            : extractCommitmentSuggestEditor({
                unverified: commitment.unverified,
              });

  const defaultSuggestedValue =
    columns === "climate"
      ? {
          climateRelevant: commitment.climateRelevant ?? false,
          adaptation: commitment.adaptation,
        }
      : columns === "actionable"
        ? { actionable: commitment.actionable ?? false }
        : columns === "similar"
          ? { similarGroupId: commitment.similarGroupId }
          : columns === "themes"
            ? { theme: commitment.theme ?? "other" }
            : { foundInDocument: !commitment.unverified };

  return { suggestEditor, defaultSuggestedValue };
}

function CommitmentDock({
  commitment,
  columns,
  reviewCtx,
  optionCommitments,
  dockExtra,
  dockHint,
}: {
  commitment: Commitment;
  columns: "extract" | "climate" | "actionable" | "similar" | "themes";
  reviewCtx: ReviewCardContext;
  optionCommitments?: Commitment[];
  dockExtra?: ReactNode;
  dockHint?: string;
}) {
  const entityId = commitmentEntityId(commitment);
  const entityKey = reviewKey(reviewCtx.step, "commitment", entityId);
  const { suggestEditor, defaultSuggestedValue } = commitmentSuggest(
    commitment,
    columns,
    optionCommitments ?? [commitment],
  );

  return (
    <div className="space-y-2">
      {dockHint ? (
        <p className="text-center text-[11px] text-gray-02">{dockHint}</p>
      ) : null}
      <ReviewControls
        variant="dock"
        planId={reviewCtx.planId}
        step={reviewCtx.step}
        entityType="commitment"
        entityId={entityId}
        reviewedSnapshot={{
          stableId: commitment.stableId,
          text: commitment.text,
          climateRelevant: commitment.climateRelevant,
          adaptation: commitment.adaptation,
          actionable: commitment.actionable,
          similarGroupId: commitment.similarGroupId,
          theme: commitment.theme,
          unverified: commitment.unverified,
          foundInDocument: !commitment.unverified,
        }}
        review={reviewCtx.reviewsByEntity.get(entityKey)}
        defaultSuggestedValue={defaultSuggestedValue}
        suggestEditor={suggestEditor}
        onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
        onAdvanceAfterOk={reviewCtx.onAdvanceAfterOk}
        dockExtra={dockExtra}
      />
    </div>
  );
}

/** Extract / climate / actionable — single commitment, judgment-first. */
function SingleCommitmentSlots({
  commitment,
  columns,
  reviewCtx,
  optionCommitments,
  pdfMissingPhrases,
  onFindInPdf,
  children,
}: {
  commitment: Commitment;
  columns: "extract" | "climate" | "actionable";
  reviewCtx: ReviewCardContext;
  optionCommitments?: Commitment[];
  pdfMissingPhrases?: Set<string>;
  onFindInPdf?: (commitment: Commitment) => void;
  children: (slots: ReviewItemSlots) => ReactNode;
}) {
  const contextLabel =
    columns === "climate"
      ? "Climate filter"
      : columns === "actionable"
        ? "Actionable filter"
        : "Extract commitment";

  const judgmentReason =
    columns === "climate"
      ? commitment.climateFilterReason
      : columns === "actionable"
        ? commitment.actionableReason
        : null;

  const body = (
    <div className="space-y-4">
      {columns === "climate" && (
        <JudgmentBand
          items={[
            {
              label: "Climate relevant",
              value: commitment.climateRelevant ? "Yes" : "No",
              ok: Boolean(commitment.climateRelevant),
            },
            {
              label: "Adaptation",
              value: commitment.adaptation ? "Yes" : "No",
              ok: commitment.adaptation ? true : undefined,
            },
          ]}
        />
      )}
      {columns === "actionable" && (
        <JudgmentBand
          items={[
            {
              label: "Actionable",
              value: commitment.actionable ? "Yes" : "No",
              ok: Boolean(commitment.actionable),
            },
          ]}
        />
      )}

      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <SoftChip tone={commitment.unverified ? "warn" : "ok"}>
            {commitment.unverified ? "Not in markdown" : "In markdown"}
          </SoftChip>
          {columns === "extract" && commitment.type && (
            <SoftChip>Type: {commitment.type}</SoftChip>
          )}
          {commitment.fromRecoveredImage && (
            <SoftChip tone="info">From image</SoftChip>
          )}
          {pdfMissingPhrases?.has(commitment.text) && (
            <SoftChip tone="warn">Not in PDF text</SoftChip>
          )}
          {!commitment.unverified && onFindInPdf && (
            <button
              type="button"
              onClick={() => onFindInPdf(commitment)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-03 px-2 py-1 text-xs text-gray-01 hover:bg-gray-03/40"
            >
              <SearchCheck className="h-3 w-3" />
              Find in PDF
            </button>
          )}
        </div>
        <p className="text-lg font-medium leading-snug text-gray-01 break-words whitespace-pre-wrap">
          {commitment.text}
        </p>
        <Details label="ID & source">
          <p className="font-mono text-[11px] text-gray-02">
            {commitment.stableId}
          </p>
          {commitment.section && (
            <p className="text-xs text-gray-02">
              Section: {commitment.section}
            </p>
          )}
          {commitment.originatesFrom && (
            <p className="text-xs text-gray-02">
              Originates from: {commitment.originatesFrom}
            </p>
          )}
        </Details>
      </Panel>

      {judgmentReason ? (
        <Details label="why this judgment">
          <Panel tone="judge">
            <p className="text-sm leading-relaxed text-gray-01 break-words">
              {judgmentReason}
            </p>
          </Panel>
        </Details>
      ) : null}
    </div>
  );

  return (
    <>
      {children({
        contextLabel,
        body,
        dock: (
          <CommitmentDock
            commitment={commitment}
            columns={columns}
            reviewCtx={reviewCtx}
            optionCommitments={optionCommitments}
          />
        ),
      })}
    </>
  );
}

/** Similar-step unique commitments — single quote, not a 1-row group. */
function UniqueCommitmentSlots({
  commitment,
  reviewCtx,
  optionCommitments,
  children,
}: {
  commitment: Commitment;
  reviewCtx: ReviewCardContext;
  optionCommitments?: Commitment[];
  children: (slots: ReviewItemSlots) => ReactNode;
}) {
  const body = (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <SoftChip tone="info">Unique</SoftChip>
          <SoftChip tone={commitment.unverified ? "warn" : "ok"}>
            {commitment.unverified ? "Not in markdown" : "In markdown"}
          </SoftChip>
        </div>
        <p className="text-lg font-medium leading-snug text-gray-01 break-words whitespace-pre-wrap">
          {commitment.text}
        </p>
        <Details label="ID & source">
          <p className="font-mono text-[11px] text-gray-02">
            {commitment.stableId}
          </p>
          {commitment.section && (
            <p className="text-xs text-gray-02">
              Section: {commitment.section}
            </p>
          )}
        </Details>
      </Panel>
    </div>
  );

  return (
    <>
      {children({
        contextLabel: "Unique commitment",
        body,
        dock: (
          <CommitmentDock
            commitment={commitment}
            columns="similar"
            reviewCtx={reviewCtx}
            optionCommitments={optionCommitments}
          />
        ),
      })}
    </>
  );
}

/**
 * Themes / similar: keep the whole group visible so you can compare
 * members. Select one row to Flag/Suggest; Approve-all covers the group.
 */
function GroupReviewSlots({
  groupLabel,
  columns,
  commitments,
  reviewCtx,
  optionCommitments,
  children,
}: {
  groupLabel: string;
  columns: "similar" | "themes";
  commitments: Commitment[];
  reviewCtx: ReviewCardContext;
  optionCommitments?: Commitment[];
  children: (slots: ReviewItemSlots) => ReactNode;
}) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => commitments[0]?.id ?? null,
  );
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    const stillThere = commitments.some((c) => c.id === selectedId);
    if (!stillThere) setSelectedId(commitments[0]?.id ?? null);
    setBulkError(null);
  }, [groupLabel, commitments, selectedId]);

  const memberStatuses = useMemo(
    () =>
      commitments.map((c) => {
        const key = reviewKey(
          reviewCtx.step,
          "commitment",
          commitmentEntityId(c),
        );
        return reviewCtx.reviewsByEntity.get(key)?.status;
      }),
    [commitments, reviewCtx.reviewsByEntity, reviewCtx.step],
  );

  const selected =
    commitments.find((c) => c.id === selectedId) ?? commitments[0] ?? null;
  const unreviewedCount = memberStatuses.filter((s) => s !== "OK").length;
  const okCount = memberStatuses.filter((s) => s === "OK").length;

  const approveAll = async () => {
    setBulkBusy(true);
    setBulkError(null);
    try {
      for (const c of commitments) {
        const entityId = commitmentEntityId(c);
        const key = reviewKey(reviewCtx.step, "commitment", entityId);
        const existing = reviewCtx.reviewsByEntity.get(key);
        if (existing?.status === "OK") continue;
        const saved = await upsertPipelineReview(reviewCtx.planId, {
          step: reviewCtx.step,
          entityType: "commitment",
          entityId,
          reviewedSnapshot: {
            stableId: c.stableId,
            text: c.text,
            similarGroupId: c.similarGroupId,
            theme: c.theme,
            unverified: c.unverified,
            foundInDocument: !c.unverified,
          },
          status: "OK",
          comment: existing?.comment ?? null,
          suggestedValue: existing?.suggestedValue,
          reviewedBy: resolveQaReviewerForSave(user),
        });
        reviewCtx.onReviewChanged(saved, key);
      }
    } catch (err) {
      setBulkError(
        err instanceof Error ? err.message : "Failed to approve group",
      );
    } finally {
      setBulkBusy(false);
    }
  };

  if (!selected) {
    return (
      <>{children({ contextLabel: groupLabel, body: null, dock: null })}</>
    );
  }

  const isTheme = columns === "themes";
  const contextLabel = isTheme
    ? `Theme · ${groupLabel}`
    : groupLabel === "Unique"
      ? "Unique commitment"
      : "Duplicate group";

  const body = (
    <div className="space-y-3">
      <p className="text-xs text-gray-02">
        <span className="font-semibold capitalize text-gray-01">
          {groupLabel}
        </span>
        {" · "}
        {commitments.length}{" "}
        {commitments.length === 1 ? "commitment" : "commitments"}
        {okCount > 0 ? ` · ${okCount} OK` : ""}
        {" · select a row to flag or reassign"}
      </p>

      <ul className="divide-y divide-gray-03/50 overflow-hidden rounded-lg border border-gray-03/70 bg-gray-04/40">
        {commitments.map((c, i) => {
          const status = memberStatuses[i];
          const isSelected = c.id === selected.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full gap-3 px-3 py-3 text-left transition-colors",
                  isSelected ? "bg-blue-03/10" : "hover:bg-gray-03/25",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold tabular-nums",
                    status === "OK" &&
                      "border-green-03/50 bg-green-03/15 text-green-03",
                    status &&
                      status !== "OK" &&
                      "border-orange-03/50 bg-orange-03/15 text-orange-03",
                    !status &&
                      isSelected &&
                      "border-blue-03/50 bg-blue-03/15 text-blue-03",
                    !status &&
                      !isSelected &&
                      "border-gray-03 bg-gray-03/30 text-gray-02",
                  )}
                >
                  {status === "OK" ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-gray-02">
                      {c.stableId}
                    </span>
                    {c.unverified && (
                      <SoftChip tone="warn">Not in markdown</SoftChip>
                    )}
                    {status && status !== "OK" && (
                      <SoftChip tone="warn">
                        {status.replace("_", " ")}
                      </SoftChip>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm leading-snug text-gray-01 break-words whitespace-pre-wrap",
                      !isSelected && "line-clamp-2",
                    )}
                  >
                    {c.text}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const dockExtra = (
    <div className="space-y-1 pt-1">
      {commitments.length > 1 && unreviewedCount > 0 && (
        <Button
          type="button"
          className="h-11 w-full gap-2 text-sm font-semibold bg-green-03/20 text-green-03 hover:bg-green-03/30"
          disabled={bulkBusy}
          onClick={approveAll}
        >
          {bulkBusy ? (
            "Approving…"
          ) : (
            <>
              <Check className="h-4 w-4" />
              {isTheme
                ? `Approve theme (${unreviewedCount} left)`
                : `Approve group (${unreviewedCount} left)`}
            </>
          )}
        </Button>
      )}
      {bulkError && <p className="text-xs text-pink-03">{bulkError}</p>}
    </div>
  );

  return (
    <>
      {children({
        contextLabel,
        subProgress:
          commitments.length > 1
            ? `${okCount}/${commitments.length} verified · editing ${selected.stableId}`
            : undefined,
        body,
        dock: (
          <CommitmentDock
            commitment={selected}
            columns={columns}
            reviewCtx={reviewCtx}
            optionCommitments={optionCommitments}
            dockHint={
              commitments.length > 1
                ? `Dock applies to selected: ${selected.stableId}`
                : undefined
            }
            dockExtra={dockExtra}
          />
        ),
      })}
    </>
  );
}

function MeasureSlots({
  measure,
  columns,
  reviewCtx,
  children,
}: {
  measure: ExtractedMeasure;
  columns: "extract" | "score";
  reviewCtx: ReviewCardContext;
  children: (slots: ReviewItemSlots) => ReactNode;
}) {
  const entityId = measureEntityId(measure);
  const entityKey = reviewKey(reviewCtx.step, "measure", entityId);
  const snapshot =
    columns === "extract"
      ? {
          measureText: measure.measureText,
          climateRelevanceScore: measure.climateRelevanceScore,
        }
      : {
          measureText: measure.measureText,
          activityShiftScore: measure.score?.activityShiftScore ?? null,
          interventionScore: measure.score?.interventionScore ?? null,
          interventionType: measure.score?.interventionType ?? null,
        };

  const shifts = measure.score?.activityShifts ?? [];

  const body =
    columns === "extract" ? (
      <div className="space-y-4">
        <JudgmentBand
          items={[
            {
              label: "Climate relevance",
              value: String(measure.climateRelevanceScore ?? "—"),
              ok:
                measure.climateRelevanceScore === "high"
                  ? true
                  : measure.climateRelevanceScore === "low"
                    ? false
                    : undefined,
            },
          ]}
        />
        <Panel label="Measure">
          <p className="text-lg font-medium leading-snug text-gray-01 break-words whitespace-pre-wrap">
            {measure.measureText}
          </p>
        </Panel>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <ScoreTile
            label="Activity shift"
            value={measure.score?.activityShiftScore ?? "—"}
          />
          <ScoreTile
            label="Intervention"
            value={measure.score?.interventionScore ?? "—"}
          />
          <ScoreTile
            label="Type"
            value={
              <span className="text-base font-semibold">
                {measure.score?.interventionType ?? "—"}
              </span>
            }
          />
        </div>
        <Panel label="Measure">
          <p className="text-lg font-medium leading-snug text-gray-01 break-words whitespace-pre-wrap">
            {measure.measureText}
          </p>
        </Panel>
        {shifts.length > 0 ? (
          <Details
            label={
              shifts.length === 1
                ? "1 activity shift"
                : `${shifts.length} activity shifts`
            }
          >
            <ul className="space-y-1.5">
              {shifts.slice(0, 5).map((shift) => (
                <li
                  key={activityShiftEntityKey(shift)}
                  className="text-sm text-gray-01 break-words"
                >
                  <span className="font-medium">
                    {shift.shiftFrom} → {shift.shiftTo}
                  </span>
                  <span className="text-xs text-gray-02">
                    {" · "}
                    {canonicalShiftType(shift.type)} · {shift.score}
                  </span>
                </li>
              ))}
            </ul>
          </Details>
        ) : null}
      </div>
    );

  const dock = (
    <ReviewControls
      variant="dock"
      planId={reviewCtx.planId}
      step={reviewCtx.step}
      entityType="measure"
      entityId={entityId}
      reviewedSnapshot={snapshot}
      review={reviewCtx.reviewsByEntity.get(entityKey)}
      defaultSuggestedValue={snapshot}
      onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
      onAdvanceAfterOk={reviewCtx.onAdvanceAfterOk}
    />
  );

  return (
    <>
      {children({
        contextLabel: columns === "score" ? "Score measure" : "Extract measure",
        body,
        dock,
      })}
    </>
  );
}

/** Sticky measure + activity-shift strip shared by matched and unmatched TEF review. */
function TefStickyContext({
  measureText,
  shiftFrom,
  shiftTo,
  shiftType,
  score,
  outcome,
}: {
  measureText: string;
  shiftFrom: string;
  shiftTo: string;
  shiftType: string;
  score: number | string;
  outcome?: string | null;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-1 space-y-2 rounded-lg border border-gray-03/70 bg-gray-04/95 px-3.5 py-3 backdrop-blur">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-02">
          Measure
        </p>
        <p className="text-lg font-normal leading-snug text-gray-01 break-words whitespace-pre-wrap">
          {measureText}
        </p>
      </div>
      <div className="space-y-1 border-t border-gray-03/50 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-02">
          Activity shift
        </p>
        <p className="text-base font-normal leading-snug text-gray-01 break-words">
          {shiftFrom} → {shiftTo}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <SoftChip>Ours: {canonicalShiftType(shiftType)}</SoftChip>
          <SoftChip>Score: {score}</SoftChip>
          {outcome ? <SoftChip tone="info">{outcome}</SoftChip> : null}
        </div>
      </div>
    </div>
  );
}

function TeMatchSlots({
  measure,
  shift,
  match,
  reviewCtx,
  onNavigateToEntityId,
  children,
}: {
  measure: ExtractedMeasure;
  shift: ActivityShift;
  match: TransitionElementMatch;
  reviewCtx: ReviewCardContext;
  onNavigateToEntityId?: (entityId: string) => void;
  children: (slots: ReviewItemSlots) => ReactNode;
}) {
  const shiftKey = activityShiftEntityKey(shift);
  const entityId = teMatchEntityId(shift, match.stableId);
  const entityKey = reviewKey(reviewCtx.step, "teMatch", entityId);
  const category = tefCategoryOf(match);
  const legacy = legacyExportTag(match);
  const mechanism = matchMechanismLine(match);
  const outcome = matchOutcomeLabel(
    shift.transitionElementGroupKind,
    shift.transitionElementGateDomain,
    shift.transitionElementGroupLabel,
  );
  const categoryAgrees =
    category != null && shiftTypesAgree(category, shift.type);
  const allCandidates = (shift.transitionElementCandidates ?? []).map((c) => ({
    stableId: c.stableId,
    shortLabel: c.shortLabel,
    score: c.score,
  }));

  const siblings = shift.transitionElementMatches;
  const matchIndex = Math.max(
    0,
    siblings.findIndex((m) => m.stableId === match.stableId),
  );
  const matchCount = siblings.length;

  const body = (
    <div className="space-y-3">
      <TefStickyContext
        measureText={measure.measureText}
        shiftFrom={shift.shiftFrom}
        shiftTo={shift.shiftTo}
        shiftType={shift.type}
        score={shift.score}
        outcome={outcome}
      />

      {matchCount > 1 && (
        <div className="space-y-2 rounded-lg border border-blue-03/35 bg-blue-03/5 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-blue-03">
              {matchCount} TEF matches on this shift
            </p>
            <p className="text-xs tabular-nums text-gray-02">
              {matchIndex + 1} of {matchCount}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {siblings.map((sibling, i) => {
              const siblingId = teMatchEntityId(shift, sibling.stableId);
              const siblingKey = reviewKey(
                reviewCtx.step,
                "teMatch",
                siblingId,
              );
              const siblingStatus =
                reviewCtx.reviewsByEntity.get(siblingKey)?.status;
              const isCurrent = sibling.stableId === match.stableId;
              return (
                <button
                  key={sibling.stableId}
                  type="button"
                  disabled={isCurrent || !onNavigateToEntityId}
                  onClick={() => onNavigateToEntityId?.(siblingId)}
                  className={cn(
                    "flex min-w-0 w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
                    isCurrent
                      ? "border-blue-03/60 bg-blue-03/15 text-gray-01"
                      : "border-gray-03/60 bg-gray-04/40 text-gray-02 hover:border-blue-03/40 hover:bg-blue-03/10 hover:text-gray-01",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-semibold tabular-nums",
                      siblingStatus === "OK" &&
                        "border-green-03/50 bg-green-03/15 text-green-03",
                      siblingStatus &&
                        siblingStatus !== "OK" &&
                        "border-orange-03/50 bg-orange-03/15 text-orange-03",
                      !siblingStatus &&
                        isCurrent &&
                        "border-blue-03/50 bg-blue-03/20 text-blue-03",
                      !siblingStatus &&
                        !isCurrent &&
                        "border-gray-03 text-gray-02",
                    )}
                  >
                    {siblingStatus === "OK" ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug break-words text-gray-01">
                      {sibling.shortLabel}
                    </span>
                    <span className="font-mono text-[10px] text-gray-02">
                      {sibling.matchConfidence} · {sibling.score.toFixed(2)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Panel tone="match">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-03">
          TEF match
        </p>
        <p className="text-2xl font-semibold leading-tight text-gray-01 break-words">
          {match.shortLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          <SoftChip
            tone={
              match.matchConfidence === "high"
                ? "ok"
                : match.matchConfidence === "mid"
                  ? "info"
                  : "neutral"
            }
          >
            {match.matchConfidence} · {match.score.toFixed(2)}
          </SoftChip>
          {match.explicit !== undefined && (
            <SoftChip tone={match.explicit ? "ok" : "neutral"}>
              {match.explicit ? "explicit" : "implied"}
            </SoftChip>
          )}
          {category && (
            <SoftChip tone={categoryAgrees ? "ok" : "warn"}>
              TEF: {canonicalShiftType(category)}
              {!categoryAgrees ? " ≠ our shift" : ""}
            </SoftChip>
          )}
        </div>
      </Panel>

      <Details label="match details">
        <p className="font-mono text-[11px] text-gray-02">{match.stableId}</p>
        {match.sectorPath && (
          <p className="text-xs text-gray-02 break-words">{match.sectorPath}</p>
        )}
        {legacy && <SoftChip>Legacy: {legacy}</SoftChip>}
        <p className="text-xs text-gray-02 break-words">
          Activity: {shift.activity} · Need: {shift.need}
          {shift.transitionElementGateDomain
            ? ` · Domain: ${shift.transitionElementGateDomain}`
            : ""}
        </p>
        {shift.typeReasoning && (
          <p className="text-sm italic leading-relaxed text-gray-02 break-words">
            {shift.typeReasoning}
          </p>
        )}
        {mechanism && (
          <div className="rounded-md border border-blue-03/20 bg-gray-04/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-02">
              Why this match
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-01 break-words">
              {mechanism}
            </p>
          </div>
        )}
        {shift.aiReviewCategory && (
          <Panel label="AI second opinion" tone="ai">
            <p className="text-sm font-medium text-gray-01">
              {aiReviewHeadline(shift.aiReviewCategory)}
            </p>
            {shift.aiReviewExplanation && (
              <p className="text-sm leading-relaxed text-gray-02 break-words">
                {shift.aiReviewExplanation}
              </p>
            )}
          </Panel>
        )}
      </Details>
    </div>
  );

  const dock = (
    <ReviewControls
      variant="dock"
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
      onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
      onAdvanceAfterOk={reviewCtx.onAdvanceAfterOk}
    />
  );

  return (
    <>
      {children({
        contextLabel: "TEF match",
        subProgress:
          matchCount > 1
            ? `Match ${matchIndex + 1} of ${matchCount} on this shift`
            : undefined,
        body,
        dock,
      })}
    </>
  );
}

function existingTeMatchAddIds(
  shiftKey: string,
  reviewCtx: ReviewCardContext,
): string[] {
  const ids: string[] = [];
  for (const review of reviewCtx.reviewsByEntity.values()) {
    if (review.step !== reviewCtx.step || review.entityType !== "teMatchAdd") {
      continue;
    }
    if (
      review.entityId === shiftKey ||
      review.entityId.startsWith(`${shiftKey}:add:`)
    ) {
      ids.push(review.entityId);
    }
  }
  return ids;
}

function TeUnmatchedSlots({
  measure,
  shift,
  reviewCtx,
  children,
}: {
  measure: ExtractedMeasure;
  shift: ActivityShift;
  reviewCtx: ReviewCardContext;
  children: (slots: ReviewItemSlots) => ReactNode;
}) {
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
  const [pendingSlotIds, setPendingSlotIds] = useState<string[]>([]);

  const addEntityIds = useMemo(() => {
    const ids = existingTeMatchAddIds(shiftKey, reviewCtx);
    for (const slotId of pendingSlotIds) {
      const entityId = `${shiftKey}:add:${slotId}`;
      if (!ids.includes(entityId)) ids.push(entityId);
    }
    // Always keep one primary add slot so the sticky dock can suggest a TE.
    if (ids.length === 0) ids.push(`${shiftKey}:add:review`);
    return ids;
  }, [shiftKey, reviewCtx, pendingSlotIds]);

  const claimedStableIds = new Set<string>();
  let suggestedNewClaimed = false;
  for (const entityId of addEntityIds) {
    const review = reviewCtx.reviewsByEntity.get(
      reviewKey(reviewCtx.step, "teMatchAdd", entityId),
    );
    if (!isTeMatchAddSuggestion(review?.suggestedValue)) continue;
    if (review.suggestedValue.selectedStableId) {
      claimedStableIds.add(review.suggestedValue.selectedStableId);
    }
    if (review.suggestedValue.isSuggestedNew) suggestedNewClaimed = true;
  }

  const addableCandidates = allCandidates.filter(
    (c) => !matchedIds.has(c.stableId) && !claimedStableIds.has(c.stableId),
  );
  const canUseSuggestedNew = Boolean(suggestedNew) && !suggestedNewClaimed;

  const primaryEntityId = addEntityIds[0]!;
  const extraEntityIds = addEntityIds.slice(1);
  const outcome = matchOutcomeLabel(
    shift.transitionElementGroupKind,
    shift.transitionElementGateDomain,
    shift.transitionElementGroupLabel,
  );

  const defaultAddValue = (selectedInThis: string | null) => {
    const preferred =
      addableCandidates.find((c) => c.stableId === selectedInThis) ??
      addableCandidates[0];
    if (preferred) {
      return {
        action: "add" as const,
        selectedStableId: preferred.stableId,
        selectedShortLabel: preferred.shortLabel,
      };
    }
    if (canUseSuggestedNew && suggestedNew) {
      return {
        action: "add" as const,
        selectedStableId: null,
        selectedShortLabel: suggestedNew.shortLabel,
        selectedDescription: suggestedNew.description,
        isSuggestedNew: true,
      };
    }
    return {
      action: "add" as const,
      selectedStableId: null,
      selectedShortLabel: "",
      isSuggestedNew: true,
    };
  };

  const dismissPendingSlot = (entityId: string) => {
    const prefix = `${shiftKey}:add:`;
    if (!entityId.startsWith(prefix)) return;
    const slotId = entityId.slice(prefix.length);
    setPendingSlotIds((ids) => ids.filter((id) => id !== slotId));
  };

  const renderAddControls = (
    entityId: string,
    variant: "dock" | "inline",
    { dismissWhenUnsaved }: { dismissWhenUnsaved: boolean },
  ) => {
    const entityKey = reviewKey(reviewCtx.step, "teMatchAdd", entityId);
    const review = reviewCtx.reviewsByEntity.get(entityKey);
    const selectedInThis =
      isTeMatchAddSuggestion(review?.suggestedValue) &&
      review.suggestedValue.selectedStableId
        ? review.suggestedValue.selectedStableId
        : null;
    const slotCandidates = allCandidates.filter(
      (c) =>
        !matchedIds.has(c.stableId) &&
        (!claimedStableIds.has(c.stableId) || c.stableId === selectedInThis),
    );
    const slotCanUseSuggestedNew =
      Boolean(suggestedNew) &&
      (!suggestedNewClaimed ||
        (isTeMatchAddSuggestion(review?.suggestedValue) &&
          review.suggestedValue.isSuggestedNew));

    return (
      <ReviewControls
        variant={variant}
        planId={reviewCtx.planId}
        step={reviewCtx.step}
        entityType="teMatchAdd"
        entityId={entityId}
        reviewedSnapshot={{
          activityShiftId: shiftKey,
          currentMatchIds: [...matchedIds],
          addableCandidates: slotCandidates,
          suggestedNew: slotCanUseSuggestedNew ? suggestedNew : null,
        }}
        review={review}
        initialPanel={review ? null : "suggest"}
        defaultSuggestedValue={defaultAddValue(selectedInThis)}
        suggestEditor={teMatchAddEditor({
          candidates: slotCandidates,
          suggestedNew: slotCanUseSuggestedNew ? suggestedNew : null,
        })}
        showOk={false}
        onAdd={() => setPendingSlotIds((ids) => [...ids, crypto.randomUUID()])}
        addTitle="Add another TE match"
        onDismissUnsaved={
          dismissWhenUnsaved ? () => dismissPendingSlot(entityId) : undefined
        }
        onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
      />
    );
  };

  const statusBits = [
    "No TEF match",
    outcome,
    shift.aiReviewCategory ? aiReviewHeadline(shift.aiReviewCategory) : null,
    suggestedNew ? `Suggested: ${suggestedNew.shortLabel}` : null,
    allCandidates.length > 0
      ? `${allCandidates.length} candidate${allCandidates.length === 1 ? "" : "s"} in Add TEF`
      : null,
  ].filter(Boolean);

  const body = (
    <div className="space-y-3">
      <TefStickyContext
        measureText={measure.measureText}
        shiftFrom={shift.shiftFrom}
        shiftTo={shift.shiftTo}
        shiftType={shift.type}
        score={shift.score}
        outcome={outcome}
      />

      <Panel
        className="border-dashed border-orange-03/40 bg-orange-03/5"
        tone="judge"
      >
        <p className="text-base font-semibold text-orange-03 break-words">
          {statusBits.join(" · ")}
        </p>
        <p className="text-sm text-gray-02">
          Use Add TEF in the dock to attach a candidate, accept a suggested new
          TE, or propose your own label.
        </p>
      </Panel>

      {(shift.aiReviewExplanation ||
        suggestedNew?.description ||
        shift.typeReasoning) && (
        <Details label="context">
          <p className="text-xs text-gray-02 break-words">
            Activity: {shift.activity} · Need: {shift.need}
          </p>
          {shift.typeReasoning && (
            <p className="text-sm italic text-gray-02 break-words">
              {shift.typeReasoning}
            </p>
          )}
          {suggestedNew?.description && (
            <p className="text-sm text-gray-02 break-words">
              Suggested new: {suggestedNew.description}
            </p>
          )}
          {shift.aiReviewExplanation && (
            <p className="text-sm text-gray-02 break-words">
              {shift.aiReviewExplanation}
            </p>
          )}
        </Details>
      )}

      {extraEntityIds.map((entityId) => {
        const review = reviewCtx.reviewsByEntity.get(
          reviewKey(reviewCtx.step, "teMatchAdd", entityId),
        );
        const isPendingExtra = pendingSlotIds.some(
          (slotId) => `${shiftKey}:add:${slotId}` === entityId,
        );
        // Pending extras with no saved review only exist while editing —
        // once dismissed they leave pendingSlotIds and disappear.
        const label =
          isTeMatchAddSuggestion(review?.suggestedValue) &&
          review.suggestedValue.selectedShortLabel
            ? review.suggestedValue.selectedShortLabel
            : null;
        return (
          <div
            key={entityId}
            className="rounded-lg border border-dashed border-blue-03/40 bg-blue-03/5 p-3 space-y-2"
          >
            <p className="text-xs font-semibold text-blue-03">
              Suggested add{label ? `: ${label}` : ""}
            </p>
            {renderAddControls(entityId, "inline", {
              dismissWhenUnsaved: isPendingExtra,
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {children({
        contextLabel: "Unmatched shift",
        body,
        dock: renderAddControls(primaryEntityId, "dock", {
          // Primary dock slot stays; only extra pending boxes dismiss.
          dismissWhenUnsaved: false,
        }),
      })}
    </>
  );
}

/**
 * Per-worker review-mode layouts. List view must not use this — it only
 * feeds the sticky-dock session via render props.
 */
export function StepReviewItemCard({
  item,
  reviewCtx,
  optionCommitments,
  pdfMissingPhrases,
  onFindInPdf,
  onNavigateToEntityId,
  children,
}: StepReviewItemCardProps) {
  switch (item.kind) {
    case "commitment":
      return (
        <SingleCommitmentSlots
          commitment={item.commitment}
          columns={item.columns as "extract" | "climate" | "actionable"}
          reviewCtx={reviewCtx}
          optionCommitments={optionCommitments}
          pdfMissingPhrases={pdfMissingPhrases}
          onFindInPdf={onFindInPdf}
        >
          {children}
        </SingleCommitmentSlots>
      );
    case "commitmentGroup":
      // Unique singletons are just one commitment — use the focused single
      // layout instead of a one-row group list.
      if (
        item.groupLabel === "Unique" &&
        item.commitments.length === 1 &&
        item.commitments[0]
      ) {
        return (
          <UniqueCommitmentSlots
            commitment={item.commitments[0]}
            reviewCtx={reviewCtx}
            optionCommitments={optionCommitments}
          >
            {children}
          </UniqueCommitmentSlots>
        );
      }
      return (
        <GroupReviewSlots
          groupLabel={item.groupLabel}
          columns={item.columns}
          commitments={item.commitments}
          reviewCtx={reviewCtx}
          optionCommitments={optionCommitments}
        >
          {children}
        </GroupReviewSlots>
      );
    case "measure":
      return (
        <MeasureSlots
          measure={item.measure}
          columns={item.columns}
          reviewCtx={reviewCtx}
        >
          {children}
        </MeasureSlots>
      );
    case "teMatch":
      return (
        <TeMatchSlots
          measure={item.measure}
          shift={item.shift}
          match={item.match}
          reviewCtx={reviewCtx}
          onNavigateToEntityId={onNavigateToEntityId}
        >
          {children}
        </TeMatchSlots>
      );
    case "teUnmatched":
      return (
        <TeUnmatchedSlots
          measure={item.measure}
          shift={item.shift}
          reviewCtx={reviewCtx}
        >
          {children}
        </TeUnmatchedSlots>
      );
    default:
      return null;
  }
}
