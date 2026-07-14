import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Button } from "@/ui/button";
import type {
  AutoSearchPhase,
  AutoSearchProgress,
  AutoSearchStats,
} from "../lib/crawler-types";
import { AUTO_SEARCH_CRAWL_CONCURRENCY } from "../lib/crawler-utils";
import RegistryList from "./RegistryList";
import AutoSearchLlmBreakdown from "./AutoSearchLlmBreakdown";
import AutoSearchLogButton from "./AutoSearchLogButton";

interface AutoSearchModalProps {
  open: boolean;
  phase: AutoSearchPhase;
  progress: AutoSearchProgress | null;
  stats: AutoSearchStats | null;
  reportYear: string;
  errorMessage: string | null;
  runStartedAt: number | null;
  runFinishedAt: number | null;
  /** Close after a finished run, or cancel + discard when still running. */
  onClose: () => void;
}

function formatElapsedMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function useElapsedMs(
  startedAt: number | null,
  finishedAt: number | null,
): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, finishedAt]);

  if (!startedAt) return null;
  return (finishedAt ?? now) - startedAt;
}

function ElapsedClock({
  elapsedMs,
  running,
}: {
  elapsedMs: number;
  running: boolean;
}) {
  const { t } = useI18n();
  return (
    <span
      className={`tabular-nums text-sm font-medium ${
        running ? "text-orange-03" : "text-gray-02"
      }`}
      aria-live={running ? "polite" : undefined}
    >
      {t("crawler.autoSearchElapsed", { time: formatElapsedMs(elapsedMs) })}
    </span>
  );
}

function StepRow({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li
      className={`text-sm flex items-center gap-2 ${
        active
          ? "text-gray-01 font-medium"
          : done
            ? "text-gray-02"
            : "text-gray-02/60"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          active
            ? "bg-orange-03 animate-pulse"
            : done
              ? "bg-green-500"
              : "bg-gray-03"
        }`}
      />
      {label}
    </li>
  );
}

