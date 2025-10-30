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
                console.log('=== CLICKED JOB DATA ===');
                console.log('Full job object:', job);
                console.log('Job returnValue:', job.returnValue);
                console.log('Job data:', job.data);
                console.log('Job status:', job.status);
                console.log('Job queueId:', job.queueId);
                console.log('========================');
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
  const { companies, isLoading, error } = useCompanies();

  // Convert CustomAPICompany to SwimlaneCompany format
  const swimlaneCompanies = React.useMemo(() => {
    console.log('SwimlaneQueueStatus - converting companies:', companies);
    if (!companies || companies.length === 0) return [];
    
      return companies.map((company) => {
      console.log('SwimlaneQueueStatus - processing company:', company.company, 'with', company.processes.length, 'processes');
      if (company.processes.length > 0) {
        console.log('SwimlaneQueueStatus - first process:', company.processes[0]);
        if (company.processes[0].jobs.length > 0) {
          const firstJob = company.processes[0].jobs[0];
          console.log('SwimlaneQueueStatus - first job (full structure):', firstJob);
          console.log('SwimlaneQueueStatus - first job (key fields):', {
            id: firstJob.id,
            status: firstJob.status,
            finishedOn: firstJob.finishedOn,
            processedBy: firstJob.processedBy,
            approval: firstJob.approval,
            autoApprove: firstJob.autoApprove,
            returnvalue: firstJob.returnvalue,
            data: firstJob.data
          });
        }
      }
      // Group processes by year
      const processesByYear = company.processes.reduce((acc, process) => {
        const year = process.year || new Date().getFullYear();
        if (!acc[year]) {
          acc[year] = [];
        }
        acc[year].push(process);
        return acc;
      }, {} as Record<number, typeof company.processes>);

      // Convert to SwimlaneYearData format
      const years = Object.entries(processesByYear).map(([yearStr, yearProcesses]) => {
        const year = parseInt(yearStr);
        const latestProcess = yearProcesses.reduce((latest, process) => 
          (process.startedAt || 0) > (latest.startedAt || 0) ? process : latest
        );

        return {
          year,
          attempts: yearProcesses.length,
          fields: {}, // We'll populate this based on the jobs in the processes
          // Only include jobs from the latest process (single run/thread) to avoid mixing runs
          jobs: (latestProcess.jobs || []).map(job => {
              const convertedJob = {
                ...job,
                queueId: job.queue,
                opts: { attempts: (job as any).attemptsMade ?? 0 },
                data: {
                  ...job.data,
                  company: company.company,
                  companyName: company.company,
                  year: year,
                  threadId: latestProcess.id,
                  // Map approval status properly
                  approved: job.approval?.approved || false,
                  autoApprove: job.autoApprove
                },
                // Map status fields properly for getJobStatus function
                isFailed: job.status === "failed",
                finishedOn: job.finishedOn,
                processedOn: job.processedBy ? job.timestamp : undefined,
                // Ensure we have the right timestamp
                timestamp: job.timestamp,
                // Map return value data for job details display
                returnValue: job.returnvalue,
                // Map other important fields
                attempts: job.attemptsMade,
                stacktrace: job.stacktrace || []
              };
              
              // Debug: log the converted job and its calculated status
              if (job.id === company.processes[0]?.jobs[0]?.id) {
                console.log('SwimlaneQueueStatus - converted job:', convertedJob);
                console.log('SwimlaneQueueStatus - job status calculation:', {
                  finishedOn: convertedJob.finishedOn,
                  isFailed: convertedJob.isFailed,
                  processedOn: convertedJob.processedOn,
                  approved: convertedJob.data.approved,
                  autoApprove: convertedJob.data.autoApprove
                });
                console.log('SwimlaneQueueStatus - return value data:', {
                  hasReturnValue: !!convertedJob.returnValue,
                  returnValueType: typeof convertedJob.returnValue,
                  returnValueKeys: convertedJob.returnValue ? Object.keys(convertedJob.returnValue) : []
                });
              }
              
              return convertedJob;
            }),
          latestTimestamp: latestProcess.startedAt || 0
        };
      }).sort((a, b) => b.year - a.year);

      return {
        id: company.company,
        name: company.company,
        years
      };
    });
  }, [companies]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
          <div>
            <p className="text-lg text-gray-01 font-medium">Loading companies...</p>
            <p className="text-sm text-gray-02 mt-2">Fetching company data from API</p>
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
