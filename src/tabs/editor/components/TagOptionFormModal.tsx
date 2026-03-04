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
import { toast } from "sonner";
import type { TagOption } from "../lib/types";
import { TAG_OPTION_SLUG_REGEX } from "../lib/types";

const inputClassName =
  "w-full px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03";

interface TagOptionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, modal is in edit mode (prefilled). When null, add mode. */
  editing: TagOption | null;
  onSubmit: (slug: string, label: string | null) => Promise<void>;
  isSubmitting: boolean;
}

export function TagOptionFormModal({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: TagOptionFormModalProps) {
  const { t } = useI18n();
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (open) {
      setSlug(editing?.slug ?? "");
      setLabel(editing?.label ?? "");
    }
  }, [open, editing?.id, editing?.slug, editing?.label]);

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slugTrim = slug.trim();
    if (!slugTrim) {
      toast.error(t("editor.tagOptions.slugRequired"));
      return;
    }
    if (!TAG_OPTION_SLUG_REGEX.test(slugTrim)) {
      toast.error(t("editor.tagOptions.slugInvalid"));
      return;
    }
    try {
      await onSubmit(slugTrim, label.trim() || null);
      handleClose();
    } catch {
      // Caller handles toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("editor.tagOptions.editTitle") : t("editor.tagOptions.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("editor.tagOptions.dialogDescription")} {t("editor.tagOptions.slugFormatHint")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="tag-option-slug"
              className="block text-sm font-medium text-gray-01 mb-1"
            >
              {t("editor.tagOptions.slug")} *
            </label>
            <input
              id="tag-option-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. large-cap"
              className={inputClassName}
              required
            />
            {editing && (
              <p className="text-xs text-gray-02 mt-1">
                {t("editor.tagOptions.slugChangeHint")}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="tag-option-label"
              className="block text-sm font-medium text-gray-01 mb-1"
            >
              {t("editor.tagOptions.label")}
            </label>
            <input
              id="tag-option-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("editor.tagOptions.labelPlaceholder")}
              className={inputClassName}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              {t("auth.back")}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? t("editor.tagOptions.save") : t("editor.tagOptions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
