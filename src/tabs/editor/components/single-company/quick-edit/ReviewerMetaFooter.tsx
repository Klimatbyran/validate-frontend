import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

export function ReviewerMetaFooter({
  commentLabel,
  sourceLabel,
  optionalLabel,
  comment,
  onCommentChange,
  source,
  onSourceChange,
  sourcePlaceholder,
  inputClassName,
  onSave,
  saving,
  savingLabel,
  saveLabel,
}: {
  commentLabel: ReactNode;
  sourceLabel: ReactNode;
  optionalLabel: ReactNode;
  comment: string;
  onCommentChange: (next: string) => void;
  source: string;
  onSourceChange: (next: string) => void;
  sourcePlaceholder: string;
  inputClassName: string;
  onSave: () => void;
  saving: boolean;
  savingLabel: ReactNode;
  saveLabel: ReactNode;
}) {
  return (
    <div
      className={cn(
        "shrink-0 z-10 -mx-4 sm:-mx-6 mt-3 border-t border-gray-03/60 bg-gray-04/95 px-4 sm:px-6 pt-4 pb-4 backdrop-blur-sm",
        "shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.55)]"
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-01 mb-1">
            {commentLabel}{" "}
            <span className="text-sm font-normal text-gray-02">{optionalLabel}</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            className={cn(
              inputClassName,
              "bg-gray-04 min-h-[72px] resize-y !placeholder:text-gray-02"
            )}
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-01 mb-1">
            {sourceLabel}{" "}
            <span className="text-sm font-normal text-gray-02">{optionalLabel}</span>
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className={cn(inputClassName, "bg-gray-04 !placeholder:text-gray-02")}
            placeholder={sourcePlaceholder}
          />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={saving}>
          {saving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}

