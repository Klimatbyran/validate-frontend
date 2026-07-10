import { useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { RunReportsModal } from "@/components/RunReportsModal";
import { useRunReportsPipeline } from "@/hooks/useRunReportsPipeline";
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
import RegistryList from "@/tabs/crawler/components/RegistryList";
import { saveToRegistry } from "@/tabs/crawler/lib/crawler-api";
import type {
  CompanyReport,
  SaveReportsListResponse,
  SelectedReport,
} from "@/tabs/crawler/lib/crawler-types";
import type { CoverageEntry } from "@/tabs/overview/lib/coverage-types";

type CoverageFindReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CoverageEntry;
  reportYear: number;
  companyReport: CompanyReport | null;
  onSaved?: () => void;
};

export function CoverageFindReportDialog({
  open,
  onOpenChange,
  entry,
  reportYear,
  companyReport,
  onSaved,
}: CoverageFindReportDialogProps) {
  const { t } = useI18n();
  const reportYearLabel = String(reportYear);
  const [selectedReport, setSelectedReport] = useState<SelectedReport | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [registryResponse, setRegistryResponse] =
    useState<SaveReportsListResponse | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  const {
    runForUrls,
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
  } = useRunReportsPipeline();

  const reportWithWikidata = useMemo((): CompanyReport | null => {
    if (!companyReport) return null;
    return {
      ...companyReport,
      wikidataId: companyReport.wikidataId ?? entry.matchedCompany?.wikidataId,
    };
  }, [companyReport, entry.matchedCompany?.wikidataId]);

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
    if (!nextOpen) {
      setSelectedReport(null);
      setRegistryResponse(null);
      setIsSaving(false);
      setIsRunModalOpen(false);
    }
    onOpenChange(nextOpen);
  };

  const handleSelectReport = (companyName: string, url: string | null) => {
    if (!url) {
      setSelectedReport(null);
      return;
    }
    setSelectedReport({
      companyName,
      reportYear: reportYearLabel,
      url,
      wikidataId: reportWithWikidata?.wikidataId,
    });
  };

  const handleSaveToRegistry = async () => {
    if (!selectedReport) return;

    setIsSaving(true);
    try {
      const response = await saveToRegistry([selectedReport]);
      setRegistryResponse(response);
      if (response.successes.length > 0) {
        onSaved?.();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("overview.coverage.findReportError");
      setRegistryResponse({
        message: errorMessage,
        successes: [],
        failed: [
          {
            companyName: selectedReport.companyName,
            reportYear: selectedReport.reportYear,
            error: "unknown",
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
      onSuccess: () => {
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex w-[min(100vw-2rem,48rem)] max-h-[min(88vh,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 space-y-2 border-b border-gray-03/60 px-6 pb-4 pt-6 pr-12">
            <DialogTitle>{t("overview.coverage.findReportTitle")}</DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              {t("overview.coverage.findReportDescription", {
                name: entry.name,
                year: reportYearLabel,
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
            ) : reportWithWikidata ? (
              reportWithWikidata.results.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-02">
                  {t("overview.coverage.findReportNoResults")}
                </p>
              ) : (
                <SearchResultItem
                  companyReport={reportWithWikidata}
                  selectedReport={selectedReport?.url}
                  onSelect={handleSelectReport}
                  initialExpanded
                  variant="embedded"
                />
              )
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-3 border-t border-gray-03/60 bg-gray-05/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            {registryResponse ? (
              <Button
                className="w-full sm:ml-auto sm:w-auto"
                variant="secondary"
                onClick={() => handleOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
            ) : (
              <>
                <p className="text-left text-xs leading-relaxed text-gray-02 sm:max-w-[55%]">
                  {t("overview.coverage.findReportActionsHint")}
                </p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isSaving || isRunningReports}
                    className="w-full sm:w-auto"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void handleSaveToRegistry()}
                    disabled={!selectedReport || isSaving || isRunningReports}
                    className="w-full sm:w-auto"
                  >
                    {isSaving
                      ? t("overview.coverage.findReportSaving")
                      : t("overview.coverage.findReportSaveToRegistry")}
                  </Button>
                  <Button
                    onClick={handleRunPipeline}
                    disabled={!selectedReport || isSaving || isRunningReports}
                    className="w-full sm:w-auto"
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
