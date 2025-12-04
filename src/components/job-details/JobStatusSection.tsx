import { QueueJob } from "@/lib/types";
import { getWorkflowStages } from "@/lib/workflow-config";
import {
  getStatusIcon as getCentralizedStatusIcon,
  getStatusBackgroundColor,
  getStatusLabelSwedish,
} from "@/lib/status-config";
import { getJobStatus } from "@/lib/workflow-utils";
import { cn } from "@/lib/utils";

interface JobStatusSectionProps {
  job: QueueJob;
}

export function JobStatusSection({ job }: JobStatusSectionProps) {
  const stage = getWorkflowStages().find((s) => s.id === job.queueId);
  const jobStatus = getJobStatus(job);
  const isActivelyProcessing = Boolean(job.processedOn && !job.finishedOn);

  const statusIcon = getCentralizedStatusIcon(
    jobStatus,
    "detailed",
    isActivelyProcessing
  );
  const statusColor = getStatusBackgroundColor(jobStatus);
  const statusText = getStatusLabelSwedish(jobStatus, isActivelyProcessing);

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">Status</h3>
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
          <div className="text-sm text-gray-02">Skapad</div>
          <div className="text-gray-01">
            {new Date(job.timestamp).toLocaleString("sv-SE")}
          </div>
        </div>
      </div>
    </div>
  );
}
