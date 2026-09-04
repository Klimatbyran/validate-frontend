import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import SearchResultItem from "@/tabs/crawler/components/SearchResultItem";
import ManuallyAddReportItem from "@/tabs/crawler/components/ManuallyAddReportItem";
import { addRegistryEntry } from "@/tabs/registry/lib/registry-api";
import {
  searchCompanyReports,
  selectedReportFromHit,
} from "@/tabs/crawler/lib/crawler-utils";
import type {
  CompanyReport,
  SaveReportSuccess,
  SaveReportsListResponse,
  SelectedReport,
} from "@/tabs/crawler/lib/crawler-types";
import { CoverageRegistrySaveResult } from "@/tabs/overview/components/CoverageRegistrySaveResult";
import {
  linkCoverageEntryReport,
  searchCoverageRegistryReports,
} from "@/tabs/overview/lib/coverage-api";
import type {
  CoverageEntry,
  CoverageRegistryReportSearchHit,
  CoverageYearDetail,
} from "@/tabs/overview/lib/coverage-types";
import { CRAWLER_FEATURES } from "@/config/crawler-features";

type CoverageFindReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  entry: CoverageEntry;
  defaultYear: number;
  onSaved?: (saved: SaveReportSuccess) => void;
  onLinked?: (detail: CoverageYearDetail) => void;
  runPipeline: RunReportsPipelineHandle;
};

