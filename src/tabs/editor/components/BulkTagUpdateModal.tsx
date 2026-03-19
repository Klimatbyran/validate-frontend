import React, { useState } from "react";
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
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import type { TagOption } from "../lib/types";

export interface BulkTagUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyCount: number;
  tagOptions: TagOption[];
  onSubmit: (tags: string[]) => Promise<void>;
  isSubmitting: boolean;
}

export function BulkTagUpdateModal({
  open,
  onOpenChange,
  companyCount,
  tagOptions,
  onSubmit,
  isSubmitting,
}: BulkTagUpdateModalProps) {
  const { t } = useI18n();
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedSlugs([]);
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(selectedSlugs);
      handleClose();
    } catch {
      // Caller shows toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editor.companies.bulkUpdateTagsModal.title")}</DialogTitle>
          <DialogDescription>
            {t("editor.companies.bulkUpdateTagsModal.description", { count: companyCount })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.companies.tags")}
            </label>
            <div className="space-y-2">
              <MultiSelectDropdown
                options={tagOptions.map((o) => o.slug)}
                selectedIds={selectedSlugs}
                onChange={setSelectedSlugs}
                triggerLabel={t("editor.companies.tags")}
                getOptionLabel={(slug) => tagOptions.find((o) => o.slug === slug)?.label ?? slug}
                emptyLabel={t("editor.tagOptions.empty")}
                panelClassName="max-h-64"
                panelMinWidth={260}
              />
              {selectedSlugs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSlugs.map((slug) => (
                    <span
                      key={slug}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-03/80 text-gray-01 border border-gray-03"
                    >
                      {tagOptions.find((o) => o.slug === slug)?.label ?? slug}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              {t("editor.fieldEdit.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("editor.companies.bulkUpdateTagsModal.submit", { count: companyCount })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
