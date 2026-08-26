import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, WandIcon } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { RunReportsModal } from "@/components/RunReportsModal";
import type { RunReportsPipelineHandle } from "@/hooks/useRunReportsPipeline";
import type { RunReportListItem } from "@/lib/run-reports-types";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import RegistryList from "@/tabs/crawler/components/RegistryList";
import SearchResultItem from "@/tabs/crawler/components/SearchResultItem";
import { saveToRegistry } from "@/tabs/crawler/lib/crawler-api";
import type {
  CompanyReport,
  SaveReportSuccess,
  SaveReportsListResponse,
  SelectedReport,
} from "@/tabs/crawler/lib/crawler-types";
import {
  AUTO_SEARCH_CRAWL_CONCURRENCY,
  fallbackReportTypeSlug,
  inferReportYearFromUrl,
  labeledHitsToSelectedReports,
  saveLabeledSearchResults,
  searchCompanyReports,
  type CrawlProgress,
} from "@/tabs/crawler/lib/crawler-utils";
import {
  coverageEntryCrawlCompany,
  coverageEntryForSavedReport,
} from "@/tabs/overview/lib/coverage-registry-report-run";
import type { CoverageEntry } from "@/tabs/overview/lib/coverage-types";

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
  }, [finishedAt, startedAt]);

  if (!startedAt) return null;
  return (finishedAt ?? now) - startedAt;
}

type CoverageCrawlReportsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: CoverageEntry[];
  runPipeline: RunReportsPipelineHandle;
  onSaved?: (saved: SaveReportSuccess) => void;
};

function applyWikidataFromEntries(
  reports: CompanyReport[],
  entries: CoverageEntry[],
): CompanyReport[] {
  return reports.map((report) => {
    const entry = coverageEntryForSavedReport(entries, {
      companyName: report.companyName,
      wikidataId: report.wikidataId,
    });
    return {
      ...report,
      wikidataId: report.wikidataId ?? entry?.matchedCompany?.wikidataId,
    };
  });
}

