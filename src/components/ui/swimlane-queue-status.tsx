import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Clock,
  Loader2,
  Activity,
  BarChart3,
  Eye,
  Grid3X3,
  List,
  HelpCircle,
  XCircle,
  RotateCw,
} from "lucide-react";
import { JobDetailsDialog } from "./job-details-dialog";
import { useGroupedCompanies } from "@/hooks/useGroupedCompanies";
// WORKFLOW_STAGES is now replaced by getWorkflowStages() from workflow-config
import { queueStore } from "@/lib/queue-store";
import {
  getAllPipelineSteps,
  getQueuesForPipelineStep,
  getQueueDisplayName,
  getWorkflowStages,
} from "@/lib/workflow-config";
import {
  calculatePipelineStepStatus,
  convertGroupedCompaniesToSwimlaneFormat,
  getJobStatus as getJobStatusFromUtils,
  calculateStepJobStats,
} from "@/lib/workflow-utils";
import type {
  SwimlaneStatusType,
  SwimlaneYearData,
  SwimlaneCompany,
  QueueJob,
} from "@/lib/types";

// getFieldStatus, isFieldActivelyProcessing, and getJobStatus are imported from workflow-utils

/**
 * Unified status display function for individual field/job display
 * Consolidates icon, text, and styles logic for compact and detailed views
 */
function getStatusDisplay(
  job: QueueJob | undefined,
  variant: "compact" | "detailed",
  isActive?: boolean
) {
  const status = getJobStatusFromUtils(job);

  // Icon configuration
  const getIcon = (status: SwimlaneStatusType) => {
    const sizeClasses = {
      compact: "w-3 h-3",
      detailed: "w-4 h-4",
    };

    const colorClasses = {
      compact: "text-white",
      detailed: {
        completed: "text-green-03",
        failed: "text-pink-03",
        processing: "text-blue-03",
        needs_approval: "text-orange-03",
        waiting: "text-gray-02",
      },
    };

    const iconProps = {
      className: `${sizeClasses[variant]} ${
        variant === "compact"
          ? colorClasses.compact
          : colorClasses.detailed[status]
      } ${status === "processing" && isActive ? "animate-spin-slow" : ""}`,
    };

    switch (status) {
      case "completed":
        return <CheckCircle2 {...iconProps} />;
      case "processing":
        return <RotateCw {...iconProps} />;
      case "failed":
        return variant === "compact" ? (
          <XCircle {...iconProps} />
        ) : (
          <XCircle {...iconProps} />
        );
      case "needs_approval":
        return <HelpCircle {...iconProps} />;
      case "waiting":
        return <Clock {...iconProps} />;
    }
  };

  // Text configuration
  const getText = (status: SwimlaneStatusType) => {
    if (isActive) return "Processing Now";
    switch (status) {
      case "completed":
        return "Done";
      case "failed":
        return "Requires Action";
      case "processing":
        return "In Progress";
      case "needs_approval":
        return "Awaiting Approval";
      case "waiting":
        return "Waiting";
    }
  };

  // Styles configuration (only for compact view)
  const getStyles = (status: SwimlaneStatusType) => {
    if (variant !== "compact") return undefined;

    const baseStatus = status || "waiting";
    switch (baseStatus) {
      case "completed":
        return "text-white bg-green-03/60 border-transparent";
      case "failed":
        return "text-white bg-pink-03/60 border-transparent";
      case "processing":
        return isActive
          ? "text-white bg-blue-03/60 border-blue-03 ring-2 ring-blue-03/50 animate-pulse"
          : "text-white bg-blue-03/60 border-blue-03";
      case "needs_approval":
        return "text-white bg-orange-03/60 border-transparent";
      case "waiting":
      default:
        return "text-white bg-gray-03/60 border-gray-03";
    }
  };

  return {
    status,
    icon: getIcon(status),
    text: getText(status),
    styles: getStyles(status),
  };
}

// Old stage-based icon functions removed - now using job-based icons

// getStepStatus is now replaced by calculatePipelineStepStatus from workflow-utils

function getStepIcon(
  status: "completed" | "processing" | "failed" | "waiting" | "needs_approval"
) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-green-03" />;
    case "processing":
      return <RotateCw className="w-5 h-5 text-blue-03 animate-spin-slow" />;
    case "failed":
      return <AlertTriangle className="w-5 h-5 text-pink-03" />;
    case "needs_approval":
      return <HelpCircle className="w-5 h-5 text-orange-03" />;
    case "waiting":
      return <Clock className="w-5 h-5 text-gray-02" />;
  }
}

