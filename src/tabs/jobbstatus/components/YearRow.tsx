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
} from "@/lib/workflow-config";
import {
  calculatePipelineStepStatus,
  calculateStepJobStats,
} from "@/lib/workflow-utils";
import { getStepIcon } from "@/lib/status-config";
import type { SwimlaneYearData } from "@/lib/types";
import type { ViewLevel } from "@/ui/view-toggle";
import { YearStepGrid } from "./YearStepGrid";

interface YearRowProps {
  yearData: SwimlaneYearData;
  expandLevel: ViewLevel;
  onFieldClick: (
    field: string,
    runData?: SwimlaneYearData,
    options?: { isRerun?: boolean }
  ) => void;
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

      {expandLevel === "compact" && (
        <YearStepGrid
          yearData={yearData}
          yearStepStats={yearStepStats}
          onFieldClick={onFieldClick}
          variant="compact"
          allRuns={allRuns}
          currentThreadId={currentThreadId}
        />
      )}

      {expandLevel === "full" && (
        <YearStepGrid
          yearData={yearData}
          yearStepStats={yearStepStats}
          onFieldClick={onFieldClick}
          variant="full"
          allRuns={allRuns}
          currentThreadId={currentThreadId}
        />
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
                  <YearStepGrid
                    yearData={previousRun}
                    yearStepStats={prevYearStepStats}
                    onFieldClick={onFieldClick}
                    variant="compact"
                    containerClassName="p-4 bg-gray-05/50 opacity-75"
                  />
                )}

                {expandLevel === "full" && (
                  <YearStepGrid
                    yearData={previousRun}
                    yearStepStats={prevYearStepStats}
                    onFieldClick={onFieldClick}
                    variant="full"
                    containerClassName="p-4 bg-gray-05/50 opacity-75"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
