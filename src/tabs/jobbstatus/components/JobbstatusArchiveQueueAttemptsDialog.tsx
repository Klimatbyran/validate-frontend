import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { useI18n } from "@/contexts/I18nContext";
import { getStatusBackgroundColor, getStatusIcon } from "@/lib/status-config";
import { cn } from "@/lib/utils";
import {
  archiveStatusToSwimlane,
  sortedTerminalAttemptsForQueue,
  type ArchiveJobLike,
} from "../lib/archive-run-jobs";

function getStatusLabelKey(status: string, isActive?: boolean): string {
  if (status === "processing" && isActive) return "status.processingNow";
  const keyMap: Record<string, string> = {
    completed: "status.completed",
    failed: "status.failed",
    processing: "status.processing",
    needs_approval: "status.needs_approval",
    waiting: "status.waiting",
  };
  return keyMap[status] ?? "status.waiting";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queueName: string;
  queueLabel: string;
  jobs: ArchiveJobLike[];
};

export function JobbstatusArchiveQueueAttemptsDialog({
  open,
  onOpenChange,
  queueName,
  queueLabel,
  jobs,
}: Props) {
  const { t, localeIntl } = useI18n();

  const attempts = useMemo(
    () => sortedTerminalAttemptsForQueue(jobs, queueName),
    [jobs, queueName],
  );

  const hasMixedOutcomes = useMemo(() => {
    const set = new Set(attempts.map((a) => archiveStatusToSwimlane(a.status)));
    return set.size > 1;
  }, [attempts]);

  const anySucceeded = useMemo(
    () => attempts.some((a) => a.status.toLowerCase() === "completed"),
    [attempts],
  );

  const formatWhen = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(localeIntl);
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{queueLabel}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-02 -mt-1">
          {t("jobstatus.archiveQueueHistoryIntro", { count: attempts.length })}
        </p>
        {anySucceeded && hasMixedOutcomes && (
          <p className="text-xs text-gray-02 mt-2">
            {t("jobstatus.jobdetails.attemptsMixedOutcomesHint")}
          </p>
        )}
        <div className="mt-3 space-y-2">
          {attempts.map((row, idx) => {
            const swim = archiveStatusToSwimlane(row.status);
            const statusKey = getStatusLabelKey(swim, false);
            return (
              <div
                key={row.id ?? `${row.jobId}-${row.finishedAt}-${idx}`}
                className="flex items-start justify-between gap-3 rounded-md border border-gray-03/60 bg-gray-05/40 px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-gray-01 font-medium">
                    {t("jobstatus.jobdetails.saveToApiAttemptNumber", {
                      number: idx + 1,
                    })}
                  </div>
                  <div className="text-gray-02 mt-0.5">
                    {formatWhen(row.finishedAt)}
                  </div>
                  {row.startedAt ? (
                    <div className="text-gray-02 mt-0.5">
                      <span className="font-medium text-gray-01">
                        {t("jobstatus.archiveColStarted")}
                      </span>
                      : {formatWhen(row.startedAt)}
                    </div>
                  ) : null}
                  <div
                    className="font-mono text-gray-02 truncate mt-1"
                    title={row.jobId}
                  >
                    {t("jobstatus.jobdetails.saveToApiJobIdLabel")}: {row.jobId}
                  </div>
                  {row.failedReason ? (
                    <div
                      className="text-pink-02 mt-1 break-words"
                      title={row.failedReason}
                    >
                      <span className="font-medium text-gray-01">
                        {t("jobstatus.jobdetails.saveToApiErrorLabel")}
                      </span>
                      : {row.failedReason}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded",
                      getStatusBackgroundColor(swim),
                    )}
                  >
                    <span className="scale-90">
                      {getStatusIcon(swim, "compact", false)}
                    </span>
                    <span>{t(statusKey)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
