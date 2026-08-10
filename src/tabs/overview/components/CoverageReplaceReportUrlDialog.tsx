import { useEffect, useState } from "react";
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
import { isValidOptionalHttpUrl } from "@/tabs/registry/lib/registry-utils";
import type { RegistryReportPill } from "@/tabs/overview/lib/coverage-types";

type CoverageReplaceReportUrlDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: RegistryReportPill;
  onSave: (url: string) => Promise<void>;
  isSaving?: boolean;
};

export function CoverageReplaceReportUrlDialog({
  open,
  onOpenChange,
  report,
  onSave,
  isSaving = false,
}: CoverageReplaceReportUrlDialogProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState(report.sourceUrl?.trim() || report.url);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(report.sourceUrl?.trim() || report.url);
      setUrlError(null);
    }
  }, [open, report]);

  const trimmedUrl = url.trim();
  const canSave =
    trimmedUrl.length > 0 &&
    isValidOptionalHttpUrl(trimmedUrl) &&
    trimmedUrl !== (report.sourceUrl?.trim() || report.url);

  const handleSave = async () => {
    if (!canSave) {
      setUrlError(t("overview.coverage.replaceReportUrlInvalid"));
      return;
    }
    setUrlError(null);
    await onSave(trimmedUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-2rem,28rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("overview.coverage.replaceReportUrlTitle")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("overview.coverage.replaceReportUrlDescription", {
              year: report.reportYear ?? "?",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <label className="block text-sm font-medium text-gray-01">
            {t("registry.reportUrl")}
          </label>
          <input
            type="url"
            value={url}
            disabled={isSaving}
            onChange={(event) => {
              setUrl(event.target.value);
              setUrlError(null);
            }}
            className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01 focus:outline-none focus:ring-2 focus:ring-orange-03"
          />
          {urlError ? (
            <p className="text-sm text-pink-03">{urlError}</p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={!canSave || isSaving} onClick={() => void handleSave()}>
            {isSaving
              ? t("overview.coverage.replaceReportUrlSaving")
              : t("overview.coverage.replaceReportUrlSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
