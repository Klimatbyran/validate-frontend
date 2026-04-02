import { useEffect, useState } from "react";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { inputClassName } from "../lib/company-edit-utils";

export function ReviewerMetadataDialog({
  open,
  onOpenChange,
  title = "Reviewer details",
  description = "Add an optional reviewer comment and source reference for this save.",
  confirmLabel = "Save",
  saving,
  initialComment = "",
  initialSource = "",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  saving?: boolean;
  initialComment?: string;
  initialSource?: string;
  onConfirm: (meta: { comment: string; source: string }) => void | Promise<void>;
}) {
  const [comment, setComment] = useState(initialComment);
  const [source, setSource] = useState(initialSource);

  useEffect(() => {
    if (!open) return;
    setComment(initialComment);
    setSource(initialSource);
  }, [open, initialComment, initialSource]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-gray-01">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              Comment <span className="text-gray-03 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={inputClassName + " bg-gray-04 min-h-[90px] resize-y placeholder:text-gray-02/70"}
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              Source <span className="text-gray-03 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={inputClassName + " bg-gray-04 placeholder:text-gray-02/70"}
              placeholder="URL or reference"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={!!saving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onConfirm({ comment: comment.trim(), source: source.trim() })}
            disabled={!!saving}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

