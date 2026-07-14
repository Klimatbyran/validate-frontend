import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { RunReportsModal } from "@/components/RunReportsModal";
import { useRunReportsPipeline } from "@/hooks/useRunReportsPipeline";
import type { RunReportListItem } from "@/lib/run-reports-types";
import { ViewModePills } from "@/ui/view-mode-pills";
import { searchCompanyReports, searchCompanyReportsByNames, type CrawlProgress, AUTO_SEARCH_CRAWL_CONCURRENCY } from "./lib/crawler-utils";
import type { AutoSearchRunParams } from "./hooks/useAutoSearch";
import { Loader2 } from "lucide-react";
import type {
  CompanyReport,
  SelectedReport,
  CrawlerViewMode,
  SaveReportsListResponse,
} from "./lib/crawler-types";

type CompanySelection = { name: string; wikidataId?: string; url?: string };
import SearchResultsList from "./components/SearchResultsList";
import CompaniesNamesList from "./components/CompaniesNamesList";
import ManualSearchControls from "./components/ManualSearchControls";
import DatabaseSearchControls from "./components/DatabaseSearchControls";
import RegistryList from "./components/RegistryList";
import AutoSearchModal from "./components/AutoSearchModal";
import AutoSearchLogButton from "./components/AutoSearchLogButton";
import AutoSearchRegistryCheckModal from "./components/AutoSearchRegistryCheckModal";
import { writeCrawledReportsToCsv } from "./lib/crawler-utils";
import { saveToRegistry } from "./lib/crawler-api";
import { useAutoSearch } from "./hooks/useAutoSearch";
import {
  findRegistryMatchesForAutoSearch,
  type AutoSearchRegistryMatch,
} from "./lib/auto-search-registry-check";
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
  const [countryInput, setCountryInput] = useState<string>("");
  const [filterEnabled, setFilterEnabled] = useState<boolean>(false);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [selectedReports, setSelectedReports] = useState<SelectedReport[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<
    CompanySelection[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean | null>(null);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(null);
  const [registryResponse, setRegistryResponse] =
    useState<SaveReportsListResponse | null>(null);

  const [isRunReportsOpen, setIsRunReportsOpen] = useState(false);
  const [isAutoSearchModalOpen, setIsAutoSearchModalOpen] = useState(false);
  const [isRegistryCheckLoading, setIsRegistryCheckLoading] = useState(false);
  const [isRegistryCheckModalOpen, setIsRegistryCheckModalOpen] =
    useState(false);
  const [registryCheckMatches, setRegistryCheckMatches] = useState<
    AutoSearchRegistryMatch[]
  >([]);
  const [registryCheckExcluded, setRegistryCheckExcluded] = useState<
    Set<string>
  >(() => new Set());
  const [pendingAutoSearchParams, setPendingAutoSearchParams] =
    useState<AutoSearchRunParams | null>(null);
  const [lastAutoSearchYear, setLastAutoSearchYear] = useState<string>("");

  const {
    phase: autoSearchPhase,
    progress: autoSearchProgress,
    stats: autoSearchStats,
    errorMessage: autoSearchError,
    runStartedAt: autoSearchStartedAt,
    runFinishedAt: autoSearchFinishedAt,
    isRunning: isAutoSearchRunning,
    runAutoSearch,
    cancel: cancelAutoSearch,
    reset: resetAutoSearch,
  } = useAutoSearch();

  const {
    runForUrls,
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
  } = useRunReportsPipeline();

  const runModalItems = useMemo((): RunReportListItem[] => {
    return selectedReports.map((r) => ({
      url: r.url,
      companyName: r.companyName,
      reportYear: r.reportYear,
      wikidataId: r.wikidataId ?? null,
    }));
  }, [selectedReports]);

  const handleModalRun = useCallback(() => {
    const urls = selectedReports
      .map((r) => r.url?.trim())
      .filter((url): url is string => Boolean(url));
    void runForUrls(urls, { onSuccess: () => setIsRunReportsOpen(false) });
  }, [runForUrls, selectedReports]);

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
    setCrawlProgress(null);
    const companyNames = companyNameInput
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);

    try {
      const transformedData = await searchCompanyReportsByNames({
        companyNames,
        reportYear: reportYearInput,
        country: countryInput,
        onProgress: setCrawlProgress,
      });

      setManualReports(transformedData);
    } finally {
      setIsLoading(false);
      setCrawlProgress(null);
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

  const handleCountryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCountryInput(e.target.value);
  };

  const handleDatabaseSearchClick = async () => {
    if (!selectedCompanies.length || !reportYearInput) return;

    resetSearchSlate();
    setIsLoading(true);
    setCrawlProgress(null);

    try {
      const transformedData = await searchCompanyReports({
        companies: selectedCompanies.map((c) => ({
          name: c.name,
          reportYear: reportYearInput,
          wikidataId: c.wikidataId,
          companyUrl: c.url,
        })),
        country: countryInput.trim() || undefined,
        onProgress: setCrawlProgress,
      });

      setDatabaseReports(
        transformedData.map((r) => ({
          ...r,
          wikidataId: selectedCompanies.find((c) => c.name === r.companyName)
            ?.wikidataId,
        })),
      );
    } finally {
      setIsLoading(false);
      setCrawlProgress(null);
    }
  };

  const startAutoSearch = useCallback(
    async (params: AutoSearchRunParams) => {
      resetAutoSearch();
      setLastAutoSearchYear(params.reportYear);
      setIsAutoSearchModalOpen(true);
      await runAutoSearch(params);
    },
    [resetAutoSearch, runAutoSearch],
  );

  const buildAutoSearchCompanies = (): AutoSearchRunParams["companies"] => {
    if (viewMode === "manual") {
      return companyNameInput
        .split(/\r?\n/)
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
    }
    return selectedCompanies.map((c) => ({
      name: c.name,
      wikidataId: c.wikidataId,
      companyUrl: c.url,
    }));
  };

  const handleAutoSearchClick = async () => {
    if (!reportYearInput) return;

    const companies = buildAutoSearchCompanies();
    if (companies.length === 0) return;

    const searchParams: AutoSearchRunParams = {
      companies,
      reportYear: reportYearInput,
      country: countryInput.trim() || undefined,
    };

    setIsRegistryCheckLoading(true);
    try {
      const checkResults = await findRegistryMatchesForAutoSearch({
        companyNames: companies.map((c) => c.name),
        reportYear: reportYearInput,
        wikidataByCompany: Object.fromEntries(
          companies
            .filter((c) => c.wikidataId)
            .map((c) => [c.name, c.wikidataId]),
        ),
      });
      const withMatches = checkResults.filter((item) => item.matches.length > 0);

      if (withMatches.length > 0) {
        setPendingAutoSearchParams(searchParams);
        setRegistryCheckMatches(withMatches);
        setRegistryCheckExcluded(new Set());
        setIsRegistryCheckModalOpen(true);
        return;
      }

      await startAutoSearch(searchParams);
    } finally {
      setIsRegistryCheckLoading(false);
    }
  };

  const handleRegistryCheckToggleExclude = (companyName: string) => {
    setRegistryCheckExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(companyName)) {
        next.delete(companyName);
      } else {
        next.add(companyName);
      }
      return next;
    });
  };

  const handleRegistryCheckCancel = () => {
    setIsRegistryCheckModalOpen(false);
    setPendingAutoSearchParams(null);
    setRegistryCheckMatches([]);
    setRegistryCheckExcluded(new Set());
  };

  const handleRegistryCheckContinue = async () => {
    if (!pendingAutoSearchParams) return;

    const remainingCompanies = pendingAutoSearchParams.companies.filter(
      (company) => !registryCheckExcluded.has(company.name),
    );

    const params = pendingAutoSearchParams;
    handleRegistryCheckCancel();

    if (remainingCompanies.length === 0) return;

    await startAutoSearch({
      ...params,
      companies: remainingCompanies,
    });
  };

  const handleCloseAutoSearchModal = () => {
    // Cancel + discard only while running. After a finished run, keep the stats
    // so the Log button on the Crawler tab stays available; the next run resets
    // them via startAutoSearch.
    if (isAutoSearchRunning) {
      cancelAutoSearch();
    }
    setIsAutoSearchModalOpen(false);
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
          <div className="flex items-center gap-3">
            {autoSearchStats && !isAutoSearchRunning && (
              <AutoSearchLogButton
                stats={autoSearchStats}
                reportYear={lastAutoSearchYear}
              />
            )}
            <ViewModePills
              options={viewModeOptions}
              value={viewMode}
              onValueChange={setViewMode}
              ariaLabel={t("crawler.viewMode")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 justify-center">
          {viewMode === "manual" && (
            <>
              <ManualSearchControls
                onCompanyNamesChange={handleSearchInputChange}
                onReportYearChange={handleReportYearInputChange}
                onCountryChange={handleCountryInputChange}
                onSearch={handleManualSearchClick}
                onAutoSearch={handleAutoSearchClick}
                isAutoSearchRunning={isAutoSearchRunning || isRegistryCheckLoading}
                onExport={handleExportClick}
                isSearchDisabled={!companyNameInput || !reportYearInput}
                selectedReports={selectedReports}
                handleAddToRegistryClick={handleAddToRegistryClick}
                onRunSelectedReports={() => setIsRunReportsOpen(true)}
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
                onAutoSearch={handleAutoSearchClick}
                isAutoSearchRunning={isAutoSearchRunning || isRegistryCheckLoading}
                isSearchDisabled={!selectedCompanies.length || !reportYearInput}
                selectedReports={selectedReports}
                onExport={handleExportClick}
                filterEnabled={filterEnabled}
                setFilterEnabled={setFilterEnabled}
                filterYear={filterYear}
                setFilterYear={setFilterYear}
                searchYear={reportYearInput}
                handleAddToRegistryClick={handleAddToRegistryClick}
                onRunSelectedReports={() => setIsRunReportsOpen(true)}
                tagOptions={tagOptions}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
              {(!reportYearInput || !selectedCompanies.length) && (
                <p className="text-sm text-gray-02 mt-4">
                  {t("crawler.databaseSearchGuard")}
                </p>
              )}
            </>
          )}
        </div>

        <RunReportsModal
          open={isRunReportsOpen}
          onOpenChange={setIsRunReportsOpen}
          items={runModalItems}
          autoApprove={autoApprove}
          onAutoApproveChange={setAutoApprove}
          runOptions={runOptions}
          onRunReports={handleModalRun}
          isRunning={isRunningReports}
        />

        <AutoSearchRegistryCheckModal
          open={isRegistryCheckModalOpen}
          reportYear={reportYearInput}
          matches={registryCheckMatches}
          remainingCompanyCount={
            pendingAutoSearchParams?.companies.filter(
              (company) => !registryCheckExcluded.has(company.name),
            ).length ?? 0
          }
          excludedCompanies={registryCheckExcluded}
          onToggleExclude={handleRegistryCheckToggleExclude}
          onContinue={() => void handleRegistryCheckContinue()}
          onCancel={handleRegistryCheckCancel}
        />

        <AutoSearchModal
          open={isAutoSearchModalOpen}
          phase={autoSearchPhase}
          progress={autoSearchProgress}
          stats={autoSearchStats}
          reportYear={reportYearInput}
          errorMessage={autoSearchError}
          runStartedAt={autoSearchStartedAt}
          runFinishedAt={autoSearchFinishedAt}
          onClose={handleCloseAutoSearchModal}
        />
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
                {crawlProgress
                  ? crawlProgress.companyIndex === 0
                    ? t("crawler.crawlProgressStarting", {
                        companyTotal: crawlProgress.companyTotal,
                        parallel:
                          crawlProgress.parallel ?? AUTO_SEARCH_CRAWL_CONCURRENCY,
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
          selectedTags={selectedTags}
          onTagOptionsLoaded={setTagOptions}
        />
      )}
    </div>
  );
}
