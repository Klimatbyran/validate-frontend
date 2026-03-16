import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { ViewModePills } from "@/ui/view-mode-pills";
import { searchCompanyReports } from "./lib/crawler-utils";
import { Loader2 } from "lucide-react";
import type {
  CompanyReport,
  SelectedReport,
  CrawlerViewMode,
  SaveReportsListResponse,
} from "./lib/crawler-types";
import SearchResultsList from "./components/SearchResultsList";
import CompaniesNamesList from "./components/CompaniesNamesList";
import ManualSearchControls from "./components/ManualSearchControls";
import DatabaseSearchControls from "./components/DatabaseSearchControls";
import WaitingRoomList from "./components/WaitingRoomList";
import { writeCrawledReportsToCsv } from "./lib/crawler-utils";
import { saveToWaitingRoom } from "./lib/crawler-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

export function CrawlerTab() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<CrawlerViewMode>("manual");
  const [manualReports, setManualReports] = useState<CompanyReport[] | null>(
    null,
  );
  const [databaseReports, setDatabaseReports] = useState<
    CompanyReport[] | null
  >(null);
  const [companyNameInput, setCompanyNameInput] = useState<string>("");
  const [reportYearInput, setReportYearInput] = useState<string>("");
  const [filterEnabled, setFilterEnabled] = useState<boolean>(false);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [selectedReports, setSelectedReports] = useState<SelectedReport[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean | null>(null);
  const [waitingRoomResponse, setWaitingRoomResponse] =
    useState<SaveReportsListResponse | null>(null);

  const viewModeOptions = [
    { value: "manual" as const, label: t("crawler.crawlerMode") },
    { value: "database" as const, label: t("crawler.databaseMode") },
  ];

  const handleManualSearchClick = async () => {
    if (!companyNameInput || !reportYearInput) return;

    setIsLoading(true);
    const companyNames = companyNameInput
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);

    try {
      const transformedData = await searchCompanyReports({
        companyNames,
        reportYear: reportYearInput,
      });

      setManualReports(transformedData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReport = (
    companyName: string,
    report: SelectedReport | null,
  ) => {
    setSelectedReports((prev) => {
      if (report) {
        const filtered = prev.filter((r) => r.companyName !== companyName);
        return [...filtered, report];
      } else {
        return prev.filter((r) => r.companyName !== companyName);
      }
    });
  };

  const handleAddToWaitingRoomClick = async () => {
    if (!selectedReports || !selectedReports.length) return;

    try {
      const response = await saveToWaitingRoom(selectedReports);
      if (response) {
        setWaitingRoomResponse(response);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setWaitingRoomResponse({
        message: errorMessage,
        successes: [],
        failed: selectedReports.map((r) => ({
          companyName: r.companyName,
          reportYear: r.reportYear,
          error: "unknown",
          message: errorMessage,
        })),
      });
    }
  };

  const handleExportClick = () => {
    if (!selectedReports || !selectedReports.length) return;

    writeCrawledReportsToCsv(selectedReports);
  };

  const handleSearchInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setCompanyNameInput(e.target.value);
  };

  const handleReportYearInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setReportYearInput(e.target.value);
  };

  const handleDatabaseSearchClick = async () => {
    if (!selectedCompanies.length || !reportYearInput) return;

    setIsLoading(true);

    try {
      const transformedData = await searchCompanyReports({
        companyNames: selectedCompanies,
        reportYear: reportYearInput,
      });

      setDatabaseReports(transformedData);
    } finally {
      setIsLoading(false);
    }
  };

  const responseType = !waitingRoomResponse
    ? null
    : waitingRoomResponse.failed.length === 0
      ? "success"
      : waitingRoomResponse.failed.length > 0 &&
          waitingRoomResponse.successes.length > 0
        ? "partial"
        : "failed";

  const responseStatus =
    responseType === "success"
      ? t("crawler.successful")
      : responseType === "partial"
        ? t("crawler.partiallySuccessful")
        : responseType === "failed"
          ? t("crawler.failed")
          : "";

  const responseStatusClassName =
    responseType === "success"
      ? "text-green-600"
      : responseType === "partial"
        ? "text-yellow-600"
        : responseType === "failed"
          ? "text-red-600"
          : "text-gray-01";

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
      >
        {waitingRoomResponse && (
          <Dialog
            open={waitingRoomResponse !== null}
            onOpenChange={() => setWaitingRoomResponse(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("crawler.waitingRoomResults")}</DialogTitle>
                <DialogDescription className="text-md">
                  {t("crawler.waitingRoomStatus")}:{" "}
                  <span className={responseStatusClassName}>
                    {responseStatus}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 pt-4">
                {waitingRoomResponse.successes &&
                  waitingRoomResponse.successes.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-01 font-medium mb-2">
                        {t("crawler.successful")}:
                      </p>
                      <WaitingRoomList
                        variant="success"
                        items={waitingRoomResponse.successes}
                      />
                    </div>
                  )}

                {waitingRoomResponse.failed &&
                  waitingRoomResponse.failed.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-01 font-medium mb-2">
                        {t("crawler.failed")}:
                      </p>
                      <WaitingRoomList
                        variant="failed"
                        items={waitingRoomResponse.failed}
                      />
                    </div>
                  )}
              </div>
            </DialogContent>
          </Dialog>
        )}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-01">
            {t("crawler.title")}
          </h2>
          <ViewModePills
            options={viewModeOptions}
            value={viewMode}
            onValueChange={setViewMode}
            ariaLabel={t("crawler.viewMode")}
          />
        </div>

        <div className="flex flex-col gap-2 justify-center">
          {viewMode === "manual" && (
            <>
              <ManualSearchControls
                onCompanyNamesChange={handleSearchInputChange}
                onReportYearChange={handleReportYearInputChange}
                onSearch={handleManualSearchClick}
                onExport={handleExportClick}
                isSearchDisabled={!companyNameInput || !reportYearInput}
                selectedReports={selectedReports}
                handleAddToWaitingRoomClick={handleAddToWaitingRoomClick}
              />
              {(!companyNameInput || !reportYearInput) && (
                <p className="text-sm text-gray-02 mt-4">
                  {t("crawler.manualSearchGuard")}
                </p>
              )}
            </>
          )}

          {viewMode === "database" && (
            <>
              <DatabaseSearchControls
                onReportYearChange={handleReportYearInputChange}
                onSearch={handleDatabaseSearchClick}
                isSearchDisabled={!selectedCompanies.length || !reportYearInput}
                selectedReports={selectedReports}
                onExport={handleExportClick}
                filterEnabled={filterEnabled}
                setFilterEnabled={setFilterEnabled}
                filterYear={filterYear}
                setFilterYear={setFilterYear}
                searchYear={reportYearInput}
                handleAddToWaitingRoomClick={handleAddToWaitingRoomClick}
              />
              {(!reportYearInput || !selectedCompanies.length) && (
                <p className="text-sm text-gray-02 mt-4">
                  {t("crawler.databaseSearchGuard")}
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
            <div>
              <p className="text-lg text-gray-01 font-medium">
                {t("crawler.loadingResults")}
              </p>
              <p className="text-sm text-gray-02 mt-2">
                {t("crawler.loadingDescription")}
              </p>
            </div>
          </div>
        </div>
      )}
      {viewMode === "manual" && manualReports && (
        <SearchResultsList
          companyReports={manualReports}
          reportYear={reportYearInput}
          selectedReports={selectedReports}
          handleSelectReport={handleSelectReport}
        />
      )}

      {viewMode === "database" && databaseReports && (
        <SearchResultsList
          companyReports={databaseReports}
          reportYear={reportYearInput}
          selectedReports={selectedReports}
          handleSelectReport={handleSelectReport}
        />
      )}

      {viewMode === "database" && !databaseReports && (
        <CompaniesNamesList
          setIsLoading={setIsLoading}
          selectedCompanies={selectedCompanies}
          onSelectionChange={setSelectedCompanies}
          filterYear={filterYear}
          filterEnabled={filterEnabled}
        />
      )}
    </div>
  );
}
