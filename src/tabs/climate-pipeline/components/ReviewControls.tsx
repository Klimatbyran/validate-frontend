import { useState, type ReactNode } from "react";
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
  /** Open comment/suggest panel on mount (e.g. newly added TE slot). */
  initialPanel?: "comment" | "suggest" | null;
  onChanged: (review: PipelineReview | null) => void;
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
  initialPanel = null,
  onChanged,
}: ReviewControlsProps) {
  const [panel, setPanel] = useState<"comment" | "suggest" | null>(initialPanel);
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

  const save = async (input: {
    status: ReviewStatus;
    comment?: string | null;
    suggestedValue?: unknown;
  }) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review");
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
    await save({ status: "OK", comment: review?.comment ?? null });
  };

  const saveComment = async () => {
    const trimmed = comment.trim();
    if (!trimmed && review?.status === "OK") {
      await save({ status: "OK", comment: null });
      return;
    }
    if (!trimmed) {
      setError("Comment cannot be empty for an issue");
      return;
    }
    await save({
      status: review?.status === "SUGGESTED_FIX" ? "SUGGESTED_FIX" : "ISSUE",
      comment: trimmed,
      suggestedValue: review?.suggestedValue,
    });
  };

  const saveSuggestion = async () => {
    if (suggestEditor) {
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
    setPanel((p) => (p === "suggest" ? null : "suggest"));
  };

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-02 mr-1">
          QA
        </span>
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
          onClick={() => {
            setComment(review?.comment ?? "");
            setPanel((p) => (p === "comment" ? null : "comment"));
          }}
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

      {panel && (
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
              onClick={() => setPanel(null)}
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
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
