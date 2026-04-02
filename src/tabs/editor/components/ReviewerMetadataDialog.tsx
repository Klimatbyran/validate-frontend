import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { cn } from "@/lib/utils";
import { inputClassName } from "../lib/company-edit-utils";

export function ReviewerMetadataDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
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
  const { t } = useI18n();
  const [comment, setComment] = useState(initialComment);
  const [source, setSource] = useState(initialSource);

  const resolvedTitle = title ?? t("editor.reviewerDialog.title");
  const resolvedDescription = description ?? t("editor.reviewerDialog.description");
  const resolvedConfirm = confirmLabel ?? t("editor.fieldEdit.save");

  useEffect(() => {
    if (!open) return;
    setComment(initialComment);
    setSource(initialSource);
  }, [open, initialComment, initialSource]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-gray-01">{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.reviewerDialog.comment")}{" "}
              <span className="text-sm font-normal text-gray-02">
                {t("editor.reviewerDialog.optional")}
              </span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={cn(
                inputClassName,
                "bg-gray-04 min-h-[90px] resize-y !placeholder:text-gray-02"
              )}
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.reviewerDialog.source")}{" "}
              <span className="text-sm font-normal text-gray-02">
                {t("editor.reviewerDialog.optional")}
              </span>
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={cn(inputClassName, "bg-gray-04 !placeholder:text-gray-02")}
              placeholder={t("editor.reviewerDialog.sourcePlaceholder")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={!!saving}
          >
            {t("editor.reviewerDialog.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onConfirm({ comment: comment.trim(), source: source.trim() })}
            disabled={!!saving}
          >
            {resolvedConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