export function CoverageCrawlReportsDialog({
  open,
  onOpenChange,
  entries,
  runPipeline,
  onSaved,
}: CoverageCrawlReportsDialogProps) {
  const { t } = useI18n();
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(
    null,
  );
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [companyReports, setCompanyReports] = useState<CompanyReport[] | null>(
    null,
  );
  const [selectedReports, setSelectedReports] = useState<SelectedReport[]>([]);
  const [registryResponse, setRegistryResponse] =
    useState<SaveReportsListResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [phase, setPhase] = useState<"country" | "crawl">("country");
  const [countryInput, setCountryInput] = useState("");
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runFinishedAt, setRunFinishedAt] = useState<number | null>(null);
  const runIdRef = useRef(0);

  const {
    runForUrls,
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
  } = runPipeline;

  const emitSaved = (response: SaveReportsListResponse) => {
    setRegistryResponse(response);
    for (const success of response.successes) {
      onSaved?.(success);
    }
    if (response.successes.length > 0) {
      toast.success(
        t("overview.coverage.crawlReportsSaved", {
          count: response.successes.length,
        }),
      );
    }
  };

  useEffect(() => {
    if (!open) return;
    runIdRef.current += 1;
    setPhase("country");
    setCountryInput("");
    setIsCrawling(false);
    setCrawlProgress(null);
    setCrawlError(null);
    setCompanyReports(null);
    setSelectedReports([]);
    setRegistryResponse(null);
    setIsSaving(false);
    setIsRunModalOpen(false);
    setRunStartedAt(null);
    setRunFinishedAt(null);
  }, [open]);

  const startCrawl = (country: string | undefined) => {
    if (entries.length === 0 || isCrawling) return;

    const runId = ++runIdRef.current;
    setPhase("crawl");
    setIsCrawling(true);
    setCrawlProgress(null);
    setCrawlError(null);
    setCompanyReports(null);
    setSelectedReports([]);
    setRegistryResponse(null);
    setRunStartedAt(Date.now());
    setRunFinishedAt(null);

    void (async () => {
      try {
        let savedDuringCrawl = false;
        const results = await searchCompanyReports({
          companies: entries.map((entry) => coverageEntryCrawlCompany(entry)),
          country,
          onProgress: (progress) => {
            if (runId !== runIdRef.current) return;
            setCrawlProgress(progress);
          },
          onLabeledSaved: (saved) => {
            savedDuringCrawl = true;
            if (runId !== runIdRef.current) return;
            emitSaved(saved);
          },
        });
        if (runId !== runIdRef.current) return;
        const withWiki = applyWikidataFromEntries(results, entries);
        setCompanyReports(withWiki);
        if (!savedDuringCrawl) {
          try {
            const saved = await saveLabeledSearchResults(withWiki);
            emitSaved(saved ?? { message: "", successes: [], failed: [] });
          } catch (saveError) {
            toast.error(
              saveError instanceof Error
                ? saveError.message
                : t("overview.coverage.crawlReportsSaveFailed"),
            );
          }
        }
        if (
          results.length > 0 &&
          results.every((report) => Boolean(report.crawlError))
        ) {
          const message = t("overview.coverage.crawlReportsAllFailed");
          setCrawlError(message);
          toast.error(message);
        }
      } catch (error) {
        if (runId !== runIdRef.current) return;
        setCrawlError(
          error instanceof Error
            ? error.message
            : t("overview.coverage.findReportError"),
        );
      } finally {
        if (runId === runIdRef.current) {
          setIsCrawling(false);
          setCrawlProgress(null);
          setRunFinishedAt(Date.now());
        }
      }
    })();
  };

  const runModalItems = useMemo((): RunReportListItem[] => {
    return selectedReports.map((report) => {
      const entry = coverageEntryForSavedReport(entries, report);
      return {
        url: report.url,
        companyId: entry?.matchedCompany?.id ?? null,
        companyName: report.companyName,
        reportYear: report.reportYear,
        wikidataId:
          report.wikidataId ?? entry?.matchedCompany?.wikidataId ?? null,
      };
    });
  }, [entries, selectedReports]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isCrawling) return;
    onOpenChange(nextOpen);
  };

  const handleSelectReport = (
    companyName: string,
    report: SelectedReport | null,
  ) => {
    setSelectedReports((previous) => {
      if (report) {
        return [
          ...previous.filter((item) => item.companyName !== companyName),
          report,
        ];
      }
      return previous.filter((item) => item.companyName !== companyName);
    });
  };

  const handleSaveToRegistry = async () => {
    if (selectedReports.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const response = await saveToRegistry(selectedReports);
      if (response) emitSaved(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("overview.coverage.findReportError");
      setRegistryResponse({
        message: errorMessage,
        successes: [],
        failed: selectedReports.map((report) => ({
          companyName: report.companyName,
          reportYear: report.reportYear,
          error: "unknown",
          message: errorMessage,
        })),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const allFetchedToSave = useMemo(
    () =>
      companyReports ? labeledHitsToSelectedReports(companyReports) : [],
    [companyReports],
  );

  const handleSaveAllFetched = async () => {
    if (allFetchedToSave.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const response = await saveToRegistry(allFetchedToSave);
      emitSaved(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("overview.coverage.crawlReportsSaveFailed");
      toast.error(errorMessage);
      setRegistryResponse({
        message: errorMessage,
        successes: [],
        failed: allFetchedToSave.map((report) => ({
          companyName: report.companyName,
          reportYear: report.reportYear,
          error: "unknown",
          message: errorMessage,
        })),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalRun = () => {
    const urls = selectedReports
      .map((report) => report.url?.trim())
      .filter((url): url is string => Boolean(url));
    if (urls.length === 0) return;
    void runForUrls(urls, {
      runItems: runModalItems,
      onSuccess: () => setIsRunModalOpen(false),
    });
  };

  const responseType = !registryResponse
    ? null
    : registryResponse.successes.length === 0 &&
        registryResponse.failed.length === 0
      ? "empty"
      : registryResponse.failed.length === 0
        ? "success"
        : registryResponse.successes.length > 0
          ? "partial"
          : "failed";

  const responseStatusClassName =
    responseType === "success"
      ? "text-green-03"
      : responseType === "partial"
        ? "text-yellow-400"
        : responseType === "failed"
          ? "text-pink-03"
          : "text-gray-01";

  const busy = isCrawling || isSaving || isRunningReports;
  const awaitingCountry = phase === "country";
  const elapsedMs = useElapsedMs(runStartedAt, runFinishedAt);
  const crawlStats = useMemo(() => {
    if (!companyReports) return null;
    const accessible = (hit: CompanyReport["results"][number]) =>
      Boolean(hit.url?.trim()) && !hit.fetchFailed;
    return {
      companies: companyReports.length,
      withPdfs: companyReports.filter((report) =>
        report.results.some(accessible),
      ).length,
      apiFailed: companyReports.filter((report) =>
        Boolean(report.crawlError),
      ).length,
      pdfCount: companyReports.reduce(
        (count, report) => count + report.results.filter(accessible).length,
        0,
      ),
    };
  }, [companyReports]);
  const runFinished = phase === "crawl" && !isCrawling && companyReports != null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={`flex flex-col gap-0 overflow-hidden p-0 ${
            awaitingCountry
              ? "w-[min(100vw-2rem,28rem)] sm:max-w-md"
              : "w-[min(100vw-2rem,56rem)] max-h-[min(88vh,56rem)] sm:max-w-4xl"
          }`}
          onPointerDownOutside={(event) => {
            if (isCrawling) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (isCrawling) event.preventDefault();
          }}
        >
          <DialogHeader className="shrink-0 space-y-2 border-b border-gray-03/60 px-6 pb-4 pt-6 pr-12">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle>
                  {awaitingCountry
                    ? t("overview.coverage.crawlReportsCountryTitle")
                    : runFinished
                      ? t("overview.coverage.crawlReportsComplete")
                      : t("overview.coverage.crawlReportsTitle")}
                </DialogTitle>
                <DialogDescription className="text-left leading-relaxed">
                  {awaitingCountry
                    ? t("overview.coverage.crawlReportsCountryDescription", {
                        count: entries.length,
                      })
                    : t("overview.coverage.crawlReportsDescription", {
                        count: entries.length,
                      })}
                </DialogDescription>
              </div>
              {elapsedMs != null && !awaitingCountry ? (
                <span
                  className={`shrink-0 tabular-nums text-sm font-medium ${
                    isCrawling ? "text-orange-03" : "text-gray-02"
                  }`}
                >
                  {t("crawler.autoSearchElapsed", {
                    time: formatElapsedMs(elapsedMs),
                  })}
                </span>
              ) : null}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {awaitingCountry ? (
              <div className="space-y-2">
                <label
                  htmlFor="coverage-crawl-country"
                  className="block text-sm font-medium text-gray-01"
                >
                  {t("crawler.country")}
                  <span className="ml-1 font-normal text-gray-02">
                    ({t("common.optional")})
                  </span>
                </label>
                <input
                  id="coverage-crawl-country"
                  autoFocus
                  value={countryInput}
                  onChange={(event) => setCountryInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      startCrawl(countryInput.trim() || undefined);
                    }
                  }}
                  placeholder={t(
                    "overview.coverage.crawlReportsCountryPlaceholder",
                  )}
                  className="w-full rounded-lg border border-gray-03 bg-gray-03/20 px-3 py-2 text-sm text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
                />
              </div>
            ) : null}

            {isCrawling ? (
              <div className="flex items-center justify-center py-10">
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
                  <div>
                    <p className="text-lg text-gray-01 font-medium">
                      {t("crawler.loadingResults")}
                    </p>
                    <p className="text-sm text-gray-02 mt-2">
                      {crawlProgress
                        ? crawlProgress.companyIndex === 0
                          ? t("crawler.crawlProgressStarting", {
                              companyTotal: crawlProgress.companyTotal,
                              parallel:
                                crawlProgress.parallel ??
                                AUTO_SEARCH_CRAWL_CONCURRENCY,
                            })
                          : t("crawler.crawlProgress", {
                              company: crawlProgress.companyName,
                              completed: crawlProgress.companyIndex,
                              companyTotal: crawlProgress.companyTotal,
                            })
                        : t("crawler.loadingDescription")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {runFinished && crawlStats ? (
              <div className="space-y-4 rounded-lg border border-gray-03/60 bg-gray-05/40 p-4">
                <h3 className="text-base font-semibold text-gray-01">
                  {t("overview.coverage.crawlReportsComplete")}
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {elapsedMs != null ? (
                    <>
                      <dt className="text-gray-02">
                        {t("crawler.autoSearchStatsElapsed")}
                      </dt>
                      <dd className="font-medium tabular-nums text-gray-01">
                        {formatElapsedMs(elapsedMs)}
                      </dd>
                    </>
                  ) : null}
                  <dt className="text-gray-02">
                    {t("crawler.autoSearchStatsCompanies")}
                  </dt>
                  <dd className="font-medium text-gray-01">
                    {crawlStats.companies}
                  </dd>
                  <dt className="text-gray-02">
                    {t("crawler.autoSearchStatsWithResults")}
                  </dt>
                  <dd className="font-medium text-gray-01">
                    {crawlStats.withPdfs}
                  </dd>
                  <dt className="text-gray-02">
                    {t("overview.coverage.crawlReportsStatsApiFailed")}
                  </dt>
                  <dd className="font-medium text-gray-01">
                    {crawlStats.apiFailed}
                  </dd>
                  <dt className="text-gray-02">
                    {t("crawler.autoSearchStatsFetched")}
                  </dt>
                  <dd className="font-medium text-gray-01">
                    {crawlStats.pdfCount}
                  </dd>
                  <dt className="text-gray-02">
                    {t("crawler.autoSearchStatsAdded")}
                  </dt>
                  <dd className="font-medium text-gray-01">
                    {registryResponse?.successes.length ?? 0}
                  </dd>
                </dl>
                {registryResponse ? (
                  <>
                    <p className="text-sm text-gray-02">
                      {t("crawler.registryStatus")}:{" "}
                      <span className={responseStatusClassName}>
                        {responseType === "success"
                          ? t("crawler.successful")
                          : responseType === "partial"
                            ? t("crawler.partiallySuccessful")
                            : responseType === "failed"
                              ? t("crawler.failed")
                              : t("overview.coverage.crawlReportsNoneSaved")}
                      </span>
                    </p>
                    {registryResponse.successes.length > 0 ? (
                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-01">
                          {t("crawler.successful")}:
                        </p>
                        <RegistryList
                          variant="success"
                          items={registryResponse.successes}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-02">
                        {t("overview.coverage.crawlReportsNoneSaved")}
                      </p>
                    )}
                    {registryResponse.failed.length > 0 ? (
                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-01">
                          {t("crawler.failed")}:
                        </p>
                        <RegistryList
                          variant="failed"
                          items={registryResponse.failed}
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {crawlError ? (
              <p className="text-sm text-pink-03">{crawlError}</p>
            ) : null}

            {!isCrawling && companyReports ? (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-01">
                  {t("crawler.searchResults")}
                </h3>
                {companyReports.map((report, index) => (
                  <SearchResultItem
                    key={`${report.companyName}-${index}`}
                    companyReport={report}
                    selectedReport={
                      selectedReports.find(
                        (item) => item.companyName === report.companyName,
                      )?.url
                    }
                    onSelect={(companyName, url) => {
                      const hit = report.results.find(
                        (result) => result.url === url,
                      );
                      handleSelectReport(
                        companyName,
                        url
                          ? {
                              companyName,
                              reportYear:
                                hit?.reportYear?.trim() ||
                                inferReportYearFromUrl(url, hit?.title),
                              url,
                              wikidataId: report.wikidataId,
                              reportTypeSlug: fallbackReportTypeSlug(
                                hit?.reportTypeSlug,
                              ),
                              s3Url: hit?.s3Url ?? undefined,
                              s3Key: hit?.s3Key ?? undefined,
                              s3Bucket: hit?.s3Bucket ?? undefined,
                              sha256: hit?.sha256 ?? undefined,
                            }
                          : null,
                      );
                    }}
                    initialExpanded={companyReports.length === 1}
                    variant="embedded"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-3 border-t border-gray-03/60 bg-gray-05/40 px-6 py-4">
            {awaitingCountry ? (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-nowrap sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="whitespace-nowrap"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => startCrawl(countryInput.trim() || undefined)}
                  className="whitespace-nowrap"
                >
                  {t("overview.coverage.crawlReports", {
                    count: entries.length,
                  })}
                  <WandIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <p className="w-full text-left text-xs leading-relaxed text-gray-02">
                  {t("overview.coverage.findReportActionsHint")}
                </p>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-nowrap sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isCrawling}
                    className="whitespace-nowrap"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void handleSaveAllFetched()}
                    disabled={allFetchedToSave.length === 0 || busy}
                    className="whitespace-nowrap"
                  >
                    {isSaving
                      ? t("overview.coverage.findReportSaving")
                      : t("overview.coverage.crawlReportsSaveAll", {
                          count: allFetchedToSave.length,
                        })}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void handleSaveToRegistry()}
                    disabled={selectedReports.length === 0 || busy}
                    className="whitespace-nowrap"
                  >
                    {isSaving
                      ? t("overview.coverage.findReportSaving")
                      : t("overview.coverage.findReportSaveToRegistry")}
                  </Button>
                  <Button
                    onClick={() => setIsRunModalOpen(true)}
                    disabled={selectedReports.length === 0 || busy}
                    className="whitespace-nowrap"
                  >
                    {t("crawler.runSelectedReports")}
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RunReportsModal
        open={isRunModalOpen}
        onOpenChange={setIsRunModalOpen}
        items={runModalItems}
        autoApprove={autoApprove}
        onAutoApproveChange={setAutoApprove}
        runOptions={runOptions}
        onRunReports={handleModalRun}
        isRunning={isRunningReports}
      />
    </>
  );
}
