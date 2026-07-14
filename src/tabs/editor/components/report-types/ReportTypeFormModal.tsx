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
import type { ReportType } from "../../lib/types";
import { TAG_OPTION_SLUG_REGEX } from "../../lib/types";

const inputClassName =
  "w-full px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03";

interface ReportTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ReportType | null;
  onSubmit: (slug: string, label: string | null) => Promise<void>;
  isSubmitting: boolean;
}

export function ReportTypeFormModal({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: ReportTypeFormModalProps) {
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
      toast.error(t("editor.reportTypes.slugRequired"));
      return;
    }
    if (!TAG_OPTION_SLUG_REGEX.test(slugTrim)) {
      toast.error(t("editor.reportTypes.slugInvalid"));
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
            {editing
              ? t("editor.reportTypes.editTitle")
              : t("editor.reportTypes.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("editor.reportTypes.dialogDescription")}{" "}
            {t("editor.reportTypes.slugFormatHint")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="report-type-slug"
              className="block text-sm font-medium text-gray-01 mb-1"
            >
              {t("editor.reportTypes.slug")} *
            </label>
            <input
              id="report-type-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. sustainability-report"
              className={inputClassName}
              required
            />
          </div>
          <div>
            <label
              htmlFor="report-type-label"
              className="block text-sm font-medium text-gray-01 mb-1"
            >
              {t("editor.reportTypes.label")}
            </label>
            <input
              id="report-type-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("editor.reportTypes.labelPlaceholder")}
              className={inputClassName}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              {t("auth.back")}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editing
                ? t("editor.reportTypes.save")
                : t("editor.reportTypes.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