function recentYearOptions(anchorYear: number): number[] {
  const current = new Date().getFullYear();
  const years = new Set<number>([anchorYear, current]);
  for (let year = current; year >= current - 8; year -= 1) {
    years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

export function CoverageFindReportDialog({
  open,
  onOpenChange,
  listId,
  entry,
  defaultYear,
  onSaved,
  onLinked,
  runPipeline,
}: CoverageFindReportDialogProps) {
  const { t } = useI18n();
  const companyName = entry.matchedCompany?.name ?? entry.name;
  const [reportYear, setReportYear] = useState(String(defaultYear));
  const [selectedReport, setSelectedReport] = useState<SelectedReport | null>(
    null,
  );
  const [companyReport, setCompanyReport] = useState<CompanyReport | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [registryResponse, setRegistryResponse] =
    useState<SaveReportsListResponse | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [registryQuery, setRegistryQuery] = useState("");
  const [registryHits, setRegistryHits] = useState<
    CoverageRegistryReportSearchHit[]
  >([]);
  const [isSearchingRegistry, setIsSearchingRegistry] = useState(false);
  const [registrySearchError, setRegistrySearchError] = useState<string | null>(
    null,
  );
  const [linkingReportId, setLinkingReportId] = useState<string | null>(null);

  const {
    runForUrls,
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
  } = runPipeline;

  const reportYearLabel = reportYear;
  const yearOptions = recentYearOptions(defaultYear);
  const parsedYear = Number.parseInt(reportYear, 10);
  const isValidYear =
    Number.isFinite(parsedYear) &&
    parsedYear >= 1990 &&
    parsedYear <= new Date().getFullYear() + 1;

  useEffect(() => {
    if (!open) return;
    setReportYear(String(defaultYear));
    setSelectedReport(null);
    setCompanyReport(null);
    setIsSearching(false);
    setSearchError(null);
    setIsSaving(false);
    setRegistryResponse(null);
    setIsRunModalOpen(false);
    setRegistryQuery(companyName);
    setRegistryHits([]);
    setRegistrySearchError(null);
    setLinkingReportId(null);
  }, [open, defaultYear, entry.id, companyName]);

  useEffect(() => {
    if (!open) return;
    const trimmed = registryQuery.trim();
    if (trimmed.length < 2) {
      setRegistryHits([]);
      setRegistrySearchError(null);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      setIsSearchingRegistry(true);
      setRegistrySearchError(null);
      const yearNumber = Number.parseInt(reportYear, 10);
      void searchCoverageRegistryReports(
        trimmed,
        Number.isFinite(yearNumber) ? yearNumber : undefined,
      )
        .then((hits) => {
          if (cancelled) return;
          setRegistryHits(hits);
        })
        .catch((error) => {
          if (cancelled) return;
          setRegistryHits([]);
          setRegistrySearchError(
            error instanceof Error
              ? error.message
              : t("overview.coverage.findReportRegistrySearchError"),
          );
        })
        .finally(() => {
          if (!cancelled) setIsSearchingRegistry(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, registryQuery, reportYear, t]);

  useEffect(() => {
    if (!selectedReport) return;
    setSelectedReport((previous) =>
      previous ? { ...previous, reportYear: reportYearLabel } : previous,
    );
  }, [reportYearLabel]);

  const reportWithWikidata = useMemo((): CompanyReport | null => {
    if (!companyReport) return null;
    return {
      ...companyReport,
      reportYear: reportYearLabel,
      wikidataId: companyReport.wikidataId ?? entry.matchedCompany?.wikidataId,
    };
  }, [companyReport, entry.matchedCompany?.wikidataId, reportYearLabel]);

  const runModalItems = useMemo((): RunReportListItem[] => {
    if (!selectedReport?.url) return [];
    return [
      {
        url: selectedReport.url,
        companyName: selectedReport.companyName,
        reportYear: selectedReport.reportYear,
        wikidataId: selectedReport.wikidataId ?? null,
      },
    ];
  }, [selectedReport]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleSelectReport = (name: string, url: string | null) => {
    if (!url) {
      setSelectedReport(null);
      return;
    }
    const hit = companyReport?.results.find((result) => result.url === url);
    const selected = selectedReportFromHit({
      companyName: name,
      url,
      hit,
      wikidataId: entry.matchedCompany?.wikidataId,
      fallbackYear: reportYearLabel,
    });
    if (!selected) {
      setSelectedReport(null);
      return;
    }
    setSelectedReport(selected);
  };

  const handleLinkRegistryReport = async (
    hit: CoverageRegistryReportSearchHit,
  ) => {
    setLinkingReportId(hit.id);
    setRegistrySearchError(null);
    try {
      const detail = await linkCoverageEntryReport(
        listId,
        defaultYear,
        entry.id,
        hit.id,
      );
      onLinked?.(detail);
      handleOpenChange(false);
    } catch (error) {
      setRegistrySearchError(
        error instanceof Error
          ? error.message
          : t("overview.coverage.findReportLinkError"),
      );
    } finally {
      setLinkingReportId(null);
    }
  };

  const handleSearchOnline = async () => {
    if (!isValidYear || isSearching) return;
    setIsSearching(true);
    setSearchError(null);
    setCompanyReport(null);
    setSelectedReport(null);
    try {
      const results = await searchCompanyReports({
        companies: [
          {
            name: companyName,
            reportYear: reportYearLabel,
            wikidataId: entry.matchedCompany?.wikidataId,
          },
        ],
        onLabeledSaved: (saved) => {
          for (const success of saved.successes) {
            onSaved?.(success);
          }
        },
      });
      setCompanyReport(
        results[0] ?? {
          companyName,
          reportYear: reportYearLabel,
          results: [],
        },
      );
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : t("overview.coverage.findReportError"),
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveToRegistry = async () => {
    if (!selectedReport) return;

    setIsSaving(true);
    try {
      const saved = await addRegistryEntry({
        companyName: selectedReport.companyName,
        reportYear: selectedReport.reportYear,
        url: selectedReport.url,
        sourceUrl: selectedReport.url,
        ...(selectedReport.wikidataId
          ? { wikidataId: selectedReport.wikidataId }
          : {}),
        ...(selectedReport.reportTypeSlug
          ? { reportTypeSlug: selectedReport.reportTypeSlug }
          : {}),
        ...(selectedReport.s3Url ? { s3Url: selectedReport.s3Url } : {}),
        ...(selectedReport.s3Key ? { s3Key: selectedReport.s3Key } : {}),
        ...(selectedReport.s3Bucket
          ? { s3Bucket: selectedReport.s3Bucket }
          : {}),
        ...(selectedReport.sha256 ? { sha256: selectedReport.sha256 } : {}),
      });
      if (!saved.id) {
        throw new Error(t("overview.coverage.findReportError"));
      }
      const success: SaveReportSuccess = {
        id: saved.id,
        companyName: saved.companyName ?? selectedReport.companyName,
        reportYear: saved.reportYear ?? selectedReport.reportYear,
        url: saved.url,
        wikidataId: saved.wikidataId ?? selectedReport.wikidataId ?? null,
        reportTypeId: saved.reportTypeId ?? saved.reportType?.id ?? null,
        reportTypeSlug:
          saved.reportTypeSlug ??
          saved.reportType?.slug ??
          selectedReport.reportTypeSlug ??
          null,
        reportTypeLabel:
          saved.reportTypeLabel ?? saved.reportType?.label ?? null,
      };
      setRegistryResponse({
        message: "",
        successes: [success],
        failed: [],
      });
      onSaved?.(success);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("overview.coverage.findReportError");
      const lower = errorMessage.toLowerCase();
      const isDuplicate =
        lower.includes("duplicate") || lower.includes("already");
      setRegistryResponse({
        message: errorMessage,
        successes: [],
        failed: [
          {
            companyName: selectedReport.companyName,
            reportYear: selectedReport.reportYear,
            error: isDuplicate ? "duplicate" : "unknown",
            message: errorMessage,
          },
        ],
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunPipeline = () => {
    if (!selectedReport?.url) return;
    setIsRunModalOpen(true);
  };

  const handleModalRun = () => {
    const url = selectedReport?.url?.trim();
    if (!url) return;
    void runForUrls([url], {
      runItems: [
        {
          url,
          companyId: entry.matchedCompany?.id ?? null,
          companyName:
            selectedReport?.companyName ??
            entry.matchedCompany?.name ??
            entry.name,
          wikidataId:
            selectedReport?.wikidataId ??
            entry.matchedCompany?.wikidataId ??
            null,
        },
      ],
      onSuccess: () => {
        if (selectedReport) {
          onSaved?.({
            id: url,
            companyName: selectedReport.companyName,
            reportYear: selectedReport.reportYear,
            url,
            wikidataId: selectedReport.wikidataId ?? null,
          });
        }
        setIsRunModalOpen(false);
        handleOpenChange(false);
      },
    });
  };

  const crawlHasResults = (reportWithWikidata?.results.length ?? 0) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex w-[min(100vw-2rem,52rem)] max-h-[min(88vh,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 space-y-2 border-b border-gray-03/60 px-6 pb-4 pt-6 pr-12">
            <DialogTitle>{t("overview.coverage.findReportTitle")}</DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              {t("overview.coverage.findReportDescriptionUnified", {
                name: entry.name,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {registryResponse ? (
              <CoverageRegistrySaveResult response={registryResponse} />
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-01">
                    {t("crawler.reportYear")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {yearOptions.map((year) => {
                      const active = reportYear === String(year);
                      return (
                        <button
                          key={year}
                          type="button"
                          disabled={isSearching || isSaving}
                          onClick={() => setReportYear(String(year))}
                          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                            active
                              ? "border-orange-03 bg-orange-03/20 text-orange-03"
                              : "border-gray-03 text-gray-02 hover:border-gray-02 hover:text-gray-01"
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="number"
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    value={reportYear}
                    disabled={isSearching || isSaving}
                    onChange={(event) => setReportYear(event.target.value)}
                    className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01 focus:outline-none focus:ring-2 focus:ring-orange-03"
                  />
                </div>

                <div className="space-y-3 border-t border-gray-03/60 pt-4">
                  <p className="text-sm font-medium text-gray-01">
                    {t("overview.coverage.findReportRegistrySection")}
                  </p>
                  <input
                    type="search"
                    value={registryQuery}
                    disabled={isSaving || linkingReportId != null}
                    onChange={(event) => setRegistryQuery(event.target.value)}
                    placeholder={t(
                      "overview.coverage.findReportRegistrySearchPlaceholder",
                    )}
                    className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01 focus:outline-none focus:ring-2 focus:ring-orange-03"
                  />
                  {isSearchingRegistry ? (
                    <p className="flex items-center gap-2 text-sm text-gray-02">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("overview.coverage.findReportRegistrySearching")}
                    </p>
                  ) : null}
                  {registrySearchError ? (
                    <p className="text-sm text-pink-03">
                      {registrySearchError}
                    </p>
                  ) : null}
                  {registryHits.length > 0 ? (
                    <ul className="space-y-2">
                      {registryHits.map((hit) => {
                        const alreadyLinked = (
                          entry.registryReports ?? []
                        ).some((report) => report.reportId === hit.id);
                        return (
                          <li
                            key={hit.id}
                            className="flex flex-col gap-2 rounded-md border border-gray-03/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 space-y-1">
                              <p className="truncate text-sm font-medium text-gray-01">
                                {hit.companyName ?? hit.url}
                              </p>
                              <p className="truncate text-xs text-gray-02">
                                {[hit.reportYear, hit.reportTypeLabel, hit.url]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={
                                alreadyLinked ||
                                linkingReportId != null ||
                                isSaving
                              }
                              onClick={() => void handleLinkRegistryReport(hit)}
                            >
                              {linkingReportId === hit.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {t("overview.coverage.findReportLinking")}
                                </>
                              ) : alreadyLinked ? (
                                t("overview.coverage.findReportAlreadyLinked")
                              ) : (
                                t("overview.coverage.findReportLinkExisting")
                              )}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : registryQuery.trim().length >= 2 &&
                    !isSearchingRegistry ? (
                    <p className="text-sm text-gray-02">
                      {t("overview.coverage.findReportRegistryNoResults")}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-01">
                    {t("overview.coverage.findReportManualSection")}
                  </p>
                  <ManuallyAddReportItem
                    companyName={companyName}
                    selectedReport={selectedReport?.url}
                    onSelect={handleSelectReport}
                    variant="embedded"
                  />
                </div>

                {CRAWLER_FEATURES.coverageSearchOnline ? (
                  <div className="space-y-3 border-t border-gray-03/60 pt-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-gray-01">
                        {t("overview.coverage.findReportCrawlSection")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        disabled={!isValidYear || isSearching || isSaving}
                        onClick={() => void handleSearchOnline()}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("overview.coverage.findReportSearching")}
                          </>
                        ) : (
                          t("overview.coverage.findReportSearchOnline")
                        )}
                      </Button>
                    </div>
                    {searchError ? (
                      <p className="text-sm text-pink-03">{searchError}</p>
                    ) : null}
                    {reportWithWikidata ? (
                      crawlHasResults ? (
                        <SearchResultItem
                          companyReport={reportWithWikidata}
                          selectedReport={selectedReport?.url}
                          onSelect={handleSelectReport}
                          initialExpanded
                          variant="embedded"
                        />
                      ) : (
                        <p className="text-sm text-gray-02">
                          {t("overview.coverage.findReportNoResults")}
                        </p>
                      )
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-3 border-t border-gray-03/60 bg-gray-05/40 px-6 py-4">
            {registryResponse ? (
              <div className="flex w-full justify-end">
                <Button
                  variant="secondary"
                  className="whitespace-nowrap"
                  onClick={() => handleOpenChange(false)}
                >
                  {t("common.cancel")}
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
                    disabled={isSaving || isRunningReports || isSearching}
                    className="whitespace-nowrap"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void handleSaveToRegistry()}
                    disabled={
                      !selectedReport ||
                      isSaving ||
                      isRunningReports ||
                      isSearching
                    }
                    className="whitespace-nowrap"
                  >
                    {isSaving
                      ? t("overview.coverage.findReportReuploading")
                      : t("overview.coverage.findReportSaveToRegistry")}
                  </Button>
                  <Button
                    onClick={handleRunPipeline}
                    disabled={
                      !selectedReport ||
                      isSaving ||
                      isRunningReports ||
                      isSearching
                    }
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
