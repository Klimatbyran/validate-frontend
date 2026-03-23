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
import RegistryList from "./components/RegistryList";
import { writeCrawledReportsToCsv } from "./lib/crawler-utils";
import { saveToRegistry } from "./lib/crawler-api";
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
  const [registryResponse, setRegistryResponse] =
    useState<SaveReportsListResponse | null>(null);

  const viewModeOptions = [
    { value: "manual" as const, label: t("crawler.crawlerMode") },
    { value: "database" as const, label: t("crawler.databaseMode") },
  ];

  const resetSearchSlate = ({
    clearCompanySelection = false,
  }: { clearCompanySelection?: boolean } = {}) => {
    setSelectedReports([]);
    setManualReports(null);
    setDatabaseReports(null);

    if (clearCompanySelection) {
      setSelectedCompanies([]);
    }
  };

  const handleManualSearchClick = async () => {
    if (!companyNameInput || !reportYearInput) return;

    resetSearchSlate();
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

  const handleAddToRegistryClick = async () => {
    if (!selectedReports || !selectedReports.length) return;

    try {
      const response = await saveToRegistry(selectedReports);
      if (response) {
        setRegistryResponse(response);
        resetSearchSlate({ clearCompanySelection: true });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setRegistryResponse({
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
    resetSearchSlate({ clearCompanySelection: true });
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

    const companyNames = selectedCompanies;
    resetSearchSlate();
    setIsLoading(true);

    try {
      const transformedData = await searchCompanyReports({
        companyNames,
        reportYear: reportYearInput,
      });

      setDatabaseReports(transformedData);
    } finally {
      setIsLoading(false);
    }
  };

  const responseType = !registryResponse
    ? null
    : registryResponse.failed.length === 0
      ? "success"
      : registryResponse.failed.length > 0 &&
          registryResponse.successes.length > 0
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
        {registryResponse && (
          <Dialog
            open={registryResponse !== null}
            onOpenChange={() => setRegistryResponse(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("crawler.registryResults")}</DialogTitle>
                <DialogDescription className="text-md">
                  {t("crawler.registryStatus")}:{" "}
                  <span className={responseStatusClassName}>
                    {responseStatus}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 pt-4">
                {registryResponse.successes &&
                  registryResponse.successes.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-01 font-medium mb-2">
                        {t("crawler.successful")}:
                      </p>
                      <RegistryList
                        variant="success"
                        items={registryResponse.successes}
                      />
                    </div>
                  )}

                {registryResponse.failed &&
                  registryResponse.failed.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-01 font-medium mb-2">
                        {t("crawler.failed")}:
                      </p>
                      <RegistryList
                        variant="failed"
                        items={registryResponse.failed}
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
                handleAddToRegistryClick={handleAddToRegistryClick}
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
                handleAddToRegistryClick={handleAddToRegistryClick}
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
