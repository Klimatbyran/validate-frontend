/**
 * Single archived run row: matches CompanyCard / YearStepGrid look (rounded card,
 * header bar, expandable compact job strip). Only shows persisted jobs that finished
 * as completed (green) or failed (pink) — no gray “not run” placeholders.
 */

import { useMemo, useState, type ReactElement } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { Button } from "@/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import {
  getAllPipelineSteps,
  getQueuesForPipelineStep,
  getQueueDisplayName,
} from "@/lib/workflow-config";
import { getStatusIcon, getCompactStyles } from "@/lib/status-config";
import type { SwimlaneStatusType } from "@/lib/types";
import {
  sortedTerminalAttemptsForQueue,
  terminalAttemptCountByQueue,
} from "../lib/archive-run-jobs";

export type ArchiveRunJobRow = {
  jobId: string;
  queueName: string;
  status: string;
  failedReason: string | null;
  startedAt: string | null;
  finishedAt: string;
};

export type ArchiveRunCardModel = {
  id: string;
  threadId: string;
  pdfUrl: string;
  companyName: string | null;
  wikidataId: string | null;
  /** Resolved batch (Garbo); `batchName` matches pipeline `job.data.batchId`. */
  batch?: { id: string; batchName: string } | null;
  status: string;
  startedAt: string;
  jobs: ArchiveRunJobRow[];
};

function formatWhen(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return iso;
  }
}

function jobToSwimlaneStatus(status: string): SwimlaneStatusType | null {
  const s = status.toLowerCase();
  if (s === "completed") return "completed";
  if (s === "failed") return "failed";
  return null;
}

/** Latest job per queue; failed beats completed when timestamps tie. */
function latestTerminalJobByQueue(jobs: ArchiveRunJobRow[]): Map<string, ArchiveRunJobRow> {
  const map = new Map<string, ArchiveRunJobRow>();
  for (const j of jobs) {
    if (!jobToSwimlaneStatus(j.status)) continue;
    const prev = map.get(j.queueName);
    if (!prev) {
      map.set(j.queueName, j);
      continue;
    }
    const tNew = new Date(j.finishedAt).getTime();
    const tOld = new Date(prev.finishedAt).getTime();
    if (tNew > tOld) {
      map.set(j.queueName, j);
    } else if (tNew === tOld) {
      const rank = (s: string) => (s.toLowerCase() === "failed" ? 1 : 0);
      if (rank(j.status) > rank(prev.status)) map.set(j.queueName, j);
    }
  }
  return map;
}

function runStatusChipClass(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-green-03/20 text-green-02 border border-green-03/35";
    case "failed":
      return "bg-pink-03/20 text-pink-02 border border-pink-03/35";
    default:
      return "bg-blue-03/15 text-blue-02 border border-blue-03/30";
  }
}

interface JobbstatusArchiveRunCardProps {
  run: ArchiveRunCardModel;
  positionInList: number;
  onOpenDetails: (threadId: string) => void;
  /**
   * Open per-queue attempt history (all finishes for that step in this run).
   * Passes the full run job list so the parent does not depend on closure over `run`.
   */
  onOpenQueueAttempts: (
    queueName: string,
    queueLabel: string,
    jobs: ArchiveRunJobRow[],
  ) => void;
}