export default function AutoSearchModal({
  open,
  phase,
  progress,
  stats,
  reportYear,
  errorMessage,
  runStartedAt,
  runFinishedAt,
  onClose,
}: AutoSearchModalProps) {
  const { t } = useI18n();
  const elapsedMs = useElapsedMs(runStartedAt, runFinishedAt);
  const isRunning =
    phase === "crawling" || phase === "analyzing" || phase === "saving";
  const isDone = phase === "done" || phase === "error";

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="space-y-1.5">
              <DialogTitle>{t("crawler.autoSearch")}</DialogTitle>
              <DialogDescription>
                {isRunning
                  ? t("crawler.autoSearchRunningDescription")
                  : isDone
                    ? t("crawler.autoSearchComplete")
                    : t("crawler.autoSearchDisclaimer")}
              </DialogDescription>
            </div>
            {elapsedMs != null && (
              <ElapsedClock elapsedMs={elapsedMs} running={isRunning} />
            )}
          </div>
        </DialogHeader>

        {isRunning && (
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-03 animate-spin shrink-0" />
              <p className="text-sm text-gray-01">
                {phase === "crawling" &&
                  (progress && progress.companyTotal > 0
                    ? progress.companyIndex === 0
                      ? t("crawler.autoSearchPhaseCrawlingStarting", {
                          parallel:
                            progress.parallel ?? AUTO_SEARCH_CRAWL_CONCURRENCY,
                          companyTotal: progress.companyTotal,
                        })
                      : t("crawler.autoSearchPhaseCrawlingDetail", {
                          company: progress.companyName,
                          completed: progress.companyIndex,
                          companyTotal: progress.companyTotal,
                        })
                    : t("crawler.autoSearchPhaseCrawling"))}
                {phase === "analyzing" &&
                  (progress
                    ? t("crawler.autoSearchPhaseAnalyzingDetail", {
                        company: progress.companyName,
                        companyIndex: progress.companyIndex,
                        companyTotal: progress.companyTotal,
                        candidateIndex: progress.candidateIndex,
                        candidateTotal: progress.candidateTotal,
                      })
                    : t("crawler.autoSearchPhaseAnalyzing"))}
                {phase === "saving" && t("crawler.autoSearchPhaseSaving")}
              </p>
            </div>
            <ol className="space-y-2 pl-1">
              <StepRow
                label={t("crawler.autoSearchStepCrawl")}
                active={phase === "crawling"}
                done={phase === "analyzing" || phase === "saving"}
              />
              <StepRow
                label={t("crawler.autoSearchStepAnalyze")}
                active={phase === "analyzing"}
                done={phase === "saving"}
              />
              <StepRow
                label={t("crawler.autoSearchStepSave")}
                active={phase === "saving"}
                done={false}
              />
            </ol>
            {isRunning && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={onClose}
              >
                {t("crawler.autoSearchCancel")}
              </Button>
            )}
          </div>
        )}

        {isDone && stats && (
          <div className="flex flex-col gap-4 pt-2">
            {errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {elapsedMs != null && (
                <>
                  <dt className="text-gray-02">
                    {t("crawler.autoSearchStatsElapsed")}
                  </dt>
                  <dd className="text-gray-01 font-medium tabular-nums">
                    {formatElapsedMs(elapsedMs)}
                  </dd>
                </>
              )}
              <dt className="text-gray-02">
                {t("crawler.autoSearchStatsCompanies")}
              </dt>
              <dd className="text-gray-01 font-medium">
                {stats.companiesRequested}
              </dd>
              <dt className="text-gray-02">
                {t("crawler.autoSearchStatsWithResults")}
              </dt>
              <dd className="text-gray-01 font-medium">
                {stats.companiesWithResults}
              </dd>
              <dt className="text-gray-02">
                {t("crawler.autoSearchStatsFetched")}
              </dt>
              <dd className="text-gray-01 font-medium">
                {stats.candidatesFetched}
              </dd>
              <dt className="text-gray-02">
                {t("crawler.autoSearchStatsAnalyzed")}
              </dt>
              <dd className="text-gray-01 font-medium">
                {stats.candidatesAnalyzed}
              </dd>
              <dt className="text-gray-02">
                {t("crawler.autoSearchStatsAdded")}
              </dt>
              <dd className="text-gray-01 font-medium">{stats.added.length}</dd>
            </dl>

            {stats.added.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-01 mb-2">
                  {t("crawler.successful")}
                </p>
                <RegistryList variant="success" items={stats.added} />
              </div>
            )}

            {stats.failed.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-01 mb-2">
                  {t("crawler.failed")}
                </p>
                <RegistryList variant="failed" items={stats.failed} />
              </div>
            )}

            {stats.skippedNoResults.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-01 mb-2">
                  {t("crawler.autoSearchSkippedNoResults")}
                </p>
                <ul className="text-sm text-gray-02 list-disc list-inside">
                  {stats.skippedNoResults.map((s) => (
                    <li key={s.companyName}>{s.companyName}</li>
                  ))}
                </ul>
              </div>
            )}

            {stats.skippedAnalyzeFailed.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-01 mb-2">
                  {t("crawler.autoSearchSkippedAnalyzeFailed")}
                </p>
                <ul className="text-sm text-gray-02 list-disc list-inside">
                  {stats.skippedAnalyzeFailed.map((s) => (
                    <li key={s.companyName}>{s.companyName}</li>
                  ))}
                </ul>
              </div>
            )}

            {stats.skippedLlmFailed.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-01 mb-2">
                  {t("crawler.autoSearchSkippedLlmFailed")}
                </p>
                <ul className="text-sm text-gray-02 list-disc list-inside">
                  {stats.skippedLlmFailed.map((s) => (
                    <li key={s.companyName}>{s.companyName}</li>
                  ))}
                </ul>
              </div>
            )}

            {stats.skippedLowConfidence.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-01 mb-2">
                  {t("crawler.autoSearchSkippedLowConfidence")}
                </p>
                <ul className="text-sm text-gray-02 space-y-1">
                  {stats.skippedLowConfidence.map((s) => (
                    <li key={s.companyName} className="flex flex-wrap gap-2">
                      <span>{s.companyName}</span>
                      <span className="text-gray-02/80">
                        (
                        {t("crawler.autoSearchLlmConfidence", {
                          confidence: s.confidence,
                        })}
                        )
                      </span>
                      {s.suggestedUrl && (
                        <a
                          href={s.suggestedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-03 underline break-all"
                        >
                          {t("crawler.reportLink")}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {stats.skippedAlreadyInRegistry.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-01 mb-2">
                  {t("crawler.autoSearchSkippedAlreadyInRegistry")}
                </p>
                <ul className="text-sm text-gray-02 list-disc list-inside">
                  {stats.skippedAlreadyInRegistry.map((s) => (
                    <li key={s.companyName}>{s.companyName}</li>
                  ))}
                </ul>
              </div>
            )}

            {stats.companyDetails.length > 0 && (
              <AutoSearchLlmBreakdown details={stats.companyDetails} />
            )}

            <div className="flex items-center justify-between gap-2">
              <AutoSearchLogButton stats={stats} reportYear={reportYear} />
              <Button size="sm" onClick={onClose} className="ml-auto">
                {t("crawler.autoSearchClose")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
