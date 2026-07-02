import { useCallback, useRef, useState } from "react";
import { searchCompanyReports } from "../lib/crawler-utils";
import { saveToRegistry } from "../lib/crawler-api";
import { filterReportsNotAlreadyInRegistry } from "../lib/auto-search-registry-check";
import { pickBestReportForCompany } from "../lib/auto-search-runner";
import type {
  AutoSearchPhase,
  AutoSearchProgress,
  AutoSearchStats,
  AutoSearchCompanyDetail,
  SelectedReport,
} from "../lib/crawler-types";

export type AutoSearchRunParams = {
  companies: Array<{
    name: string;
    wikidataId?: string;
    companyUrl?: string;
  }>;
  reportYear: string;
  country?: string;
};

const emptyStats = (): AutoSearchStats => ({
  companiesRequested: 0,
  companiesWithResults: 0,
  candidatesFetched: 0,
  candidatesAnalyzed: 0,
  added: [],
  skippedNoResults: [],
  skippedAnalyzeFailed: [],
  skippedLowConfidence: [],
  skippedAlreadyInRegistry: [],
  failed: [],
  companyDetails: [],
});

export function useAutoSearch() {
  const [phase, setPhase] = useState<AutoSearchPhase>("idle");
  const [progress, setProgress] = useState<AutoSearchProgress | null>(null);
  const [stats, setStats] = useState<AutoSearchStats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runFinishedAt, setRunFinishedAt] = useState<number | null>(null);
  const runIdRef = useRef(0);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(null);
    setStats(null);
    setErrorMessage(null);
    setRunStartedAt(null);
    setRunFinishedAt(null);
  }, []);

  const runAutoSearch = useCallback(async (params: AutoSearchRunParams) => {
    const runId = ++runIdRef.current;
    const isStale = () => runId !== runIdRef.current;

    setPhase("crawling");
    setProgress(null);
    setStats(null);
    setErrorMessage(null);
    setRunStartedAt(Date.now());
    setRunFinishedAt(null);

    const resultStats = emptyStats();
    resultStats.companiesRequested = params.companies.length;

    try {
      const companyReports = await searchCompanyReports({
        companies: params.companies.map((company) => ({
          name: company.name,
          reportYear: params.reportYear,
          country: params.country,
          wikidataId: company.wikidataId,
          companyUrl: company.companyUrl,
        })),
        onProgress: (crawl) => {
          if (isStale()) return;
          setProgress({
            companyIndex: crawl.companyIndex,
            companyTotal: crawl.companyTotal,
            companyName: crawl.companyName,
            candidateIndex: 0,
            candidateTotal: 0,
          });
        },
      });

      if (isStale()) return null;

      const withResults = companyReports.filter((c) =>
        c.results.some((r) => r.url?.trim()),
      );
      resultStats.companiesWithResults = withResults.length;

      for (const c of companyReports) {
        resultStats.candidatesFetched += c.results.filter((r) =>
          r.url?.trim(),
        ).length;
      }

      setPhase("analyzing");
      const winners: SelectedReport[] = [];

      for (let i = 0; i < companyReports.length; i++) {
        if (isStale()) return null;

        const companyReport = companyReports[i];
        const candidateTotal = companyReport.results.filter((r) =>
          r.url?.trim(),
        ).length;

        setProgress({
          companyIndex: i + 1,
          companyTotal: companyReports.length,
          companyName: companyReport.companyName,
          candidateIndex: 0,
          candidateTotal,
        });

        const wikidataId = params.companies.find(
          (c) => c.name === companyReport.companyName,
        )?.wikidataId;

        const { result: outcome, candidatesAnalyzed, candidates, prefilter, llm } =
          await pickBestReportForCompany(
            companyReport,
            params.reportYear,
            wikidataId,
            (candidateIndex, total) => {
              if (isStale()) return;
              setProgress({
                companyIndex: i + 1,
                companyTotal: companyReports.length,
                companyName: companyReport.companyName,
                candidateIndex,
                candidateTotal: total,
              });
            },
          );

        if (isStale()) return null;

        resultStats.candidatesAnalyzed += candidatesAnalyzed;

        const winnerUrl =
          outcome.kind === "winner" ? outcome.report.url : undefined;

        const companyDetail: AutoSearchCompanyDetail = {
          companyName: companyReport.companyName,
          discoverySource: companyReport.discoverySource,
          listingPageUrl: companyReport.listingPageUrl,
          outcome:
            outcome.kind === "winner"
              ? "selected"
              : outcome.kind === "low_confidence"
                ? "low_confidence"
                : outcome.kind === "analyze_failed"
                  ? "analyze_failed"
                  : "no_results",
          candidates: candidates.map((c) => ({
            url: c.url,
            pagesRead: c.pagesRead,
            isLlmChoice: c.isLlmChoice,
            isWinner: c.url === winnerUrl,
            prefilterSkipped: c.prefilterSkipped,
          })),
          prefilter,
          llm,
        };

        if (outcome.kind === "no_results") {
          resultStats.skippedNoResults.push({
            companyName: outcome.companyName,
          });
        } else if (outcome.kind === "analyze_failed") {
          resultStats.skippedAnalyzeFailed.push({
            companyName: outcome.companyName,
          });
        } else if (outcome.kind === "low_confidence") {
          resultStats.skippedLowConfidence.push({
            companyName: outcome.companyName,
            confidence: Math.round(outcome.confidence * 100),
            suggestedUrl: outcome.suggestedUrl,
          });
        } else {
          winners.push(outcome.report);
        }

        resultStats.companyDetails.push(companyDetail);
      }

      if (isStale()) return null;

      setPhase("saving");
      setProgress(null);

      let toSave = winners;
      let alreadyInRegistry: typeof winners = [];
      try {
        const filtered = await filterReportsNotAlreadyInRegistry(winners);
        toSave = filtered.toSave;
        alreadyInRegistry = filtered.skipped;
      } catch (registryError) {
        console.warn(
          "Registry pre-check failed; saving anyway (duplicates handled by API):",
          registryError,
        );
      }

      for (const report of alreadyInRegistry) {
        resultStats.skippedAlreadyInRegistry.push({
          companyName: report.companyName,
        });
        const detail = resultStats.companyDetails.find(
          (d) => d.companyName === report.companyName,
        );
        if (detail) {
          detail.outcome = "already_in_registry";
        }
      }

      if (toSave.length === 0) {
        setRunFinishedAt(Date.now());
        setStats(resultStats);
        setPhase("done");
        return resultStats;
      }

      if (isStale()) return null;

      const saveResponse = await saveToRegistry(toSave);
      if (isStale()) return null;

      resultStats.added = saveResponse.successes ?? [];
      resultStats.failed = saveResponse.failed ?? [];

      for (const failed of resultStats.failed) {
        if (
          failed.error === "duplicate" &&
          failed.message?.includes("company and year") &&
          !resultStats.skippedAlreadyInRegistry.some(
            (s) => s.companyName === failed.companyName,
          )
        ) {
          resultStats.skippedAlreadyInRegistry.push({
            companyName: failed.companyName,
          });
        }
      }

      resultStats.failed = resultStats.failed.filter(
        (f) =>
          !(
            f.error === "duplicate" &&
            f.message?.includes("company and year")
          ),
      );

      for (const detail of resultStats.companyDetails) {
        if (detail.outcome !== "selected") continue;
        const saved = resultStats.added.some(
          (s) => s.companyName === detail.companyName,
        );
        if (saved) {
          detail.outcome = "added";
          continue;
        }
        const duplicateInRegistry = resultStats.skippedAlreadyInRegistry.some(
          (s) => s.companyName === detail.companyName,
        );
        const failed = resultStats.failed.find(
          (f) => f.companyName === detail.companyName,
        );
        if (duplicateInRegistry) {
          detail.outcome = "already_in_registry";
        } else if (failed) {
          detail.outcome = "failed";
        }
      }

      setRunFinishedAt(Date.now());
      setStats(resultStats);
      setPhase("done");
      return resultStats;
    } catch (error) {
      if (isStale()) return null;
      const message =
        error instanceof Error ? error.message : "Auto-search failed";
      setRunFinishedAt(Date.now());
      setErrorMessage(message);
      setStats(resultStats);
      setPhase("error");
      return resultStats;
    }
  }, []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    reset();
  }, [reset]);

  const isRunning =
    phase === "crawling" || phase === "analyzing" || phase === "saving";

  return {
    phase,
    progress,
    stats,
    errorMessage,
    runStartedAt,
    runFinishedAt,
    isRunning,
    runAutoSearch,
    reset,
    cancel,
  };
}
