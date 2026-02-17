/**
 * Company card component for swimlane queue status
 * Displays a company with its years and jobs
 */

import React, { useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { JobDetailsDialog } from "../job-details-dialog";
import { ViewToggle, useViewToggle } from "../ui/view-toggle";
import type { SwimlaneCompany, SwimlaneYearData, QueueJob } from "@/lib/types";
import { YearRow } from "@/components/swimlane/YearRow";
import { isFollowUpQueue } from "@/lib/job-rerun-utils";

interface CompanyCardProps {
  company: SwimlaneCompany;
  positionInList: number;
}

export function CompanyCard({ company, positionInList }: CompanyCardProps) {
  const {
    currentView: expandLevel,
    setCurrentView: setExpandLevel,
    cycleView,
  } = useViewToggle("collapsed");
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [missingQueueId, setMissingQueueId] = useState<string | undefined>();
  const [selectedYearData, setSelectedYearData] = useState<SwimlaneYearData | undefined>();

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
                      setMissingQueueId(undefined);
                      setSelectedYearData(undefined);
                      setIsDialogOpen(true);
                    } else if (isFollowUpQueue(queueId)) {
                      // Allow opening non-existent follow-up jobs
                      setSelectedJob(null);
                      setMissingQueueId(queueId);
                      setSelectedYearData(targetRun);
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
        missingQueueId={missingQueueId}
        yearData={selectedYearData}
      />
    </>
  );
}
