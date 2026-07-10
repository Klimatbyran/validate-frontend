import { useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
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

  const reportWithWikidata = useMemo((): CompanyReport | null => {
    if (!companyReport) return null;
    return {
      ...companyReport,
      wikidataId: companyReport.wikidataId ?? entry.matchedCompany?.wikidataId,
    };
  }, [companyReport, entry.matchedCompany?.wikidataId]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedReport(null);
      setRegistryResponse(null);
      setIsSaving(false);
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

  const handleSave = async () => {
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("overview.coverage.findReportTitle")}</DialogTitle>
          <DialogDescription>
            {t("overview.coverage.findReportDescription", {
              name: entry.name,
              year: reportYearLabel,
            })}
          </DialogDescription>
        </DialogHeader>

        {registryResponse ? (
          <div className="space-y-4 py-2">
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
                <p className="text-sm font-medium text-gray-01 mb-2">
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
                <p className="text-sm font-medium text-gray-01 mb-2">
                  {t("crawler.failed")}:
                </p>
                <RegistryList
                  variant="failed"
                  items={registryResponse.failed}
                />
              </div>
            ) : null}
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => handleOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
            </DialogFooter>
          </div>
        ) : reportWithWikidata ? (
          <>
            <div className="py-2">
              {reportWithWikidata.results.length === 0 ? (
                <p className="text-sm text-gray-02 py-4 text-center">
                  {t("overview.coverage.findReportNoResults")}
                </p>
              ) : (
                <SearchResultItem
                  companyReport={reportWithWikidata}
                  selectedReport={selectedReport?.url}
                  onSelect={handleSelectReport}
                  initialExpanded
                />
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSaving}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={!selectedReport || isSaving}
              >
                {isSaving
                  ? t("overview.coverage.findReportSaving")
                  : t("crawler.addToRegistry")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
