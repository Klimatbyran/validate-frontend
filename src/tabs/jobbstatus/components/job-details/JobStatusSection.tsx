import { QueueJob } from "@/lib/types";
import { getWorkflowStages } from "@/lib/workflow-config";
import {
  getStatusIcon as getCentralizedStatusIcon,
  getStatusBackgroundColor,
} from "@/lib/status-config";
import { getJobStatus } from "@/lib/workflow-utils";
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
}

export function JobStatusSection({ job, isRerun = false }: JobStatusSectionProps) {
  const { t, formatDate } = useI18n();
  const stage = getWorkflowStages().find((s) => s.id === job.queueId);
  const jobStatus = getJobStatus(job);
  const isActivelyProcessing = Boolean(job.processedOn && !job.finishedOn);

  const statusIcon = getCentralizedStatusIcon(
    jobStatus,
    "detailed",
    isActivelyProcessing
  );
  const statusColor = getStatusBackgroundColor(jobStatus);
  const statusText = t(getStatusLabelKey(jobStatus, isActivelyProcessing));

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
              {stage?.name || job.queueId}
            </div>
            <div className="text-sm text-gray-02">{statusText}</div>
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
    </div>
  );
}
