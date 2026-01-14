import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp,
  Loader2,
  Activity,
  BarChart3,
  Filter,
  X,
  ChevronsDown,
  ChevronsUp,
  CheckCircle2,
  XCircle,
  RotateCw,
  AlertTriangle,
  MoreVertical,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobDetailsDialog } from "../components/job-details-dialog";
import { useCompanies } from "@/hooks/useCompanies";
import {
  StatCard,
  CompactStatCard,
  PipelineStepCard,
} from "../components/stat-cards";
import {
  ViewToggle,
  useViewToggle,
  type ViewLevel,
} from "../components/ui/view-toggle";
import {
  getAllPipelineSteps,
  getQueuesForPipelineStep,
  getQueueDisplayName,
} from "@/lib/workflow-config";
import {
  calculatePipelineStepStatus,
  getJobStatus as getJobStatusFromUtils,
  calculateStepJobStats,
  findJobByQueueId,
} from "@/lib/workflow-utils";
import {
  getStatusLabel,
  getStatusIcon,
  getCompactStyles,
  getStepIcon,
} from "@/lib/status-config";
import { calculateSwimlaneOverallStats } from "@/lib/calculation-utils";
import { toast } from "sonner";
import type { SwimlaneYearData, SwimlaneCompany, QueueJob } from "@/lib/types";

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

function YearRow({
  yearData,
  expandLevel,
  onFieldClick,
  allRuns,
  isExpanded,
  onToggleExpand,
}: {
  yearData: SwimlaneYearData;
  expandLevel: ViewLevel;
  onFieldClick: (field: string, runData?: SwimlaneYearData) => void;
  allRuns?: SwimlaneYearData[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
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

function CompanyCard({
  company,
  positionInList,
}: {
  company: SwimlaneCompany;
  positionInList: number;
}) {
  const {
    currentView: expandLevel,
    setCurrentView: setExpandLevel,
    cycleView,
  } = useViewToggle("collapsed");
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const latestYear = company.years?.[0];
  const totalYears = company.years?.length || 0;

  const toggleYearExpand = (yearKey: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(yearKey)) {
        next.delete(yearKey);
      } else {
        next.add(yearKey);
      }
      return next;
    });
  };

  return (
    <>
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
        <div className="w-full px-4 py-3 bg-gray-03/50 border-b border-gray-03 flex items-center justify-between">
          <button
            onClick={cycleView}
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            {expandLevel === "collapsed" && (
              <ChevronRight className="w-5 h-5 text-gray-02" />
            )}
            {expandLevel === "compact" && (
              <ChevronDown className="w-5 h-5 text-blue-03" />
            )}
            {expandLevel === "full" && (
              <ChevronDown className="w-5 h-5 text-green-03" />
            )}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-02">
                  {positionInList}.
                </span>
                <h3 className="font-bold text-gray-01">{company.name}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-02 mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>
                  {totalYears} {totalYears === 1 ? "year" : "years"} of data
                </span>
                <span>•</span>
                <span>Latest: {latestYear?.year || "N/A"}</span>
              </div>
            </div>
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1"
          >
            <ViewToggle
              currentView={expandLevel}
              onViewChange={setExpandLevel}
            />
          </div>
        </div>

        {(() => {
          const yearsByYear = (company.years || []).reduce((acc, yearData) => {
            const year = yearData.year;
            if (!acc[year]) {
              acc[year] = [];
            }
            acc[year].push(yearData);
            return acc;
          }, {} as Record<number, typeof company.years>);

          const sortedYearNumbers = Object.keys(yearsByYear)
            .map(Number)
            .sort((a, b) => b - a);

          return sortedYearNumbers.map((year) => {
            const runsForYear = yearsByYear[year];
            const sortedRuns = [...runsForYear].sort(
              (a, b) => (b.latestTimestamp || 0) - (a.latestTimestamp || 0)
            );
            const latestRun = sortedRuns[0];
            const previousRuns = sortedRuns.slice(1);
            const yearKey = `${year}-${latestRun.latestTimestamp || 0}`;
            const isExpanded = expandedYears.has(yearKey);
            const hasPreviousRuns = previousRuns.length > 0;

            return (
              <React.Fragment key={yearKey}>
                <YearRow
                  yearData={latestRun}
                  expandLevel={expandLevel}
                  onFieldClick={(queueId, runData) => {
                    const targetRun = runData || latestRun;
                    const job = targetRun.jobs?.find(
                      (j: QueueJob) => j.queueId === queueId
                    );

                    if (job) {
                      setSelectedJob(job);
                      setIsDialogOpen(true);
                    } else {
                      console.warn(
                        `No job found for queueId: ${queueId} in the specified run`
                      );
                    }
                  }}
                  allRuns={hasPreviousRuns ? sortedRuns : [latestRun]}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleYearExpand(yearKey)}
                />
              </React.Fragment>
            );
          });
        })()}
      </div>

      <JobDetailsDialog
        job={selectedJob}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onApprove={() => {
          // Handle approve action
        }}
        onRetry={() => {
          // Handle retry action
        }}
      />
    </>
  );
}