export function JobbstatusArchiveRunCard({
  run,
  positionInList,
  onOpenDetails,
  onOpenQueueAttempts,
}: JobbstatusArchiveRunCardProps) {
  const { t, localeIntl } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const jobByQueue = useMemo(() => latestTerminalJobByQueue(run.jobs), [run.jobs]);
  const terminalCount = jobByQueue.size;
  const attemptCountByQueue = useMemo(
    () => terminalAttemptCountByQueue(run.jobs),
    [run.jobs],
  );

  const stepNameKeyMap: Record<string, string> = {
    preprocessing: "jobstatus.overview.preprocessing",
    "data-extraction": "jobstatus.overview.aiDataExtraction",
    finalize: "jobstatus.overview.finalize",
  };

  const pipelineSteps = useMemo(() => getAllPipelineSteps(), []);

  const configuredQueueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const step of pipelineSteps) {
      for (const q of getQueuesForPipelineStep(step.id)) ids.add(q);
    }
    return ids;
  }, [pipelineSteps]);

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
      <div className="w-full px-4 py-3 bg-gray-03/50 border-b border-gray-03 flex items-stretch justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-03/40"
          aria-expanded={expanded}
          aria-label={
            expanded ? t("jobstatus.archiveCollapseAria") : t("jobstatus.archiveExpandAria")
          }
        >
          <ChevronDown
            className={`w-5 h-5 shrink-0 transition-transform ${
              expanded ? "text-blue-03 rotate-0" : "text-gray-02 -rotate-90"
            }`}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-gray-02 shrink-0">{positionInList}.</span>
              <h3 className="font-bold text-gray-01 truncate">
                {run.companyName || run.threadId}
              </h3>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md shrink-0 ${runStatusChipClass(run.status)}`}
              >
                {run.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-02 mt-1">
              {run.wikidataId ? (
                <span className="shrink-0">
                  {t("jobstatus.archiveWikidata")}:{" "}
                  <span className="font-mono text-gray-01">{run.wikidataId}</span>
                </span>
              ) : null}
              {run.batch?.batchName ? (
                <>
                  <span className="text-gray-02/80 hidden sm:inline">•</span>
                  <span className="shrink-0">
                    {t("jobstatus.batch")}:{" "}
                    <span className="font-mono text-gray-01">{run.batch.batchName}</span>
                  </span>
                </>
              ) : null}
              <span className="text-gray-02/80 hidden sm:inline">•</span>
              <span className="font-mono text-[11px] bg-gray-04 px-1.5 py-0.5 rounded truncate max-w-[220px] sm:max-w-md">
                {run.threadId}
              </span>
              <span className="text-gray-02/80 hidden sm:inline">•</span>
              <span className="flex items-center gap-1 shrink-0">
                <FileText className="w-3 h-3 opacity-70" />
                {formatWhen(run.startedAt, localeIntl)}
              </span>
              <span className="text-gray-02/80 hidden sm:inline">•</span>
              <span className="shrink-0">
                {t("jobstatus.archiveJobCount", { count: terminalCount })}
              </span>
            </div>
          </div>
        </button>
        <div className="flex items-center shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => onOpenDetails(run.threadId)}
          >
            {t("jobstatus.archiveOpenDetails")}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-7 space-y-2 bg-gray-05 border-t border-gray-03">
          {terminalCount === 0 ? (
            <p className="text-sm text-gray-02">{t("jobstatus.archiveNoTerminalJobs")}</p>
          ) : (
            (() => {
              const sections = pipelineSteps
                .map((step) => {
                  const queueIds = getQueuesForPipelineStep(step.id);
                  const cells = queueIds.flatMap((queueId) => {
                    const job = jobByQueue.get(queueId);
                    if (!job) return [];
                    const swim = jobToSwimlaneStatus(job.status);
                    if (!swim) return [];
                    const queueKey = `jobstatus.queues.${queueId}`;
                    const fieldName =
                      t(queueKey) !== queueKey ? t(queueKey) : getQueueDisplayName(queueId);
                    const styles = getCompactStyles(swim, false, true);
                    const multiAttempt = (attemptCountByQueue.get(queueId) ?? 0) > 1;
                    const attemptList = sortedTerminalAttemptsForQueue(run.jobs, queueId);
                    const titleHint = multiAttempt
                      ? `${job.failedReason ? `${job.failedReason}\n` : ""}${t("jobstatus.archiveMultiAttemptPillHint")}`
                      : job.failedReason ?? undefined;
                    return (
                      <button
                        key={`${queueId}-${job.jobId}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenQueueAttempts(queueId, fieldName, run.jobs);
                        }}
                        className={`
                        relative px-2 py-1 rounded border text-[10px] font-medium
                        hover:shadow-sm hover:scale-105 transition-all
                        ${styles}
                      `}
                        title={titleHint}
                        aria-label={
                          attemptList.length > 1
                            ? `${fieldName}, ${t("jobstatus.archiveQueueHistoryAria", { count: attemptList.length })}`
                            : fieldName
                        }
                      >
                        {multiAttempt && (
                          <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[10px] border-t-orange-03 border-l-[10px] border-l-transparent" />
                        )}
                        <span className="flex items-center gap-1">
                          <span>{getStatusIcon(swim, "compact", false)}</span>
                          <span>{fieldName}</span>
                        </span>
                      </button>
                    );
                  });
                  if (cells.length === 0) return null;
                  const stepLabel = stepNameKeyMap[step.id]
                    ? t(stepNameKeyMap[step.id])
                    : step.name;
                  return { id: step.id, stepLabel, cells };
                })
                .filter(
                  (s): s is { id: string; stepLabel: string; cells: ReactElement[] } =>
                    s != null,
                );

              const orphanCells: ReactElement[] = [];
              for (const queueId of jobByQueue.keys()) {
                if (configuredQueueIds.has(queueId)) continue;
                const job = jobByQueue.get(queueId)!;
                const swim = jobToSwimlaneStatus(job.status);
                if (!swim) continue;
                const styles = getCompactStyles(swim, false, true);
                const multiAttempt = (attemptCountByQueue.get(queueId) ?? 0) > 1;
                const attemptList = sortedTerminalAttemptsForQueue(run.jobs, queueId);
                const orphanName = getQueueDisplayName(queueId);
                const titleHint = multiAttempt
                  ? `${job.failedReason ? `${job.failedReason}\n` : ""}${t("jobstatus.archiveMultiAttemptPillHint")}`
                  : job.failedReason ?? undefined;
                orphanCells.push(
                  <button
                    key={`orphan-${queueId}-${job.jobId}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenQueueAttempts(queueId, orphanName, run.jobs);
                    }}
                    className={`
                        relative px-2 py-1 rounded border text-[10px] font-medium
                        hover:shadow-sm hover:scale-105 transition-all
                        ${styles}
                      `}
                    title={titleHint}
                    aria-label={
                      attemptList.length > 1
                        ? `${orphanName}, ${t("jobstatus.archiveQueueHistoryAria", { count: attemptList.length })}`
                        : orphanName
                    }
                  >
                    {multiAttempt && (
                      <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[10px] border-t-orange-03 border-l-[10px] border-l-transparent" />
                    )}
                    <span className="flex items-center gap-1">
                      <span>{getStatusIcon(swim, "compact", false)}</span>
                      <span>{orphanName}</span>
                    </span>
                  </button>,
                );
              }
              if (orphanCells.length > 0) {
                sections.push({
                  id: "__other_queues__",
                  stepLabel: t("jobstatus.archiveOtherSteps"),
                  cells: orphanCells,
                });
              }

              return sections.map((section, idx) => (
                <div key={section.id}>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-24 pt-1">
                      <span className="text-[10px] font-semibold text-gray-02 uppercase tracking-wide">
                        {section.stepLabel}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1.5">{section.cells}</div>
                  </div>
                  {idx < sections.length - 1 && (
                    <div className="mt-3 mb-2">
                      <div className="h-px bg-gray-03" />
                    </div>
                  )}
                </div>
              ));
            })()
          )}
        </div>
      )}
    </div>
  );
}
