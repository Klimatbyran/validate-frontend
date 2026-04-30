import { Loader2 } from "lucide-react";
import type { ArchiveRunDetail } from "../lib/archive-types";
import type { ArchiveJobLike } from "../lib/archive-run-jobs";
import { formatArchiveWhen } from "../lib/format-archive-datetime";
import { getQueueDisplayName } from "@/lib/workflow-config";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

type JobbstatusArchiveDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailLoading: boolean;
  detailError: string | null;
  detailRun: ArchiveRunDetail | null;
  onOpenQueueAttempts: (
    queueName: string,
    queueLabel: string,
    jobs: ArchiveJobLike[],
  ) => void;
};

export function JobbstatusArchiveDetailDialog({
  open,
  onOpenChange,
  detailLoading,
  detailError,
  detailRun,
  onOpenQueueAttempts,
}: JobbstatusArchiveDetailDialogProps) {
  const { t, localeIntl } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("jobstatus.archiveDetailTitle")}</DialogTitle>
        </DialogHeader>
        {detailLoading && (
          <div className="flex items-center gap-2 text-gray-02 py-6">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t("jobstatus.archiveLoading")}
          </div>
        )}
        {!detailLoading && detailError && (
          <div className="text-sm text-pink-03 border border-pink-03/30 rounded-lg p-4">
            {t("jobstatus.archiveDetailError", { message: detailError })}
          </div>
        )}
        {!detailLoading && !detailError && detailRun && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 text-gray-02">
              <div>
                <span className="font-medium text-gray-01">
                  {t("jobstatus.archiveThread")}:
                </span>{" "}
                <span className="font-mono break-all">{detailRun.threadId}</span>
              </div>
              {detailRun.companyName ? (
                <div>
                  <span className="font-medium text-gray-01">
                    {t("jobstatus.archiveCompany")}:
                  </span>{" "}
                  {detailRun.companyName}
                </div>
              ) : null}
              {detailRun.wikidataId ? (
                <div>
                  <span className="font-medium text-gray-01">
                    {t("jobstatus.archiveWikidata")}:
                  </span>{" "}
                  {detailRun.wikidataId}
                </div>
              ) : null}
              {detailRun.batch?.batchName ? (
                <div>
                  <span className="font-medium text-gray-01">
                    {t("jobstatus.batch")}:
                  </span>{" "}
                  <span className="font-mono">{detailRun.batch.batchName}</span>
                </div>
              ) : null}
              <div>
                <span className="font-medium text-gray-01">
                  {t("jobstatus.archivePdfUrl")}:
                </span>{" "}
                <a
                  href={detailRun.pdfUrl}
                  className="text-blue-04 hover:underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {detailRun.pdfUrl}
                </a>
              </div>
              <div>
                {t("jobstatus.archiveStatus")}: {detailRun.status} ·{" "}
                {formatArchiveWhen(detailRun.startedAt, localeIntl)}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-01 mb-2">
                {t("jobstatus.archiveJobsHeading")}
              </h4>
              <div className="border border-gray-03/40 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-04/50 text-gray-02">
                    <tr>
                      <th className="p-2 font-medium">
                        {t("jobstatus.archiveColQueue")}
                      </th>
                      <th className="p-2 font-medium">
                        {t("jobstatus.archiveColJobId")}
                      </th>
                      <th className="p-2 font-medium">
                        {t("jobstatus.archiveColStatus")}
                      </th>
                      <th className="p-2 font-medium">
                        {t("jobstatus.archiveColFinished")}
                      </th>
                      <th className="p-2 font-medium w-[1%] whitespace-nowrap">
                        {t("jobstatus.archiveColActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRun.jobs.map((j) => {
                      const queueKey = `jobstatus.queues.${j.queueName}`;
                      const queueLabel =
                        t(queueKey) !== queueKey
                          ? t(queueKey)
                          : getQueueDisplayName(j.queueName);
                      return (
                        <tr
                          key={`${j.jobId}-${j.queueName}-${j.finishedAt}`}
                          className="border-t border-gray-03/30"
                        >
                          <td className="p-2 font-mono">{j.queueName}</td>
                          <td className="p-2 font-mono break-all">{j.jobId}</td>
                          <td className="p-2">{j.status}</td>
                          <td className="p-2 whitespace-nowrap">
                            {formatArchiveWhen(j.finishedAt, localeIntl)}
                          </td>
                          <td className="p-2 align-top">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto min-w-0 max-w-none px-1 py-0.5 text-xs text-blue-04 hover:text-blue-03 hover:bg-transparent"
                              onClick={() =>
                                onOpenQueueAttempts(
                                  j.queueName,
                                  queueLabel,
                                  detailRun.jobs,
                                )
                              }
                            >
                              {t("jobstatus.archiveViewStepAttempts")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {detailRun.jobs.some((j) => j.failedReason) && (
                <p className="text-xs text-gray-02 mt-2">
                  {t("jobstatus.archiveFailedHint")}
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