function OverviewStats({
  companies,
  onFilterToggle,
}: {
  companies: SwimlaneCompany[];
  onFilterToggle?: (filter: FilterType) => void;
}) {
  const stats = calculateSwimlaneOverallStats(
    companies,
    getAllPipelineSteps,
    calculateStepJobStats,
    getJobStatusFromUtils
  );
  const [isExpanded, setIsExpanded] = useState(true);

  // Map step names to filter types
  const stepToFilterMap: Record<string, FilterType> = {
    Preprocessing: "preprocessing_issues",
    "AI Data Extraction": "data_extraction_issues",
    Finalize: "finalize_issues",
  };

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-4 w-full hover:opacity-70 transition-opacity"
      >
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-02" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-02" />
        )}
        <BarChart3 className="w-5 h-5 text-gray-02" />
        <h2 className="text-3xl text-gray-01">Process Overview</h2>
      </button>

      {isExpanded && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              value={stats.totalCompanies}
              label="Companies"
              color="gray"
            />
            <StatCard value={stats.totalJobs} label="Reports" color="gray" />
            <StatCard
              value={stats.activeJobs}
              label="Active Jobs"
              color="blue"
              icon={<Activity className="w-3 h-3" />}
            />
            <StatCard
              value={`${stats.completionRate.toFixed(1)}%`}
              label="Completed Fields"
              color="green"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <CompactStatCard
              value={stats.totalFields}
              label="Total Jobs"
              color="gray"
            />
            <CompactStatCard
              value={stats.completedFields}
              label="Completed"
              color="green"
            />
            <CompactStatCard
              value={stats.processingFields}
              label="Processing"
              color="blue"
            />
            <CompactStatCard
              value={stats.needsApprovalFields}
              label="Approval"
              color="orange"
              onClick={
                onFilterToggle && stats.needsApprovalFields > 0
                  ? () => onFilterToggle("pending_approval")
                  : undefined
              }
            />
            <CompactStatCard
              value={stats.failedFields}
              label="Failed"
              color="pink"
              onClick={
                onFilterToggle && stats.failedFields > 0
                  ? () => onFilterToggle("has_failed")
                  : undefined
              }
            />
          </div>

          <div className="border-t border-gray-03 pt-4">
            <h3 className="text-sm font-semibold text-gray-01 mb-3">
              Pipeline Steps Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.stepStats.map((step, index) => {
                const stepFilter = stepToFilterMap[step.name];
                const hasIssues = step.failed > 0 || step.needsApproval > 0;

                return (
                  <PipelineStepCard
                    key={index}
                    name={step.name}
                    completed={step.completed}
                    processing={step.processing}
                    failed={step.failed}
                    needsApproval={step.needsApproval}
                    waiting={step.waiting}
                    total={step.total}
                    onStepClick={
                      onFilterToggle && stepFilter && hasIssues
                        ? () => onFilterToggle(stepFilter)
                        : undefined
                    }
                    onNeedsApprovalClick={
                      onFilterToggle && step.needsApproval > 0
                        ? () => onFilterToggle("pending_approval")
                        : undefined
                    }
                    onFailedClick={
                      onFilterToggle && step.failed > 0
                        ? () => onFilterToggle("has_failed")
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Filter type definitions
type FilterType =
  | "pending_approval"
  | "has_failed"
  | "has_processing"
  | "fully_completed"
  | "has_issues"
  | "preprocessing_issues"
  | "data_extraction_issues"
  | "finalize_issues";

type RunScope = "latest" | "all";

// Filter helper functions - all support run scope
function getYearsToCheck(company: SwimlaneCompany, runScope: RunScope): SwimlaneYearData[] {
  if (runScope === "all") {
    return company.years;
  }
  // Latest run only - get latest year's latest run
  const latestYear = company.years[0];
  return latestYear ? [latestYear] : [];
}

function hasPendingApproval(company: SwimlaneCompany, runScope: RunScope = "latest"): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.some((year) =>
    (year.jobs || []).some((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "needs_approval";
    })
  );
}

function hasFailedJobs(company: SwimlaneCompany, runScope: RunScope = "latest"): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.some((year) =>
    (year.jobs || []).some((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "failed";
    })
  );
}

function hasProcessingJobs(company: SwimlaneCompany, runScope: RunScope = "latest"): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.some((year) =>
    (year.jobs || []).some((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "processing";
    })
  );
}

function isFullyCompleted(company: SwimlaneCompany, runScope: RunScope = "latest"): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.every((year) => {
    const jobs = year.jobs || [];
    if (jobs.length === 0) return false;
    return jobs.every((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "completed";
    });
  });
}

function hasIssues(company: SwimlaneCompany, runScope: RunScope = "latest"): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.some((year) =>
    (year.jobs || []).some((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "failed" || status === "needs_approval";
    })
  );
}

