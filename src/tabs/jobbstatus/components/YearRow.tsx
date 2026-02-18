/**
 * Year row component for swimlane queue status
 * Displays a year's data with compact/full views and previous runs
 */

import { useMemo } from "react";
import { Calendar, ChevronsDown, ChevronsUp } from "lucide-react";
import { Button } from "@/ui/button";
import {
  getAllPipelineSteps,
  getQueuesForPipelineStep,
  getQueueDisplayName,
} from "@/lib/workflow-config";
import {
  calculatePipelineStepStatus,
  calculateStepJobStats,
  findJobByQueueId,
  getJobStatus as getJobStatusFromUtils,
} from "@/lib/workflow-utils";
import {
  getStatusIcon,
  getStatusLabel,
  getCompactStyles,
  getStepIcon,
} from "@/lib/status-config";
import type { SwimlaneYearData, QueueJob } from "@/lib/types";
import type { ViewLevel } from "@/ui/view-toggle";

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

interface YearRowProps {
  yearData: SwimlaneYearData;
  expandLevel: ViewLevel;
  onFieldClick: (field: string, runData?: SwimlaneYearData) => void;
  allRuns?: SwimlaneYearData[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function YearRow({
  yearData,
  expandLevel,
  onFieldClick,
  allRuns,
  isExpanded,
  onToggleExpand,
}: YearRowProps) {
  const yearStepStats = useMemo(() => {
    const pipelineSteps = getAllPipelineSteps();
    return pipelineSteps.map((step) => {
      const stats = calculateStepJobStats(yearData, step.id);
      return {
        id: step.id,
        name: step.name,
        status: calculatePipelineStepStatus(yearData, step.id),
        ...stats,
      };
    });
  }, [yearData]);

  // Get a canonical threadId for this run
  const currentThreadId =
    yearData.jobs?.[0]?.data?.threadId ||
    yearData.jobs?.[0]?.threadId ||
    (yearData as any).threadId;
  const currentLatestTimestamp = yearData.latestTimestamp || 0;

  const hasPreviousRuns = allRuns && allRuns.length > 1;
  const previousRuns =
    hasPreviousRuns && allRuns
      ? allRuns.filter((run) => {
          const runThreadId =
            run.jobs?.[0]?.data?.threadId ||
            run.jobs?.[0]?.threadId ||
            (run as any).threadId;
          const runTimestamp = run.latestTimestamp || 0;
          return !(
            runThreadId === currentThreadId &&
            runTimestamp === currentLatestTimestamp
          );
        })
      : [];

  return (
    <div className="border-t border-gray-03 first:border-t-0">
      {/* Year Header */}
      <div className="px-4 py-2 bg-gray-03/30 border-b border-gray-03 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-02" />
          <span className="text-sm font-medium text-gray-01">
            {yearData.year}
          </span>
          {currentThreadId && (
            <span className="text-xs text-gray-02 font-mono bg-gray-04 px-1.5 py-0.5 rounded">
              {currentThreadId}
            </span>
          )}
          {hasPreviousRuns && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="h-6 px-2 text-xs text-blue-03 hover:text-blue-04 hover:bg-blue-03/10"
            >
              {isExpanded ? (
                <>
                  <ChevronsUp className="w-3 h-3 mr-1" />
                  Visa färre
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3 h-3 mr-1" />
                  Visa fler ({allRuns.length - 1} tidigare)
                </>
              )}
            </Button>
          )}
          <span className="text-xs text-gray-02">
            {yearData.attempts} attempts
          </span>
          {yearData.latestTimestamp && (
            <span className="text-xs text-blue-02">
              Latest: {new Date(yearData.latestTimestamp).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {yearStepStats.map((step, index) => (
            <div key={step.name} className="flex items-center gap-2">
              {index > 0 && <div className="w-6 h-px bg-gray-03" />}
              <div className="flex items-center gap-1.5">
                {getStepIcon(step.status)}
                <span className="text-xs font-medium text-gray-01">
                  {step.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swimlane - Compact View */}
      {expandLevel === "compact" && (
        <div className="p-7 space-y-2 bg-gray-05">
          {yearStepStats.map((step, stepIndex) => (
            <div key={stepIndex}>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-24 pt-1">
                  <span className="text-[10px] font-semibold text-gray-02 uppercase tracking-wide">
                    {step.name}
                  </span>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {getQueuesForPipelineStep(step.id).map((queueId) => {
                    const fieldName = getQueueDisplayName(queueId);
                    const job = findJobByQueueId(queueId, yearData);
                    const allJobsForQueueAndThread =
                      !!currentThreadId && allRuns
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
                      !!currentThreadId &&
                      Array.isArray(allJobsForQueueAndThread) &&
                      allJobsForQueueAndThread.length > 1;
                    const isActive =
                      (job?.processedOn && !job?.finishedOn) ||
                      job?.status === "active";

                    return (
                      <button
                        key={queueId}
                        onClick={() => onFieldClick(queueId, yearData)}
                        className={`
                        relative px-2 py-1 rounded border text-[10px] font-medium
                        hover:shadow-sm hover:scale-105 transition-all
                        ${getStatusDisplay(job, "compact", !!isActive).styles}
                      `}
                      >
                        {isRerun && (
                          <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[10px] border-t-orange-03 border-l-[10px] border-l-transparent" />
                        )}
                        <span className="flex items-center gap-1">
                          <span
                            className={`${
                              isActive ? "inline-block animate-spin-slow" : ""
                            }`}
                          >
                            {getStatusDisplay(job, "compact", !!isActive).icon}
                          </span>
                          <span>{fieldName}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {stepIndex < yearStepStats.length - 1 && (
                <div className="mt-3 mb-2">
                  <div className="h-px bg-gray-03"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full Expanded View - Detailed Grid */}
      {expandLevel === "full" && (
        <div className="p-7 bg-gray-05 space-y-4">
          {yearStepStats.map((step, stepIndex) => (
            <div key={stepIndex}>
              <div className="flex items-center gap-2 mb-2 pb-1.5">
                <span className="text-xs font-bold text-gray-01 uppercase tracking-wide">
                  {step.name}
                </span>
                <div className="flex-1 h-px bg-gray-03"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {getQueuesForPipelineStep(step.id).map((queueId) => {
                  const fieldName = getQueueDisplayName(queueId);
                  const job = findJobByQueueId(queueId, yearData);
                  const allJobsForQueueAndThread =
                    !!currentThreadId && allRuns
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
                    !!currentThreadId &&
                    Array.isArray(allJobsForQueueAndThread) &&
                    allJobsForQueueAndThread.length > 1;
                  const isActive =
                    (job?.processedOn && !job?.finishedOn) ||
                    job?.status === "active";

                  return (
                    <button
                      key={queueId}
                      onClick={() => onFieldClick(queueId, yearData)}
                      className={`relative flex items-start gap-3 p-3 bg-gray-03/50 rounded-lg hover:bg-gray-03 hover:shadow-sm transition-all text-left group ${
                        isActive ? "ring-2 ring-blue-03" : ""
                      }`}
                    >
                      {isRerun && (
                        <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[12px] border-t-orange-03 border-l-[12px] border-l-transparent" />
                      )}
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusDisplay(job, "detailed", !!isActive).icon}
                      </div>
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
                          {getStatusDisplay(job, "detailed", !!isActive).text}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Previous Runs - shown when expanded */}
      {isExpanded && hasPreviousRuns && previousRuns.length > 0 && (
        <div className="border-t border-gray-03 bg-gray-04/30">
          <div className="px-4 py-2 text-xs text-gray-02 font-medium">
            Tidigare körningar:
          </div>
          {previousRuns.map((previousRun, idx) => {
            const prevThreadId =
              (previousRun as any).threadId ||
              previousRun.jobs?.[0]?.threadId ||
              previousRun.jobs?.[0]?.data?.threadId;
            const pipelineSteps = getAllPipelineSteps();
            const prevYearStepStats = pipelineSteps.map((step) => {
              const stats = calculateStepJobStats(previousRun, step.id);
              return {
                id: step.id,
                name: step.name,
                status: calculatePipelineStepStatus(previousRun, step.id),
                ...stats,
              };
            });

            return (
              <div
                key={`prev-${prevThreadId}-${idx}`}
                className="border-t border-gray-03/50"
              >
                <div className="px-4 py-2 bg-gray-03/20 border-b border-gray-03/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-02">
                      Tidigare körning
                    </span>
                    {prevThreadId && (
                      <span className="text-xs text-gray-02 font-mono bg-gray-04 px-1.5 py-0.5 rounded">
                        {prevThreadId}
                      </span>
                    )}
                    {previousRun.latestTimestamp && (
                      <span className="text-xs text-gray-02">
                        {new Date(previousRun.latestTimestamp).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {expandLevel === "compact" && (
                  <div className="p-4 space-y-2 bg-gray-05/50">
                    {prevYearStepStats.map((step, stepIndex) => (
                      <div key={stepIndex}>
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-24 pt-1">
                            <span className="text-[10px] font-semibold text-gray-02 uppercase tracking-wide">
                              {step.name}
                            </span>
                          </div>
                          <div className="flex-1 flex flex-wrap gap-1.5">
                            {getQueuesForPipelineStep(step.id).map(
                              (queueId) => {
                                const fieldName = getQueueDisplayName(queueId);
                                const job = findJobByQueueId(
                                  queueId,
                                  previousRun
                                );
                                const isActive =
                                  (job?.processedOn && !job?.finishedOn) ||
                                  job?.status === "active";

                                return (
                                  <button
                                    key={queueId}
                                    onClick={() =>
                                      onFieldClick(queueId, previousRun)
                                    }
                                    className={`
                                    relative px-2 py-1 rounded border text-[10px] font-medium
                                    hover:shadow-sm hover:scale-105 transition-all opacity-75
                                    ${
                                      getStatusDisplay(
                                        job,
                                        "compact",
                                        !!isActive
                                      ).styles
                                    }
                                  `}
                                  >
                                    <span className="flex items-center gap-1">
                                      <span
                                        className={`${
                                          isActive
                                            ? "inline-block animate-spin-slow"
                                            : ""
                                        }`}
                                      >
                                        {
                                          getStatusDisplay(
                                            job,
                                            "compact",
                                            !!isActive
                                          ).icon
                                        }
                                      </span>
                                      <span>{fieldName}</span>
                                    </span>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                        {stepIndex < prevYearStepStats.length - 1 && (
                          <div className="mt-3 mb-2">
                            <div className="h-px bg-gray-03"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {expandLevel === "full" && (
                  <div className="p-4 bg-gray-05/50 space-y-4">
                    {prevYearStepStats.map((step, stepIndex) => (
                      <div key={stepIndex}>
                        <div className="flex items-center gap-2 mb-2 pb-1.5">
                          <span className="text-xs font-bold text-gray-01 uppercase tracking-wide">
                            {step.name}
                          </span>
                          <div className="flex-1 h-px bg-gray-03"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {getQueuesForPipelineStep(step.id).map((queueId) => {
                            const fieldName = getQueueDisplayName(queueId);
                            const job = findJobByQueueId(queueId, previousRun);
                            const isActive =
                              (job?.processedOn && !job?.finishedOn) ||
                              job?.status === "active";

                            return (
                              <button
                                key={queueId}
                                onClick={() =>
                                  onFieldClick(queueId, previousRun)
                                }
                                className={`relative flex items-start gap-3 p-3 bg-gray-03/30 rounded-lg hover:bg-gray-03/50 hover:shadow-sm transition-all text-left group opacity-75 ${
                                  isActive ? "ring-2 ring-blue-03" : ""
                                }`}
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  {
                                    getStatusDisplay(
                                      job,
                                      "detailed",
                                      !!isActive
                                    ).icon
                                  }
                                </div>
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
                                    {
                                      getStatusDisplay(
                                        job,
                                        "detailed",
                                        !!isActive
                                      ).text
                                    }
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
