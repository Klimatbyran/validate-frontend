import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp,
  Loader2,
  Activity,
  BarChart3,
} from "lucide-react";
import { JobDetailsDialog } from "../components/job-details-dialog";
import { useGroupedCompanies } from "@/hooks/useGroupedCompanies";
import { queueStore } from "@/lib/queue-store";
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
  getWorkflowStages,
} from "@/lib/workflow-config";
import {
  calculatePipelineStepStatus,
  convertGroupedCompaniesToSwimlaneFormat,
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
import type { SwimlaneYearData, SwimlaneCompany, QueueJob } from "@/lib/types";

function getStatusDisplay(
  job: QueueJob | undefined,
  variant: "compact" | "detailed",
  isActive?: boolean
) {
  const status = getJobStatusFromUtils(job);

  return {
    status,
    icon: getStatusIcon(status, variant, isActive),
    text: getStatusLabel(status, isActive),
    styles:
      variant === "compact" ? getCompactStyles(status, isActive) : undefined,
  };
}

function YearRow({
  yearData,
  expandLevel,
  onFieldClick,
}: {
  yearData: SwimlaneYearData;
  expandLevel: ViewLevel;
  onFieldClick: (field: string) => void;
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
                    // Find the specific job for this field using direct queueId lookup
                    const job = findJobByQueueId(queueId, yearData);
                    const isActive = job?.processedOn && !job?.finishedOn;

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
  const {
    currentView: expandLevel,
    setCurrentView: setExpandLevel,
    cycleView,
  } = useViewToggle("collapsed");
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const latestYear = company.years?.[0];
  const totalYears = company.years?.length || 0;

  return (
    <>
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
        {/* Company Header */}
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

        {/* Years */}
        {(company.years || []).map((yearData) => (
          <YearRow
            key={`${yearData.year}-${yearData.latestTimestamp || 0}`}
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

function OverviewStats({ companies }: { companies: SwimlaneCompany[] }) {
  const stats = calculateSwimlaneOverallStats(
    companies,
    getAllPipelineSteps,
    calculateStepJobStats,
    getJobStatusFromUtils
  );
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

          {/* Field Status Breakdown */}
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
            />
            <CompactStatCard
              value={stats.failedFields}
              label="Failed"
              color="pink"
            />
          </div>

          {/* Pipeline Steps Stats */}
          <div className="border-t border-gray-03 pt-4">
            <h3 className="text-sm font-semibold text-gray-01 mb-3">
              Pipeline Steps Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.stepStats.map((step, index) => (
                <PipelineStepCard
                  key={index}
                  name={step.name}
                  completed={step.completed}
                  processing={step.processing}
                  failed={step.failed}
                  needsApproval={step.needsApproval}
                  waiting={step.waiting}
                  total={step.total}
                />
              ))}
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
