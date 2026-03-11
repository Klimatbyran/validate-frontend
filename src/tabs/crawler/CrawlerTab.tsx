import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { ViewModePills } from "@/ui/view-mode-pills";
import { searchCompanyReports } from "./lib/crawler-utils";
import { Loader2 } from "lucide-react";
import { CompanyReport, LockedReport } from "./lib/crawler-types";
import SearchResultsList from "./components/SearchResultsList";
import CompaniesNamesList from "./components/CompaniesNamesList";
import ManualSearchControls from "./components/ManualSearchControls";
import DatabaseSearchControls from "./components/DatabaseSearchControls";
import { writeCrawledReportsToCsv } from "./lib/crawler-utils";

type CrawlerViewMode = "manual" | "database";

export function CrawlerTab() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<CrawlerViewMode>("manual");
  const [companyNameInput, setCompanyNameInput] = useState<string>("");
  const [reportYearInput, setReportYearInput] = useState<string>("");
  const [filterEnabled, setFilterEnabled] = useState<boolean>(false);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [manualReports, setManualReports] = useState<CompanyReport[] | null>(
    null,
  );
  const [databaseReports, setDatabaseReports] = useState<
    CompanyReport[] | null
  >(null);
  const [lockedReports, setLockedReports] = useState<LockedReport[]>([]);
  const [selectedReports, setSelectedReports] = useState<
    Record<string, string>
  >({});
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean | null>(null);

  const viewModeOptions = [
    { value: "manual" as const, label: t("crawler.crawlerMode") },
    { value: "database" as const, label: t("crawler.databaseMode") },
  ];

  const handleSearchClick = async () => {
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

  const handleExportClick = () => {
    if (!lockedReports || !lockedReports.length) return;

    writeCrawledReportsToCsv(lockedReports);
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

  const handleLockReports = () => {
    const newLocked = Object.entries(selectedReports).map(
      ([companyName, url]) => ({
        companyName,
        reportYear: reportYearInput,
        url,
      }),
    );
    setLockedReports((prev) => [
      ...prev.filter((r) => !selectedReports[r.companyName]),
      ...newLocked,
    ]);
  };

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
      >
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
                onSearch={handleSearchClick}
                onExport={handleExportClick}
                isSearchDisabled={!companyNameInput || !reportYearInput}
                isExportDisabled={!lockedReports.length}
                onLockReports={handleLockReports}
                selectedReports={selectedReports}
                isLockDisabled={Object.keys(selectedReports).length === 0}
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
                onLockReports={handleLockReports}
                selectedReports={selectedReports}
                onExport={handleExportClick}
                isExportDisabled={!lockedReports.length}
                isLockDisabled={Object.keys(selectedReports).length === 0}
                filterEnabled={filterEnabled}
                setFilterEnabled={setFilterEnabled}
                filterYear={filterYear}
                setFilterYear={setFilterYear}
                searchYear={reportYearInput}
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
          setManualReports={setManualReports}
          setLockedReports={setLockedReports}
          lockedReports={lockedReports}
          companyReports={manualReports}
          reportYear={reportYearInput}
          selectedReports={selectedReports}
          setSelectedReports={setSelectedReports}
        />
      )}

      {viewMode === "database" && databaseReports && (
        <SearchResultsList
          setLockedReports={setLockedReports}
          lockedReports={lockedReports}
          setManualReports={setDatabaseReports}
          companyReports={databaseReports}
          reportYear={reportYearInput}
          selectedReports={selectedReports}
          setSelectedReports={setSelectedReports}
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
