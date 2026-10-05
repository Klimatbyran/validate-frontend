import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type { ManualReviewCompanyHit } from "../types";

type Props = {
  hit: ManualReviewCompanyHit | null;
  open: boolean;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => void | Promise<void>;
};

export function ReviewDismissDialog({
  hit,
  open,
  isLoading = false,
  onOpenChange,
  onConfirm,
}: Props) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [showRequired, setShowRequired] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNote("");
      setShowRequired(false);
    }
    onOpenChange(next);
  }

  async function handleConfirm() {
    const trimmed = note.trim();
    if (!trimmed) {
      setShowRequired(true);
      return;
    }
    await onConfirm(trimmed);
    setNote("");
    setShowRequired(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("review.dismissDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("review.dismissDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        {hit ? (
          <div className="space-y-1 rounded-md border border-gray-03 bg-gray-05/50 px-3 py-2">
            <p className="text-sm font-medium text-gray-01">{hit.name}</p>
            <p className="text-xs text-gray-02">{hit.evidenceSummary}</p>
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-01">
            {t("review.dismissNoteLabel")}
          </span>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim()) setShowRequired(false);
            }}
            rows={4}
            placeholder={t("review.dismissNotePlaceholder")}
            className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01"
          />
          {showRequired ? (
            <p className="text-xs text-pink-03">
              {t("review.dismissNoteRequired")}
            </p>
          ) : null}
        </label>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t("review.dismissCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {t("review.dismissConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
