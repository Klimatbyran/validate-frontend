import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/ui/dialog";
import type { GarboMetadata } from "../lib/types";

const inputClassName =
  "w-full px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03";

export interface FieldEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modal title (e.g. "Edit Scope 1") */
  title: string;
  /** Short description of the field */
  description?: string;
  /** Current value shown when opening (for display only) */
  currentValue: string | number | null | undefined;
  /** Initial value for the edit input (often same as currentValue) */
  initialValue?: string;
  /** Submit: new value + metadata. Verified is applied when user checks "Mark as verified". */
  onSubmit: (value: string, meta: GarboMetadata & { verified?: boolean }) => Promise<void>;
  /** When true, show a "Verify only" button that submits without changing the value (verified: true). */
  allowVerifyOnly?: boolean;
  isSubmitting?: boolean;
  /** Custom input (e.g. number input). Default: single-line text. */
  renderInput?: (value: string, onChange: (v: string) => void, disabled: boolean) => React.ReactNode;
}

export function FieldEditModal({
  open,
  onOpenChange,
  title,
  description,
  currentValue,
  initialValue,
  onSubmit,
  allowVerifyOnly = false,
  isSubmitting = false,
  renderInput,
}: FieldEditModalProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [source, setSource] = useState("");
  const [comment, setComment] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (open) {
      const init = initialValue ?? (currentValue != null ? String(currentValue) : "");
      setValue(init);
      setSource("");
      setComment("");
      setVerified(false);
    }
  }, [open, currentValue, initialValue]);

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (e: React.FormEvent, asVerifyOnly: boolean) => {
    e.preventDefault();
    try {
      if (asVerifyOnly) {
        await onSubmit(
          initialValue ?? (currentValue != null ? String(currentValue) : ""),
          { verified: true }
        );
      } else {
        await onSubmit(value.trim(), {
          source: source.trim() || undefined,
          comment: comment.trim() || undefined,
          verified: verified || undefined,
        });
      }
      handleClose();
    } catch {
      // Caller shows toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <form
          onSubmit={(e) => handleSubmit(e, false)}
          className="space-y-4"
        >
          {renderInput ? (
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.fieldEdit.value")}
              </label>
              {renderInput(value, setValue, isSubmitting)}
            </div>
          ) : (
            <div>
              <label
                htmlFor="field-edit-value"
                className="block text-sm font-medium text-gray-01 mb-1"
              >
                {t("editor.fieldEdit.value")}
              </label>
              <input
                id="field-edit-value"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="field-edit-source"
              className="block text-sm font-medium text-gray-01 mb-1"
            >
              {t("editor.fieldEdit.source")} <span className="text-gray-03 font-normal">({t("common.optional")})</span>
            </label>
            <input
              id="field-edit-source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("editor.fieldEdit.sourcePlaceholder")}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="field-edit-comment"
              className="block text-sm font-medium text-gray-01 mb-1"
            >
              {t("editor.fieldEdit.comment")} <span className="text-gray-03 font-normal">({t("common.optional")})</span>
            </label>
            <textarea
              id="field-edit-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("editor.fieldEdit.commentPlaceholder")}
              className={inputClassName + " min-h-[80px] resize-y"}
              rows={2}
              disabled={isSubmitting}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-gray-03"
            />
            <span className="text-sm text-gray-01">{t("editor.fieldEdit.markVerified")}</span>
          </label>

          <DialogFooter className="gap-2 sm:gap-0">
            {allowVerifyOnly && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("editor.fieldEdit.verifyOnly")}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={handleClose}>
              {t("editor.fieldEdit.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("editor.fieldEdit.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
