import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchCompanyReports } from "./lib/crawler-utils";
import { CompanyReport } from "./lib/crawler-types";
import SearchResultsList from "./components/SearchResultsList";
import CompaniesNamesList from "./components/CompaniesNamesList";
import ManualSearchControls from "./components/ManualSearchControls";
import DatabaseSearchControls from "./components/DatabaseSearchControls";

type CrawlerViewMode = "manual" | "database";

const VIEW_MODES: { value: CrawlerViewMode; label: string }[] = [
  { value: "manual", label: "Manual Search" },
  { value: "database", label: "Database Search" },
];

export function CrawlerTab() {
  const [viewMode, setViewMode] = useState<CrawlerViewMode>("manual");
  const [companyNameInput, setCompanyNameInput] = useState<string>("");
  const [reportYearInput, setReportYearInput] = useState<string>("");
  const [manualReports, setManualReports] = useState<CompanyReport[] | null>(
    null,
  );
  const [databaseReports, setDatabaseReports] = useState<
    CompanyReport[] | null
  >(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean | null>(null);

  const handleSearchClick = async () => {
    if (!companyNameInput || !reportYearInput) return;

    setIsLoading(true);
    const companyNames = companyNameInput
      .split(",")
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

  const handleSearchInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setCompanyNameInput(e.target.value);
  };

  const handleReportYearInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
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

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-01">Crawler</h2>
          <div className="flex rounded-full overflow-hidden border border-gray-02/20 bg-gray-04/50 p-1">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-all",
                  viewMode === mode.value
                    ? "bg-gray-01 text-gray-05 shadow-sm"
                    : "text-gray-02 hover:text-gray-01",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 justify-center">
          {viewMode === "manual" && (
            <>
              <ManualSearchControls
                onCompanyNamesChange={handleSearchInputChange}
                onReportYearChange={handleReportYearInputChange}
                onSearch={handleSearchClick}
                isSearchDisabled={!companyNameInput || !reportYearInput}
              />
              {(!companyNameInput || !reportYearInput) && (
                <p className="text-sm text-gray-02 mt-4">
                  Enter at least one company and a report year to search.
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
              />
              {(!reportYearInput || !selectedCompanies.length) && (
                <p className="text-sm text-gray-02 mt-4">
                  Select at least one company and enter a report year to search.
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
                Loading results...
              </p>
              <p className="text-sm text-gray-02 mt-2">
                Hang in there as this may take a moment.
              </p>
            </div>
          </div>
        </div>
      )}
      {viewMode === "manual" && manualReports && (
        <SearchResultsList
          setCompanyReports={setManualReports}
          companyReports={manualReports}
        />
      )}

      {viewMode === "database" && databaseReports && (
        <SearchResultsList
          setCompanyReports={setDatabaseReports}
          companyReports={databaseReports}
        />
      )}

      {viewMode === "database" && !databaseReports && (
        <CompaniesNamesList
          setIsLoading={setIsLoading}
          selectedCompanies={selectedCompanies}
          onSelectionChange={setSelectedCompanies}
        />
      )}
    </div>
  );
}
