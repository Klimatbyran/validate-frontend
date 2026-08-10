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
import RegistryList from "@/tabs/crawler/components/RegistryList";
import { addRegistryEntry } from "@/tabs/registry/lib/registry-api";
import { searchCompanyReports } from "@/tabs/crawler/lib/crawler-utils";
import type {
  CompanyReport,
  SaveReportSuccess,
  SaveReportsListResponse,
  SelectedReport,
} from "@/tabs/crawler/lib/crawler-types";
import type { CoverageEntry } from "@/tabs/overview/lib/coverage-types";

type CoverageFindReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CoverageEntry;
  defaultYear: number;
  onSaved?: (saved: SaveReportSuccess) => void;
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
  entry,
  defaultYear,
  onSaved,
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
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

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
    setIsPdfPreviewOpen(false);
  }, [open, defaultYear, entry.id]);

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

  const blockDialogDismiss = (event: Event) => {
    if (isPdfPreviewOpen) {
      event.preventDefault();
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPdfPreviewOpen) return;
    onOpenChange(nextOpen);
  };

  const handleSelectReport = (name: string, url: string | null) => {
    if (!url) {
      setSelectedReport(null);
      return;
    }
    setSelectedReport({
      companyName: name,
      reportYear: reportYearLabel,
      url,
      wikidataId: entry.matchedCompany?.wikidataId,
    });
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

  const responseType = !registryResponse
    ? null
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

  const crawlHasResults = (reportWithWikidata?.results.length ?? 0) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex w-[min(100vw-2rem,52rem)] max-h-[min(88vh,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
          onInteractOutside={blockDialogDismiss}
          onPointerDownOutside={blockDialogDismiss}
          onEscapeKeyDown={blockDialogDismiss}
        >
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
              <div className="space-y-4">
                <p className="text-sm text-gray-02">
                  {t("crawler.registryStatus")}:{" "}
                  <span className={responseStatusClassName}>
                    {responseType === "success"
                      ? t("crawler.successful")
                      : responseType === "partial"
                        ? t("crawler.partiallySuccessful")
                        : t("crawler.failed")}
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
                ) : null}
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
              </div>
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
                        onPreviewOpenChange={setIsPdfPreviewOpen}
                      />
                    ) : (
                      <p className="text-sm text-gray-02">
                        {t("overview.coverage.findReportNoResults")}
                      </p>
                    )
                  ) : null}
                </div>
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
