import React from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { ViewModePills } from "@/ui/view-mode-pills";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import type { ErrorBrowserViewMode } from "./types";
import { useErrorBrowserData } from "./hooks/useErrorBrowserData";
import { BrowserView } from "./components/BrowserView";
import { OverviewView } from "./components/OverviewView";
import { HardestReportsView } from "./components/HardestReportsView";

const VIEW_MODES: ErrorBrowserViewMode[] = ["browser", "overview", "worst"];

const VIEW_MODE_LABEL_KEYS: Record<ErrorBrowserViewMode, string> = {
  browser: "errors.browser",
  overview: "errors.overviewTab",
  worst: "errors.hardestReports",
};

export function ErrorBrowserTab() {
  const { t } = useI18n();
  const [selectedDataYear, setSelectedDataYear] = React.useState(2024);
  const [selectedReportYear, setSelectedReportYear] = React.useState("");
  const [selectedDataPoint, setSelectedDataPoint] = React.useState("cat-1");
  const [viewMode, setViewMode] =
    React.useState<ErrorBrowserViewMode>("browser");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);

  const viewModeOptions = React.useMemo(
    () =>
      VIEW_MODES.map((value) => ({
        value,
        label: t(VIEW_MODE_LABEL_KEYS[value]),
      })),
    [t],
  );

  const {
    isLoading,
    error,
    fetchData,
    comparisonRows,
    availableTags,
    availableReportYears,
    allDataPointMetrics,
    worstCompanies,
    difficultCompanyIds,
    totalWithBothRPs,
    summaryStats,
  } = useErrorBrowserData(
    selectedDataYear,
    selectedReportYear ? Number(selectedReportYear) : null,
    selectedDataPoint,
    selectedTags,
    verifiedOnly,
  );

  const handleOverviewSelectDataPoint = (dataPointId: string) => {
    setSelectedDataPoint(dataPointId);
    setViewMode("browser");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {/* Header: relative z-10 so year dropdown panel paints above view content below */}
      <div className="relative z-10 bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl text-gray-01 font-semibold">
              {t("errors.title")}
            </h2>
            <p className="text-sm text-gray-02 mt-1">{t("errors.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <ViewModePills
              options={viewModeOptions}
              value={viewMode}
              onValueChange={setViewMode}
              ariaLabel={t("errors.viewMode")}
            />
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-04 text-white rounded-full hover:bg-blue-04/90 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              {t("common.refresh")}
            </button>
          </div>
        </div>

        {/* Data year, report year, and tag selectors */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-02 uppercase tracking-wide">
              {t("errors.dataYear")}
            </label>
            <SingleSelectDropdown
              options={["2025", "2024", "2023", "2022", "2021", "2020"]}
              value={String(selectedDataYear)}
              onChange={(v) => setSelectedDataYear(Number(v))}
              placeholder={t("errors.dataYear")}
              ariaLabel={t("errors.dataYear")}
              panelMinWidth={100}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-02 uppercase tracking-wide">
              {t("yearLabels.companyReportYear")}
            </label>
            <SingleSelectDropdown
              options={[
                "",
                ...(availableReportYears.length
                  ? availableReportYears.map(String)
                  : ["2025", "2024", "2023", "2022", "2021", "2020"]),
              ]}
              value={selectedReportYear}
              onChange={setSelectedReportYear}
              placeholder={t("errors.allCompanyReportYears")}
              getOptionLabel={(v) =>
                v ? v : t("errors.allCompanyReportYears")
              }
              ariaLabel={t("yearLabels.companyReportYear")}
              panelMinWidth={120}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-02 uppercase tracking-wide">
              {t("editor.companies.tags")}
            </label>
            <MultiSelectDropdown
              options={availableTags}
              selectedIds={selectedTags}
              onChange={setSelectedTags}
              triggerLabel={t("editor.companies.tags")}
              emptyLabel={t("editor.companies.allTags")}
              panelMinWidth={220}
              panelMaxHeight={320}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-02 uppercase tracking-wide">
              {t("errors.verifiedOnly")}
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-03/50 border border-gray-02/15 rounded-lg px-3 py-2 text-sm text-gray-01">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="accent-blue-04"
              />
              <span>{t("errors.verifiedOnlyLabel")}</span>
              <span className="text-xs text-gray-02 ml-1">
                {t("errors.verifiedOnlyHelp")}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* View content */}
      {viewMode === "browser" && (
        <BrowserView
          isLoading={isLoading}
          error={error}
          comparisonRows={comparisonRows}
          difficultCompanyIds={difficultCompanyIds}
          selectedDataPoint={selectedDataPoint}
          onDataPointChange={setSelectedDataPoint}
          selectedYear={selectedDataYear}
          selectedTags={selectedTags}
          verifiedOnly={verifiedOnly}
        />
      )}

      {viewMode === "overview" &&
        (isLoading ? (
          <div className="flex justify-center items-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
            <LoadingSpinner label={t("errors.loadingOverview")} />
          </div>
        ) : (
          <OverviewView
            allDataPointMetrics={allDataPointMetrics}
            selectedYear={selectedDataYear}
            onSelectDataPoint={handleOverviewSelectDataPoint}
            stats={summaryStats}
          />
        ))}

      {viewMode === "worst" && (
        <HardestReportsView
          isLoading={isLoading}
          worstCompanies={worstCompanies}
          totalWithBothRPs={totalWithBothRPs}
          selectedYear={selectedDataYear}
        />
      )}
    </motion.div>
  );
}
