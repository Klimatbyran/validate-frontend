/**
 * Grid of pipeline steps and queue jobs for a single year/run.
 * Used by YearRow in compact and full variants; supports optional rerun indicator.
 */

import {
  getQueuesForPipelineStep,
  getQueueDisplayName,
} from "@/lib/workflow-config";
import {
  findJobByQueueId,
  getJobStatus as getJobStatusFromUtils,
} from "@/lib/workflow-utils";
import {
  getStatusIcon,
  getStatusLabel,
  getCompactStyles,
} from "@/lib/status-config";
import type { SwimlaneYearData, QueueJob } from "@/lib/types";

function getStatusDisplay(
  job: QueueJob | undefined,
  variant: "compact" | "detailed",
  isActive?: boolean
) {
  const status = getJobStatusFromUtils(job);
  const jobExists = job !== undefined;
  return {
    status,
    icon: getStatusIcon(status, variant, isActive),
    text: getStatusLabel(status, isActive),
    styles:
      variant === "compact"
        ? getCompactStyles(status, isActive, jobExists)
        : undefined,
  };
}

export interface YearStepGridStep {
  id: string;
  name: string;
}

interface YearStepGridProps {
  yearData: SwimlaneYearData;
  yearStepStats: YearStepGridStep[];
  onFieldClick: (
    field: string,
    runData?: SwimlaneYearData,
    options?: { isRerun?: boolean }
  ) => void;
  variant: "compact" | "full";
  allRuns?: SwimlaneYearData[];
  currentThreadId?: string | null;
  /** Optional class for container (e.g. opacity-75 for previous runs) */
  containerClassName?: string;
}

export function YearStepGrid({
  yearData,
  yearStepStats,
  onFieldClick,
  variant,
  allRuns,
  currentThreadId,
  containerClassName = "",
}: YearStepGridProps) {
  const wrapperClass =
    variant === "compact"
      ? "p-7 space-y-2 bg-gray-05"
      : "p-7 bg-gray-05 space-y-4";
  const finalWrapperClass = [wrapperClass, containerClassName].filter(Boolean).join(" ");

  return (
    <div className={finalWrapperClass}>
      {yearStepStats.map((step, stepIndex) => {
        const queueIds = getQueuesForPipelineStep(step.id);
        const cells = queueIds.map((queueId) => {
          const fieldName = getQueueDisplayName(queueId);
          const job = findJobByQueueId(queueId, yearData);
          const allJobsForQueueAndThread =
            currentThreadId != null && allRuns
              ? allRuns.flatMap((run) =>
                  (run.jobs || []).filter((j) => {
                    const jobThreadId =
                      j.data?.threadId ||
                      (j as any).threadId ||
                      (run as any).threadId;
                    return (
                      j.queueId === queueId &&
                      jobThreadId === currentThreadId
                    );
                  })
                )
              : [];
          const isRerun =
            currentThreadId != null &&
            Array.isArray(allJobsForQueueAndThread) &&
            allJobsForQueueAndThread.length > 1;
          const isActive =
            (job?.processedOn && !job?.finishedOn) ||
            job?.status === "active";
          const statusDisplay = getStatusDisplay(
            job,
            variant === "compact" ? "compact" : "detailed",
            !!isActive
          );

          if (variant === "compact") {
            return (
              <button
                key={queueId}
                onClick={() => onFieldClick(queueId, yearData, { isRerun })}
                className={`
                  relative px-2 py-1 rounded border text-[10px] font-medium
                  hover:shadow-sm hover:scale-105 transition-all
                  ${statusDisplay.styles ?? ""}
                `}
              >
                {isRerun && (
                  <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[10px] border-t-orange-03 border-l-[10px] border-l-transparent" />
                )}
                <span className="flex items-center gap-1">
                  <span
                    className={
                      isActive ? "inline-block animate-spin-slow" : ""
                    }
                  >
                    {statusDisplay.icon}
                  </span>
                  <span>{fieldName}</span>
                </span>
              </button>
            );
          }

          return (
            <button
              key={queueId}
              onClick={() => onFieldClick(queueId, yearData, { isRerun })}
              className={`relative flex items-start gap-3 p-3 bg-gray-03/50 rounded-lg hover:bg-gray-03 hover:shadow-sm transition-all text-left group ${
                isActive ? "ring-2 ring-blue-03" : ""
              }`}
            >
              {isRerun && (
                <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[12px] border-t-orange-03 border-l-[12px] border-l-transparent" />
              )}
              <div className="flex-shrink-0 mt-0.5">{statusDisplay.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-01 mb-1 group-hover:text-blue-03 transition-colors">
                  {fieldName}
                  {isActive && (
                    <span className="ml-2 text-blue-03 text-xs">
                      (Active)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-02">
                  {statusDisplay.text}
                </div>
              </div>
            </button>
          );
        });

        return (
          <div key={stepIndex}>
            {variant === "compact" ? (
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-24 pt-1">
                  <span className="text-[10px] font-semibold text-gray-02 uppercase tracking-wide">
                    {step.name}
                  </span>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5">{cells}</div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2 pb-1.5">
                  <span className="text-xs font-bold text-gray-01 uppercase tracking-wide">
                    {step.name}
                  </span>
                  <div className="flex-1 h-px bg-gray-03" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {cells}
                </div>
              </>
            )}
            {variant === "compact" && stepIndex < yearStepStats.length - 1 && (
              <div className="mt-3 mb-2">
                <div className="h-px bg-gray-03" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
