import { QueueJob, SwimlaneYearData } from "@/lib/types";
import { getWorkflowStages } from "@/lib/workflow-config";
import {
  getStatusIcon as getCentralizedStatusIcon,
  getStatusBackgroundColor,
} from "@/lib/status-config";
import {
  getAggregateQueueStatus,
  getJobStatus,
  getQueueAttempts,
} from "@/lib/workflow-utils";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

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

interface JobStatusSectionProps {
  job: QueueJob;
  /** When true, show explanation that this job was rerun (matches orange triangle on grid) */
  isRerun?: boolean;
  /** Optional run context for showing attempt history */
  yearData?: SwimlaneYearData;
}

export function JobStatusSection({
  job,
  isRerun = false,
  yearData,
}: JobStatusSectionProps) {
  const { t, formatDate } = useI18n();
  const stage = getWorkflowStages().find((s) => s.id === job.queueId);
  const jobStatus = getJobStatus(job);
  const isActivelyProcessing = Boolean(job.processedOn && !job.finishedOn);

  const canonicalThreadId =
    yearData?.jobs?.[0]?.data?.threadId ||
    (yearData?.jobs?.[0] as any)?.threadId ||
    (yearData as any)?.threadId ||
    null;
  const aggregate =
    yearData && job.queueId
      ? getAggregateQueueStatus(job.queueId, yearData, canonicalThreadId)
      : null;
  const primaryStatus = aggregate?.status ?? jobStatus;

  const statusIcon = getCentralizedStatusIcon(
    primaryStatus,
    "detailed",
    isActivelyProcessing
  );
  const statusColor = getStatusBackgroundColor(primaryStatus);
  const statusText = t(getStatusLabelKey(primaryStatus, isActivelyProcessing));

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">{t("jobstatus.jobdetails.statusLabel")}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-3">
          <div className={cn("p-2 rounded-full", statusColor)}>
            {statusIcon}
          </div>
          <div>
            <div className="font-medium text-gray-01">
              {job.queueId && t(`jobstatus.queues.${job.queueId}`) !== `jobstatus.queues.${job.queueId}` ? t(`jobstatus.queues.${job.queueId}`) : (stage?.name || job.queueId)}
            </div>
            <div className="text-sm text-gray-02">{statusText}</div>
            {aggregate && aggregate.status !== jobStatus && (
              <div className="text-xs text-gray-02 mt-1">
                <span className="font-medium text-gray-01">
                  {t("jobstatus.jobdetails.latestAttemptLabel")}
                </span>{" "}
                <span className="text-gray-02">
                  {t(getStatusLabelKey(jobStatus, isActivelyProcessing))}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-02">{t("jobstatus.jobdetails.created")}</div>
          <div className="text-gray-01">
            {formatDate(job.timestamp)}
          </div>
        </div>
      </div>

      {isRerun && (
        <div className="mt-4 pt-4 border-t border-gray-03 flex items-start gap-2 text-sm text-gray-02">
          <span
            className="flex-shrink-0 w-0 h-0 border-t-[10px] border-t-orange-03 border-l-[10px] border-l-transparent mt-0.5"
            aria-hidden
          />
          <p>
            <span className="font-medium text-gray-01">{t("jobstatus.jobdetails.rerunTitle")}</span>{" "}
            {t("jobstatus.jobdetails.rerunExplanation")}
          </p>
        </div>
      )}

      {yearData && job.queueId && (
        (() => {
          const attempts = getQueueAttempts(job.queueId, yearData, canonicalThreadId);
          if (attempts.length <= 1) return null;
          const agg = aggregate ?? getAggregateQueueStatus(job.queueId, yearData, canonicalThreadId);
          const hasSuccess = agg.status === "completed";

          return (
            <div className="mt-4 pt-4 border-t border-gray-03">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-gray-01">
                  {t("jobstatus.jobdetails.attemptsLabel", { count: attempts.length })}
                </div>
                {hasSuccess && agg.hasMixedOutcomes && (
                  <div className="text-xs text-gray-02">
                    {t("jobstatus.jobdetails.attemptsMixedOutcomesHint")}
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {attempts.map((a: any, idx: number) => {
                  const status = getJobStatus(a);
                  const isSelected = a.id === job.id;
                  return (
                    <div
                      key={`${a.id}-${idx}`}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-md border border-gray-03/60 bg-gray-05/40 px-3 py-2 text-xs",
                        isSelected ? "ring-2 ring-blue-03/60" : ""
                      )}
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-gray-02 truncate">
                          {a.id}
                        </div>
                        <div className="text-gray-02">
                          {formatDate(a.timestamp)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-02">
                          {t(getStatusLabelKey(status))}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded",
                            getStatusBackgroundColor(status)
                          )}
                        >
                          {t(getStatusLabelKey(status))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
