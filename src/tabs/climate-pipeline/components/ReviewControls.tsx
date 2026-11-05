import { useEffect, useState, type ReactNode } from "react";
import { Check, MessageSquare, Pencil, Plus, Loader2, X } from "lucide-react";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  deletePipelineReview,
  upsertPipelineReview,
  type PipelineReview,
  type ReviewStatus,
} from "../hooks/usePipelineReviews";
import { resolveQaReviewerForSave } from "../lib/qaReviewerIdentity";
import { isTeMatchAddSuggestion } from "./structuredSuggestEditors";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export interface SuggestEditorConfig {
  title: string;
  getInitialDraft: (
    review: PipelineReview | undefined,
    defaultSuggestedValue: unknown,
  ) => unknown;
  render: (args: {
    draft: unknown;
    setDraft: (value: unknown) => void;
  }) => ReactNode;
}

interface ReviewControlsProps {
  planId: string;
  step: string;
  entityType: string;
  entityId: string;
  reviewedSnapshot: unknown;
  review: PipelineReview | undefined;
  /** Optional starter value for the suggestion editor (step-specific). */
  defaultSuggestedValue?: unknown;
  /** When set, pencil opens this structured editor instead of raw JSON. */
  suggestEditor?: SuggestEditorConfig;
  /** Optional fourth control — e.g. add another TE match on this shift. */
  onAdd?: () => void;
  addTitle?: string;
  addActive?: boolean;
  addDisabled?: boolean;
  /** When false, hide the OK/check control (e.g. TE add slots). Default true. */
  showOk?: boolean;
  /** Open comment/suggest panel on mount (e.g. newly added TE slot). */
  initialPanel?: "comment" | "suggest" | null;
  /**
   * Called when the editor is closed without a saved review — used to drop
   * ephemeral "add another" slots so empty dashed boxes don't linger.
   */
  onDismissUnsaved?: () => void;
  onChanged: (review: PipelineReview | null) => void;
  /** After a successful Looks good save — e.g. advance the review queue. */
  onAdvanceAfterOk?: () => void;
  /**
   * `inline` = compact icon row (list view).
   * `dock` = large sticky action buttons (review mode).
   */
  variant?: "inline" | "dock";
  /** Extra actions rendered under the dock buttons (e.g. approve whole group). */
  dockExtra?: ReactNode;
}

function statusTone(status: ReviewStatus | undefined): string {
  switch (status) {
    case "OK":
      return "text-green-03";
    case "ISSUE":
      return "text-orange-03";
    case "SUGGESTED_FIX":
      return "text-blue-03";
    default:
      return "text-gray-02";
  }
}

