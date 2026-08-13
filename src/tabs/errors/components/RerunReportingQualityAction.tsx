/**
 * Errors browser: re-run just the reportingQuality worker for a row's report,
 * without manually re-uploading the PDF. Calls the same parsePdf entry point
 * used by Registry/Crawler/Overview (createJobsFromUrls), scoped with
 * runOnly: ["reportingQuality"] and forceReindex: true so it re-parses and
 * re-embeds the PDF even if it's already (or no longer) in ChromaDB.
 */
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Modal } from "@/ui/modal";
import { Button } from "@/ui/button";
import {
  createJobsFromUrls,
  UploadApiError,
} from "@/tabs/upload/lib/upload-api";
import { CompanyRow } from "../types";

export function RerunReportingQualityAction({ row }: { row: CompanyRow }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  if (!row.reportUrl) return null;
  const url = row.reportUrl;
  // Only auto-approve when we can be certain this resolves to the exact same
  // company (a strong identifier short-circuits garbo's resolution before any
  // name-matching happens) - otherwise fall back to the normal approval flow
  // rather than risk silently accepting an ambiguous name match.
  const hasKnownIdentity = Boolean(row.stageCompanyId || row.wikidataId);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const result = await createJobsFromUrls({
        urls: [url],
        autoApprove: hasKnownIdentity,
        forceReindex: true,
        runOnly: ["reportingQuality"],
        urlContexts: [
          {
            url,
            ...(row.stageCompanyId ? { companyId: row.stageCompanyId } : {}),
            ...(row.name ? { companyName: row.name } : {}),
            ...(row.wikidataId ? { wikidataId: row.wikidataId } : {}),
          },
        ],
      });

      // A 200 response can still carry a per-URL cache/queue failure.
      const envelope =
        !Array.isArray(result) && result && typeof result === "object"
          ? result
          : null;
      const cacheErrors =
        envelope && Array.isArray(envelope.errors) ? envelope.errors : [];

      if (cacheErrors.length > 0) {
        const message =
          cacheErrors
            .map((e) => e.error)
            .filter(Boolean)
            .join("; ") || t("upload.unknownError");
        toast.error(t("errors.rerunReportingQuality.error", { message }));
        return;
      }

      toast.success(t("errors.rerunReportingQuality.success"));
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof UploadApiError || error instanceof Error
          ? error.message
          : t("upload.unknownError");
      toast.error(t("errors.rerunReportingQuality.error", { message }));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Modal
      size="sm"
      open={open}
      onOpenChange={setOpen}
      title={t("errors.rerunReportingQuality.title")}
      description={row.name}
      trigger={
        <button
          type="button"
          className="text-gray-02 hover:text-gray-01 transition-colors"
          title={t("errors.rerunReportingQuality.tooltip")}
          aria-label={t("errors.rerunReportingQuality.tooltip")}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      }
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isRunning}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
          >
            {isRunning
              ? t("errors.rerunReportingQuality.running")
              : t("errors.rerunReportingQuality.confirm")}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-02 space-y-2">
        <p>{t("errors.rerunReportingQuality.body")}</p>
        <p className="break-all text-xs">{url}</p>
      </div>
    </Modal>
  );
}
