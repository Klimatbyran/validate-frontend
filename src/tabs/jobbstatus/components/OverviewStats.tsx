/**
 * Overview statistics component for swimlane queue status
 * Displays process overview with clickable stats for filtering
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, BarChart3, Activity } from "lucide-react";
import { StatCard, CompactStatCard, PipelineStepCard } from "./StatCards";
import { getAllPipelineSteps } from "@/lib/workflow-config";
import {
  calculateStepJobStats,
  getJobStatus as getJobStatusFromUtils,
} from "@/lib/workflow-utils";
import { calculateSwimlaneOverallStats } from "../lib/calculation-utils";
import type { SwimlaneCompany } from "@/lib/types";
import type { FilterType } from "../lib/swimlane-filters";

interface OverviewStatsProps {
  companies: SwimlaneCompany[];
  onFilterToggle?: (filter: FilterType) => void;
}

export function OverviewStats({
  companies,
  onFilterToggle,
}: OverviewStatsProps) {
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
              value={stats.companiesWithNeedsApproval}
              label="Approval"
              color="orange"
              onClick={
                onFilterToggle && stats.companiesWithNeedsApproval > 0
                  ? () => onFilterToggle("pending_approval")
                  : undefined
              }
            />
            <CompactStatCard
              value={stats.companiesWithFailed}
              label="Failed"
              color="pink"
              onClick={
                onFilterToggle && stats.companiesWithFailed > 0
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