// Helper function to find job by queue ID directly
// More efficient than the previous fieldName-based lookup
function findJobByQueueId(
  queueId: string,
  yearData: SwimlaneYearData
): QueueJob | undefined {
  if (!yearData.jobs) {
    return undefined;
  }

  return yearData.jobs.find((job: QueueJob) => job.queueId === queueId);
}

function YearRow({
  yearData,
  expandLevel,
  onFieldClick,
}: {
  yearData: SwimlaneYearData;
  expandLevel: "collapsed" | "compact" | "full";
  onFieldClick: (field: string) => void;
}) {
  // Calculate year-specific step statistics using the unified function
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

  return (
    <div className="border-t border-gray-03 first:border-t-0">
      {/* Year Header */}
      <div className="px-4 py-2 bg-gray-03/30 border-b border-gray-03 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-02" />
          <span className="text-sm font-medium text-gray-01">
            {yearData.year}
          </span>
          <span className="text-xs text-gray-02">
            {yearData.attempts} attempts
          </span>
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
            <div key={stepIndex} className="flex items-start gap-2">
              <div className="flex-shrink-0 w-24 pt-1">
                <span className="text-[10px] font-semibold text-gray-02 uppercase tracking-wide">
                  {step.name}
                </span>
              </div>
              <div className="flex-1 flex flex-wrap gap-1.5">
                {getQueuesForPipelineStep(step.id).map((queueId) => {
                  const fieldName = getQueueDisplayName(queueId);
                  // Find the specific job for this field using direct queueId lookup
                  const job = findJobByQueueId(queueId, yearData);
                  const isActive = job?.processedOn && !job?.finishedOn;
                  const status = getJobStatusFromUtils(job);

                  return (
                    <button
                      key={queueId}
                      onClick={() => onFieldClick(queueId)}
                      className={`
                        relative px-2 py-1 rounded border text-[10px] font-medium
                        hover:shadow-sm hover:scale-105 transition-all
                        ${getStatusDisplay(job, "compact", !!isActive).styles}
                      `}
                    >
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
          ))}
        </div>
      )}

      {/* Full Expanded View - Detailed Grid */}
      {expandLevel === "full" && (
        <div className="p-7 bg-gray-05 space-y-4">
          {yearStepStats.map((step, stepIndex) => (
            <div key={stepIndex}>
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-03">
                <span className="text-xs font-bold text-gray-01 uppercase tracking-wide">
                  {step.name}
                </span>
                <div className="flex-1 h-px bg-gray-03"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {getQueuesForPipelineStep(step.id).map((queueId) => {
                  const fieldName = getQueueDisplayName(queueId);
                  // Find the specific job for this field using direct queueId lookup
                  const job = findJobByQueueId(queueId, yearData);
                  const isActive = job?.processedOn && !job?.finishedOn;

                  return (
                    <button
                      key={queueId}
                      onClick={() => onFieldClick(queueId)}
                      className={`relative flex items-start gap-3 p-3 bg-gray-03/50 rounded-lg hover:bg-gray-03 hover:shadow-sm transition-all text-left group ${
                        isActive ? "ring-2 ring-blue-03" : ""
                      }`}
                    >
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
    </div>
  );
}

function CompanyCard({ company }: { company: SwimlaneCompany }) {
  const [expandLevel, setExpandLevel] = useState<
    "collapsed" | "compact" | "full"
  >("collapsed");
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const latestYear = company.years?.[0];
  const totalYears = company.years?.length || 0;

  const cycleExpand = () => {
    if (expandLevel === "collapsed") setExpandLevel("compact");
    else if (expandLevel === "compact") setExpandLevel("full");
    else setExpandLevel("collapsed");
  };

  return (
    <>
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
        {/* Company Header */}
        <div className="w-full px-4 py-3 bg-gray-03/50 border-b border-gray-03 flex items-center justify-between">
          <button
            onClick={cycleExpand}
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
              <h3 className="font-bold text-gray-01">{company.name}</h3>
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
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandLevel("collapsed");
              }}
              className={`p-2 rounded-lg border transition-colors ${
                expandLevel === "collapsed"
                  ? "bg-gray-03 text-gray-01 border-gray-02"
                  : "bg-transparent text-gray-02 border-gray-02 hover:bg-gray-03 hover:text-gray-01"
              }`}
              title="Collapsed View"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandLevel("compact");
              }}
              className={`p-2 rounded-lg border transition-colors ${
                expandLevel === "compact"
                  ? "bg-blue-03/20 text-blue-03 border-blue-03"
                  : "bg-transparent text-gray-02 border-gray-02 hover:bg-gray-03 hover:text-gray-01"
              }`}
              title="Compact View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandLevel("full");
              }}
              className={`p-2 rounded-lg border transition-colors ${
                expandLevel === "full"
                  ? "bg-green-03/20 text-green-03 border-green-03"
                  : "bg-transparent text-gray-02 border-gray-02 hover:bg-gray-03 hover:text-gray-01"
              }`}
              title="Full Detail View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Years */}
        {(company.years || []).map((yearData) => (
          <YearRow
            key={yearData.year}
            yearData={yearData}
            expandLevel={expandLevel}
            onFieldClick={(queueId) => {
              const job = yearData.jobs?.find(
                (j: QueueJob) => j.queueId === queueId
              );

              if (job) {
                setSelectedJob(job);
                setIsDialogOpen(true);
              } else {
                console.warn(`No job found for queueId: ${queueId}`);
              }
            }}
          />
        ))}
      </div>

      <JobDetailsDialog
        job={selectedJob}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onApprove={() => {
          // Handle approve action
          // TODO: Implement approve functionality
        }}
        onRetry={() => {
          // Handle retry action
          // TODO: Implement retry functionality
        }}
      />
    </>
  );
}

function calculateOverallStats(companies: SwimlaneCompany[]) {
  // Calculate overall job statistics across all companies and years
  let totalJobs = 0;
  let completedFields = 0;
  let processingFields = 0;
  let failedFields = 0;
  let waitingFields = 0;
  let needsApprovalFields = 0;

  // Count all jobs across all companies and years
  companies.forEach((company) => {
    company.years.forEach((year) => {
      totalJobs++;

      // Count all jobs for this year
      (year.jobs || []).forEach((job) => {
        const status = getJobStatusFromUtils(job);

        switch (status) {
          case "completed":
            completedFields++;
            break;
          case "processing":
            processingFields++;
            break;
          case "failed":
            failedFields++;
            break;
          case "needs_approval":
            needsApprovalFields++;
            break;
          case "waiting":
          default:
            waitingFields++;
            break;
        }
      });
    });
  });

  // Calculate step statistics using the unified function
  const pipelineSteps = getAllPipelineSteps();
  const stepStats = pipelineSteps.map((step) => {
    const stats = calculateStepJobStats(companies, step.id);
    return {
      name: step.name,
      ...stats,
    };
  });

  const totalFields =
    completedFields +
    processingFields +
    failedFields +
    waitingFields +
    needsApprovalFields;
  const completionRate =
    totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

  const activeJobs = companies.reduce(
    (acc, company) =>
      acc +
      company.years.filter((year) =>
        year.jobs?.some(
          (job) =>
            (job.processedOn && !job.finishedOn) ||
            (!job.data.approved && !job.data.autoApprove)
        )
      ).length,
    0
  );

  return {
    totalJobs,
    totalCompanies: companies.length,
    totalFields,
    completedFields,
    processingFields,
    failedFields,
    waitingFields,
    needsApprovalFields,
    completionRate,
    activeJobs,
    stepStats,
  };
}

function OverviewStats({ companies }: { companies: SwimlaneCompany[] }) {
  const stats = calculateOverallStats(companies);
  const [isExpanded, setIsExpanded] = useState(true);

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
          {/* Top Level Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-03/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-01">
                {stats.totalCompanies}
              </div>
              <div className="text-xs text-gray-02 mt-1">Companies</div>
            </div>
            <div className="bg-gray-03/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-01">
                {stats.totalJobs}
              </div>
              <div className="text-xs text-gray-02 mt-1">Reports</div>
            </div>
            <div className="bg-gray-03/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-03">
                {stats.activeJobs}
              </div>
              <div className="text-xs text-blue-02 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Active Jobs
              </div>
            </div>
            <div className="bg-gray-03/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-03">
                {stats.completionRate.toFixed(1)}%
              </div>
              <div className="text-xs text-green-02 mt-1">Completed Fields</div>
            </div>
          </div>

          {/* Field Status Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="text-center p-3 bg-gray-03/50 rounded-lg">
              <div className="text-lg font-bold text-gray-01">
                {stats.totalFields}
              </div>
              <div className="text-xs text-gray-02">Total Jobs</div>
            </div>
            <div className="text-center p-3 bg-gray-03/50 rounded-lg">
              <div className="text-lg font-bold text-green-03">
                {stats.completedFields}
              </div>
              <div className="text-xs text-green-02">Completed</div>
            </div>
            <div className="text-center p-3 bg-gray-03/50 rounded-lg">
              <div className="text-lg font-bold text-blue-03">
                {stats.processingFields}
              </div>
              <div className="text-xs text-blue-02">Processing</div>
            </div>
            <div className="text-center p-3 bg-gray-03/50 rounded-lg">
              <div className="text-lg font-bold text-orange-03">
                {stats.needsApprovalFields}
              </div>
              <div className="text-xs text-orange-02">Approval</div>
            </div>
            <div className="text-center p-3 bg-gray-03/50 rounded-lg">
              <div className="text-lg font-bold text-pink-03">
                {stats.failedFields}
              </div>
              <div className="text-xs text-pink-02">Failed</div>
            </div>
          </div>

          {/* Pipeline Steps Stats */}
          <div className="border-t border-gray-03 pt-4">
            <h3 className="text-sm font-semibold text-gray-01 mb-3">
              Pipeline Steps Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.stepStats.map((step, index) => {
                const completionPercent =
                  step.total > 0 ? (step.completed / step.total) * 100 : 0;

                // Calculate percentages for each status
                const completedPercent =
                  step.total > 0 ? (step.completed / step.total) * 100 : 0;
                const processingPercent =
                  step.total > 0 ? (step.processing / step.total) * 100 : 0;
                const failedPercent =
                  step.total > 0 ? (step.failed / step.total) * 100 : 0;
                const needsApprovalPercent =
                  step.total > 0 ? (step.needsApproval / step.total) * 100 : 0;
                const waitingPercent =
                  step.total > 0 ? (step.waiting / step.total) * 100 : 0;

                return (
                  <div key={index} className="bg-gray-03/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-01">
                        {step.name}
                      </span>
                      <span className="text-xs font-bold text-gray-01">
                        {completionPercent.toFixed(0)}% completed
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-02 rounded-full overflow-hidden mb-2 flex">
                      <div
                        className="h-full bg-green-03 transition-all"
                        style={{ width: `${completedPercent}%` }}
                        title={`${step.completed} completed`}
                      />
                      <div
                        className="h-full bg-blue-03 transition-all"
                        style={{ width: `${processingPercent}%` }}
                        title={`${step.processing} processing`}
                      />
                      <div
                        className="h-full bg-orange-03 transition-all"
                        style={{ width: `${needsApprovalPercent}%` }}
                        title={`${step.needsApproval} needs approval`}
                      />
                      <div
                        className="h-full bg-pink-03 transition-all"
                        style={{ width: `${failedPercent}%` }}
                        title={`${step.failed} failed`}
                      />
                      <div
                        className="h-full bg-gray-02 transition-all"
                        style={{ width: `${waitingPercent}%` }}
                        title={`${step.waiting} waiting`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-02">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-03" />
                        {step.completed}
                      </span>
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 text-blue-03" />
                        {step.processing}
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-orange-03" />
                        {step.needsApproval}
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-pink-03" />
                        {step.failed}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-02" />
                        {step.waiting}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// convertGroupedCompaniesToSwimlaneFormat is now imported from workflow-utils

export function SwimlaneQueueStatus() {
  const companies = useGroupedCompanies();

  // Trigger queue loading if not already loaded
  React.useEffect(() => {
    getWorkflowStages().forEach((stage) => {
      queueStore.loadQueueWithUpdates(stage.id);
    });
  }, []);

  // Convert the existing data to the new format
  const swimlaneCompanies =
    companies && Array.isArray(companies)
      ? convertGroupedCompaniesToSwimlaneFormat(companies)
      : [];

  // Show loading state if no companies data yet
  if (!companies || companies.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-6 h-6 text-gray-02 animate-spin mx-auto mb-4" />
          <p className="text-gray-02">Loading data...</p>
          <p className="text-xs text-gray-03 mt-2">
            Companies: {companies?.length || 0}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OverviewStats companies={swimlaneCompanies} />

      <div className="space-y-4">
        {swimlaneCompanies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}