export function ReviewControls({
  planId,
  step,
  entityType,
  entityId,
  reviewedSnapshot,
  review,
  defaultSuggestedValue,
  suggestEditor,
  onAdd,
  addTitle = "Add another",
  addActive = false,
  addDisabled = false,
  showOk = true,
  initialPanel = null,
  onDismissUnsaved,
  onChanged,
  onAdvanceAfterOk,
  variant = "inline",
  dockExtra,
}: ReviewControlsProps) {
  const [panel, setPanel] = useState<"comment" | "suggest" | null>(
    initialPanel,
  );
  const [comment, setComment] = useState(review?.comment ?? "");
  const [suggestedText, setSuggestedText] = useState(() =>
    JSON.stringify(
      review?.suggestedValue ?? defaultSuggestedValue ?? {},
      null,
      2,
    ),
  );
  const [suggestDraft, setSuggestDraft] = useState<unknown>(
    () => review?.suggestedValue ?? defaultSuggestedValue ?? {},
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const closePanel = () => {
    setPanel(null);
    setError(null);
    // Ephemeral add slots only exist while editing — drop them if nothing
    // was saved so empty "Suggested add" chrome doesn't pile up.
    if (!review) onDismissUnsaved?.();
  };

  const save = async (input: {
    status: ReviewStatus;
    comment?: string | null;
    suggestedValue?: unknown;
  }): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await upsertPipelineReview(planId, {
        step,
        entityType,
        entityId,
        reviewedSnapshot,
        status: input.status,
        comment: input.comment ?? null,
        suggestedValue: input.suggestedValue,
        reviewedBy: resolveQaReviewerForSave(user),
      });
      onChanged(saved);
      setPanel(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const clearReview = async () => {
    if (!review) return;
    setIsSaving(true);
    setError(null);
    try {
      await deletePipelineReview(review.id);
      onChanged(null);
      setPanel(null);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear review");
    } finally {
      setIsSaving(false);
    }
  };

  const markOk = async () => {
    if (review?.status === "OK" && !review.comment) {
      await clearReview();
      return;
    }
    // Keep any existing suggestion — marking OK must not wipe SUGGESTED_FIX data.
    const ok = await save({
      status: "OK",
      comment: review?.comment ?? null,
      suggestedValue: review?.suggestedValue,
    });
    if (ok) onAdvanceAfterOk?.();
  };

  const saveComment = async () => {
    const trimmed = comment.trim();
    if (!trimmed) {
      if (!review) {
        setError("Comment cannot be empty for an issue");
        return;
      }
      // Allow clearing notes on existing reviews without deleting the judgment.
      await save({
        status: review.status,
        comment: null,
        suggestedValue: review.suggestedValue,
      });
      return;
    }
    const nextStatus: ReviewStatus =
      review?.status === "SUGGESTED_FIX"
        ? "SUGGESTED_FIX"
        : review?.status === "OK"
          ? "OK"
          : "ISSUE";
    await save({
      status: nextStatus,
      comment: trimmed,
      suggestedValue: review?.suggestedValue,
    });
  };

  const saveSuggestion = async () => {
    if (suggestEditor) {
      if (isTeMatchAddSuggestion(suggestDraft)) {
        const hasStable = Boolean(suggestDraft.selectedStableId);
        const hasLabel = Boolean(suggestDraft.selectedShortLabel?.trim());
        // isSuggestedNew alone is not enough — empty custom drafts must not save.
        if (!hasStable && !hasLabel) {
          setError("Select or describe a transition element to add");
          return;
        }
      }
      await save({
        status: "SUGGESTED_FIX",
        comment: comment.trim() || review?.comment || null,
        suggestedValue: suggestDraft,
      });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(suggestedText);
    } catch {
      setError("Suggestion must be valid JSON");
      return;
    }
    await save({
      status: "SUGGESTED_FIX",
      comment: comment.trim() || review?.comment || null,
      suggestedValue: parsed,
    });
  };

  const openSuggest = () => {
    if (panel === "suggest") {
      closePanel();
      return;
    }
    setComment(review?.comment ?? "");
    if (suggestEditor) {
      setSuggestDraft(
        suggestEditor.getInitialDraft(review, defaultSuggestedValue),
      );
    } else {
      setSuggestedText(
        JSON.stringify(
          review?.suggestedValue ?? defaultSuggestedValue ?? {},
          null,
          2,
        ),
      );
    }
    setPanel("suggest");
  };

  const openComment = () => {
    if (panel === "comment") {
      closePanel();
      return;
    }
    setComment(review?.comment ?? "");
    setPanel("comment");
  };

  // Dock shortcuts: 1 Looks good · 2 Flag · 3 Suggest/Add TEF.
  // Disabled while a panel is open or the user is typing in a field.
  useEffect(() => {
    if (variant !== "dock") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (panel !== null) return;
      if (isSaving) return;
      if (isTypingTarget(event.target)) return;
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === "1" && showOk) {
        event.preventDefault();
        void markOk();
      } else if (event.key === "2") {
        event.preventDefault();
        openComment();
      } else if (event.key === "3") {
        event.preventDefault();
        openSuggest();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // markOk/openComment/openSuggest close over latest state via this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dock hotkeys
  }, [variant, panel, isSaving, showOk, review, suggestDraft, comment]);

  const panelBlock = panel ? (
    <div className="w-full rounded-md border border-gray-03 bg-gray-05 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-01">
          {panel === "comment"
            ? "Comment"
            : (suggestEditor?.title ?? "Suggested fix (JSON)")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-02 shrink-0"
          onClick={closePanel}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {(panel === "comment" || panel === "suggest") && (
        <textarea
          className="w-full min-h-[4rem] rounded border border-gray-03 bg-gray-04/40 px-2 py-1 text-xs text-gray-01"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional note for pipeline improvement"
        />
      )}
      {panel === "suggest" &&
        (suggestEditor ? (
          suggestEditor.render({
            draft: suggestDraft,
            setDraft: setSuggestDraft,
          })
        ) : (
          <textarea
            className="w-full min-h-[6rem] rounded border border-gray-03 bg-gray-04/40 px-2 py-1 font-mono text-xs text-gray-01"
            value={suggestedText}
            onChange={(e) => setSuggestedText(e.target.value)}
          />
        ))}
      {error && <p className="text-xs text-pink-03">{error}</p>}
      <div className="flex justify-end gap-1">
        {review && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={isSaving}
            onClick={clearReview}
          >
            Clear
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          disabled={isSaving}
          onClick={panel === "comment" ? saveComment : saveSuggestion}
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  ) : null;

  if (variant === "dock") {
    return (
      <div className="w-full min-w-0 space-y-2">
        {panelBlock}
        {error && !panel && <p className="text-xs text-pink-03">{error}</p>}
        {review?.comment && !panel && (
          <p className="truncate text-xs text-gray-02">“{review.comment}”</p>
        )}
        <div
          className={cn("grid gap-2", showOk ? "grid-cols-3" : "grid-cols-2")}
        >
          {showOk && (
            <Button
              type="button"
              className={cn(
                "h-12 gap-2 text-sm font-semibold",
                review?.status === "OK"
                  ? "bg-green-03 text-gray-05 hover:bg-green-03/90"
                  : "bg-green-03/15 text-green-03 hover:bg-green-03/25",
              )}
              disabled={isSaving}
              onClick={markOk}
            >
              {isSaving && panel === null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Looks good
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-12 gap-2 text-sm font-semibold",
              review?.comment
                ? "border-orange-03/50 bg-orange-03/10 text-orange-03"
                : "text-gray-01",
            )}
            disabled={isSaving}
            onClick={openComment}
          >
            <MessageSquare className="h-4 w-4" />
            Flag
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-12 gap-2 text-sm font-semibold",
              review?.status === "SUGGESTED_FIX"
                ? "border-blue-03/50 bg-blue-03/10 text-blue-03"
                : "text-gray-01",
            )}
            disabled={isSaving}
            onClick={openSuggest}
          >
            <Pencil className="h-4 w-4" />
            {showOk ? "Suggest" : "Add TEF"}
          </Button>
        </div>
        {onAdd && (
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full text-xs"
            disabled={isSaving || addDisabled}
            onClick={onAdd}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {addTitle}
          </Button>
        )}
        {review && (
          <p
            className={cn(
              "text-center text-[10px] uppercase tracking-wide",
              statusTone(review.status),
            )}
          >
            {review.status.replace("_", " ")}
          </p>
        )}
        <p className="text-center text-[10px] tabular-nums text-gray-02/80">
          {showOk ? "1 Looks good · 2 Flag · 3 Suggest" : "2 Flag · 3 Add TEF"}
          {" · ←/→ items"}
        </p>
        {dockExtra}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-02 mr-1">
          QA
        </span>
        {showOk && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              review?.status === "OK"
                ? "text-green-03 bg-green-03/10"
                : "text-gray-02 hover:text-green-03",
            )}
            title={review?.status === "OK" ? "Clear OK mark" : "Mark as OK"}
            disabled={isSaving}
            onClick={markOk}
          >
            {isSaving && panel === null ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0",
            review?.comment
              ? "text-orange-03 bg-orange-03/10"
              : "text-gray-02 hover:text-orange-03",
          )}
          title="Comment"
          disabled={isSaving}
          onClick={openComment}
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0",
            review?.status === "SUGGESTED_FIX"
              ? "text-blue-03 bg-blue-03/10"
              : "text-gray-02 hover:text-blue-03",
          )}
          title="Suggest a fix"
          disabled={isSaving}
          onClick={openSuggest}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        {onAdd && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              addActive
                ? "text-blue-03 bg-blue-03/10"
                : "text-gray-02 hover:text-blue-03",
            )}
            title={addTitle}
            disabled={isSaving || addDisabled}
            onClick={onAdd}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
        {review && (
          <span
            className={cn(
              "text-[10px] uppercase tracking-wide ml-1",
              statusTone(review.status),
            )}
          >
            {review.status.replace("_", " ")}
          </span>
        )}
        {review?.comment && !panel && (
          <span className="text-xs text-gray-02 truncate max-w-full basis-full sm:basis-auto sm:max-w-md">
            “{review.comment}”
          </span>
        )}
      </div>
      {panelBlock}
    </div>
  );
}