function hasPipelineStepIssues(
  company: SwimlaneCompany,
  stepId: string,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.some((year) => {
    const stepStatus = calculatePipelineStepStatus(year, stepId);
    return stepStatus === "failed" || stepStatus === "needs_approval";
  });
}

export function SwimlaneQueueStatus() {
  const {
    companies,
    isLoading,
    error,
    loadMoreCompanies,
    isLoadingMore,
    hasMorePages,
  } = useCompanies();
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());
  const [runScope, setRunScope] = useState<RunScope>("latest");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convert CustomAPICompany to SwimlaneCompany format
  const swimlaneCompanies = useMemo(() => {
    if (!companies || companies.length === 0) {
      return [];
    }

    const getCompanyLatestTimestamp = (company: {
      years?: Array<{ latestTimestamp?: number }>;
    }): number => {
      if (!company.years || company.years.length === 0) return 0;
      return Math.max(
        ...company.years.map((year) => year.latestTimestamp || 0)
      );
    };

    const converted = companies
      .map((company) => {
        const companyName =
          company.company || company.processes?.[0]?.company || "Unknown";

        // Safety check: ensure processes array exists
        if (!company.processes || !Array.isArray(company.processes)) {
          console.warn(
            "SwimlaneQueueStatus - company missing processes array:",
            companyName,
            company
          );
          return null;
        }

        const processesByYear = company.processes.reduce((acc, process) => {
          const year = process.year || new Date().getFullYear();
          if (!acc[year]) {
            acc[year] = [];
          }
          acc[year].push(process);
          return acc;
        }, {} as Record<number, typeof company.processes>);

        const getProcessTimestamp = (
          process: (typeof company.processes)[0]
        ): number => {
          if (process.startedAt) return process.startedAt;
          if (process.finishedAt) return process.finishedAt;
          if (process.jobs && process.jobs.length > 0) {
            const latestJobTimestamp = Math.max(
              ...process.jobs.map((job) => job.timestamp || 0)
            );
            if (latestJobTimestamp > 0) return latestJobTimestamp;
          }
          return 0;
        };

        const years: SwimlaneYearData[] = [];
        Object.entries(processesByYear).forEach(([yearStr, yearProcesses]) => {
          const year = parseInt(yearStr);
          const sortedProcesses = [...yearProcesses].sort(
            (a, b) => getProcessTimestamp(b) - getProcessTimestamp(a)
          );

          sortedProcesses.forEach((process, index) => {
            const threadId =
              process.id ||
              (process as any)?.threadId ||
              (process as any)?.processId;

            const yearData: SwimlaneYearData & {
              threadId?: string;
              runIndex?: number;
              isLatestRun?: boolean;
            } = {
              year,
              attempts: yearProcesses.length,
              fields: {},
              jobs: (process.jobs || []).map((job) => {
                const convertedJob = {
                  ...job,
                  queueId: job.queue,
                  opts: { attempts: (job as any).attemptsMade ?? 0 },
                  threadId:
                    (job as any)?.threadId ??
                    (job as any)?.processId ??
                    threadId,
                  data: {
                    ...(job as any)?.jobData,
                    ...job.data,
                    company: companyName,
                    companyName: companyName,
                    year: year,
                    threadId:
                      (job as any)?.threadId ??
                      (job as any)?.processId ??
                      threadId ??
                      (job as any)?.data?.threadId ??
                      (job as any)?.jobData?.threadId,
                    approved: job.approval?.approved || false,
                    autoApprove: job.autoApprove,
                    approval:
                      job.approval ||
                      (job as any)?.jobData?.approval ||
                      (job as any)?.data?.approval,
                  },
                  isFailed: job.status === "failed",
                  finishedOn: job.finishedOn,
                  processedOn: job.processedBy ? job.timestamp : undefined,
                  timestamp: job.timestamp,
                  returnValue: job.returnvalue,
                  attempts: job.attemptsMade,
                  stacktrace: job.stacktrace || [],
                };

                return convertedJob;
              }),
              latestTimestamp: getProcessTimestamp(process),
              threadId: threadId,
              runIndex: index,
              isLatestRun: index === 0,
            };
            years.push(yearData);
          });
        });

        years.sort((a, b) => {
          if (a.year !== b.year) {
            const aHasApproval = (a.jobs || []).some((job) => {
              const status = getJobStatusFromUtils(job);
              return status === "needs_approval";
            });
            const bHasApproval = (b.jobs || []).some((job) => {
              const status = getJobStatusFromUtils(job);
              return status === "needs_approval";
            });

            if (aHasApproval && !bHasApproval) return -1;
            if (!aHasApproval && bHasApproval) return 1;

            return b.year - a.year;
          }

          const aRunIndex = (a as any).runIndex ?? 0;
          const bRunIndex = (b as any).runIndex ?? 0;
          return aRunIndex - bRunIndex;
        });

        const companyId =
          company.company ||
          company.wikidataId ||
          company.processes?.[0]?.id ||
          `${companyName}-${company.processes?.[0]?.startedAt || Date.now()}`;

        return {
          id: companyId,
          name: companyName,
          years,
        };
      })
      .filter((company): company is SwimlaneCompany => {
        // Filter out null companies (those missing processes)
        if (!company) return false;
        
        const hasValidYears = company.years && company.years.length > 0;
        if (!hasValidYears) {
          console.warn(
            "SwimlaneQueueStatus - filtering out company with no years:",
            company.name,
            company.id
          );
        }
        return hasValidYears;
      })
      .filter((company): company is SwimlaneCompany => company !== null)
      .sort((a, b) => {
        const aLatest = getCompanyLatestTimestamp(a);
        const bLatest = getCompanyLatestTimestamp(b);
        return bLatest - aLatest;
      });

    return converted;
  }, [companies]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      pending_approval: swimlaneCompanies.filter((c) =>
        hasPendingApproval(c, runScope)
      ).length,
      has_failed: swimlaneCompanies.filter((c) => hasFailedJobs(c, runScope))
        .length,
      has_processing: swimlaneCompanies.filter((c) =>
        hasProcessingJobs(c, runScope)
      ).length,
      fully_completed: swimlaneCompanies.filter((c) =>
        isFullyCompleted(c, runScope)
      ).length,
      has_issues: swimlaneCompanies.filter((c) => hasIssues(c, runScope))
        .length,
      preprocessing_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "preprocessing", runScope)
      ).length,
      data_extraction_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "data-extraction", runScope)
      ).length,
      finalize_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "finalize", runScope)
      ).length,
    };
  }, [swimlaneCompanies, runScope]);

  // Filter companies based on active filters (AND logic - all must match)
  const filteredCompanies = useMemo(() => {
    if (activeFilters.size === 0) {
      return swimlaneCompanies;
    }

    return swimlaneCompanies.filter((company) => {
      return Array.from(activeFilters).every((filter) => {
        switch (filter) {
          case "pending_approval":
            return hasPendingApproval(company, runScope);
          case "has_failed":
            return hasFailedJobs(company, runScope);
          case "has_processing":
            return hasProcessingJobs(company, runScope);
          case "fully_completed":
            return isFullyCompleted(company, runScope);
          case "has_issues":
            return hasIssues(company, runScope);
          case "preprocessing_issues":
            return hasPipelineStepIssues(company, "preprocessing", runScope);
          case "data_extraction_issues":
            return hasPipelineStepIssues(
              company,
              "data-extraction",
              runScope
            );
          case "finalize_issues":
            return hasPipelineStepIssues(company, "finalize", runScope);
          default:
            return true;
        }
      });
    });
  }, [swimlaneCompanies, activeFilters, runScope]);

  // Toggle filter
  const toggleFilter = (filter: FilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters(new Set());
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowMoreFilters(false);
      }
    };

    if (showMoreFilters) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreFilters]);

  // Show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRerunByWorker = (
    workerName: "scope1+2" | "scope3",
    limit = "all"
  ) => {
    toast.promise(
      fetch("/api/queues/rerun-by-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerName,
          queues: ["followUpScope12"],
          limit,
        }),
      }).then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            throw new Error(text || `HTTP ${res.status}`);
          });
        }
      }),
      {
        loading: `Kör om senaste ${limit} jobben för ${workerName}...`,
        success: `Startade om ${limit} jobb för ${workerName}`,
        error: (err) =>
          `Kunde inte köra om jobb för ${workerName}: ${
            err?.message || "Okänt fel"
          }`,
      }
    );
  };

  // Show loading state only until we have any companies
  if (isLoading && (!companies || companies.length === 0)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
          <div>
            <p className="text-lg text-gray-01 font-medium">
              Loading companies...
            </p>
            <p className="text-sm text-gray-02 mt-2">
              Fetching company data from API
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-03">Error loading companies: {error}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!companies || companies.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-02">No companies found</p>
        </div>
      </div>
    );
  }

  // Primary filters (most commonly used)
  const primaryFilters: Array<{
    id: FilterType;
    label: string;
    icon: React.ReactNode;
    badgeColorClass: string;
    activeColor: string;
  }> = [
    {
      id: "pending_approval",
      label: "Väntar på godkännande",
      icon: <AlertTriangle className="w-4 h-4" />,
      badgeColorClass: "bg-orange-03/20 text-orange-03",
      activeColor: "bg-orange-03 text-white hover:bg-orange-03/90",
    },
    {
      id: "has_failed",
      label: "Har misslyckade",
      icon: <XCircle className="w-4 h-4" />,
      badgeColorClass: "bg-pink-03/20 text-pink-03",
      activeColor: "bg-pink-03 text-white hover:bg-pink-03/90",
    },
    {
      id: "has_processing",
      label: "Bearbetar",
      icon: <RotateCw className="w-4 h-4" />,
      badgeColorClass: "bg-blue-03/20 text-blue-03",
      activeColor: "bg-blue-03 text-white hover:bg-blue-03/90",
    },
    {
      id: "has_issues",
      label: "Har problem",
      icon: <AlertTriangle className="w-4 h-4" />,
      badgeColorClass: "bg-orange-03/20 text-orange-03",
      activeColor: "bg-orange-03 text-white hover:bg-orange-03/90",
    },
  ];

  // Secondary filters (in dropdown)
  const secondaryFilters: Array<{
    id: FilterType;
    label: string;
  }> = [
    { id: "fully_completed", label: "Fullständigt klart" },
    { id: "preprocessing_issues", label: "Preprocessing-problem" },
    { id: "data_extraction_issues", label: "Dataextraktion-problem" },
    { id: "finalize_issues", label: "Finalisering-problem" },
  ];

  return (
    <div className="space-y-6">
      {/* Process Overview - Moved to top */}
      <OverviewStats
        companies={filteredCompanies}
        onFilterToggle={toggleFilter}
      />

      <div className="flex flex-col gap-4">
        {/* Filter Bar */}
        <div className="bg-gray-04/50 rounded-lg p-4 border border-gray-03">
          <div className="flex flex-col gap-3">
            {/* Filter Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-02" />
                <span className="text-sm font-medium text-gray-01">Filter:</span>
              </div>
              
              {/* Run Scope Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-02">Omfattning:</span>
                <div className="flex items-center gap-1 bg-gray-03 rounded-full p-0.5">
                  <button
                    onClick={() => setRunScope("latest")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      runScope === "latest"
                        ? "bg-gray-01 text-gray-05"
                        : "text-gray-02 hover:text-gray-01"
                    }`}
                  >
                    Senaste körning
                  </button>
                  <button
                    onClick={() => setRunScope("all")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      runScope === "all"
                        ? "bg-gray-01 text-gray-05"
                        : "text-gray-02 hover:text-gray-01"
                    }`}
                  >
                    Alla körningar
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">

            {/* Primary Filter Buttons */}
            {primaryFilters.map((filter) => {
              const isActive = activeFilters.has(filter.id);
              const count = filterCounts[filter.id];
              return (
                <Button
                  key={filter.id}
                  variant={isActive ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => toggleFilter(filter.id)}
                  className={
                    isActive
                      ? filter.activeColor
                      : "border border-gray-03 text-gray-01 hover:bg-gray-03/40"
                  }
                >
                  {isActive && <X className="w-4 h-4 mr-1.5" />}
                  <span className="mr-1.5">{filter.icon}</span>
                  {filter.label}
                  {count > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isActive ? "bg-white/20 text-white" : filter.badgeColorClass
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}

            {/* More Filters Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="border border-gray-03 text-gray-01 hover:bg-gray-03/40"
              >
                <MoreVertical className="w-4 h-4 mr-1.5" />
                Fler filter
                {activeFilters.size > 0 &&
                  secondaryFilters.some((f) => activeFilters.has(f.id)) && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-03/20 text-blue-03 text-xs font-medium">
                      {
                        secondaryFilters.filter((f) => activeFilters.has(f.id))
                          .length
                      }
                    </span>
                  )}
              </Button>

              {/* Dropdown Menu */}
              {showMoreFilters && (
                <div className="absolute left-0 top-full mt-2 z-50 bg-gray-04 border border-gray-03 rounded-lg shadow-lg p-2 min-w-[200px]">
                  <div className="text-xs font-semibold text-gray-02 mb-2 px-2">
                    Ytterligare filter
                  </div>
                  {secondaryFilters.map((filter) => {
                    const isActive = activeFilters.has(filter.id);
                    const count = filterCounts[filter.id];
                    return (
                      <button
                        key={filter.id}
                        onClick={() => {
                          toggleFilter(filter.id);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                          isActive
                            ? "bg-blue-03/20 text-blue-03"
                            : "text-gray-01 hover:bg-gray-03/50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isActive && (
                            <CheckCircle2 className="w-4 h-4 text-blue-03" />
                          )}
                          {filter.label}
                        </span>
                        {count > 0 && (
                          <span className="text-xs text-gray-02">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

              {/* Clear Filters */}
              {activeFilters.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-02 hover:text-gray-01 hover:bg-gray-03/40"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Rensa filter
                </Button>
              )}
            </div>

            {/* Filter Summary */}
            {activeFilters.size > 0 && (
              <div className="text-sm text-gray-02 pt-2">
                Visar {filteredCompanies.length} av {swimlaneCompanies.length}{" "}
                företag
              </div>
            )}

            {/* Rerun Jobs Section - Inside filter container */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-02" />
                <span className="text-sm font-medium text-gray-01">
                  Kör om jobb:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRerunByWorker("scope1+2")}
                  className="border border-gray-03 text-gray-01 hover:bg-gray-03/40"
                >
                  Scope 1+2 (5 st)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRerunByWorker("scope3")}
                  className="border border-gray-03 text-gray-01 hover:bg-gray-03/40"
                >
                  Scope 3 (5 st)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-02">
              {activeFilters.size > 0
                ? "Inga företag matchar de valda filtren"
                : "Inga företag hittades"}
            </p>
          </div>
        ) : (
          <>
            {filteredCompanies.map((company, companyIndex) => (
              <CompanyCard
                key={company.id}
                company={company}
                positionInList={companyIndex + 1}
              />
            ))}
            {hasMorePages && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMoreCompanies}
                  disabled={isLoadingMore}
                  className="border border-gray-03 text-gray-01 hover:bg-gray-03/40"
                >
                  {isLoadingMore
                    ? "Laddar fler företag..."
                    : "Ladda fler företag"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-gray-01 text-gray-05 rounded-full p-3 shadow-lg hover:bg-gray-02 transition-all hover:scale-110 active:scale-95"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
