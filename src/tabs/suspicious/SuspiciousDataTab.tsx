import React from "react";
import { Download, RefreshCw } from "lucide-react";
import type { ApiTarget } from "@/config/api-env";
import { useI18n } from "@/contexts/I18nContext";
import { downloadCsv } from "@/lib/utils";
import { Callout } from "@/ui/callout";
import { EnvBadge } from "@/ui/env-badge";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { ViewModePills } from "@/ui/view-mode-pills";
import type { SuspicionFinding, SuspicionRuleId } from "./types";
import { useSuspiciousData } from "./hooks/useSuspiciousData";
import {
  EMPTY_SUSPICION_FILTERS,
  collectFilterOptions,
  countFindings,
  filterFindings,
  summarizeByCompany,
  type SuspicionFilters,
} from "./lib/filters";
import {
  findingsToCsvRows,
  ruleLabelKey,
  sourceLabelKey,
} from "./lib/finding-display";
import { SuspiciousCompaniesTable } from "./components/SuspiciousCompaniesTable";
import { SuspiciousFiltersBar } from "./components/SuspiciousFilters";
import { SuspiciousFindingDialog } from "./components/SuspiciousFindingDialog";
import { SuspiciousFindingsTable } from "./components/SuspiciousFindingsTable";
import { SuspiciousRulesView } from "./components/SuspiciousRulesView";
import { SuspiciousSummary } from "./components/SuspiciousSummary";

type SuspiciousViewMode = "findings" | "companies" | "rules";

const VIEW_MODES: SuspiciousViewMode[] = ["findings", "companies", "rules"];

const VIEW_MODE_LABEL_KEYS: Record<SuspiciousViewMode, string> = {
  findings: "suspicious.view.findings",
  companies: "suspicious.view.companies",
  rules: "suspicious.view.rules",
};

export function SuspiciousDataTab() {
  const { t } = useI18n();

  // Defaults to production: the tab exists to review what is publicly live.
  const [source, setSource] = React.useState<ApiTarget>("prod");
  const { isLoading, error, fetchData, scan } = useSuspiciousData(source);

  const [viewMode, setViewMode] =
    React.useState<SuspiciousViewMode>("findings");
  const [filters, setFilters] = React.useState<SuspicionFilters>(
    EMPTY_SUSPICION_FILTERS,
  );
  const [selectedFinding, setSelectedFinding] =
    React.useState<SuspicionFinding | null>(null);

  const options = React.useMemo(
    () => collectFilterOptions(scan.findings),
    [scan.findings],
  );

  const filtered = React.useMemo(
    () => filterFindings(scan.findings, filters),
    [scan.findings, filters],
  );

  const counts = React.useMemo(() => countFindings(filtered), [filtered]);
  const companies = React.useMemo(
    () => summarizeByCompany(filtered),
    [filtered],
  );

  const viewModeOptions = React.useMemo(
    () =>
      VIEW_MODES.map((value) => ({
        value,
        label: t(VIEW_MODE_LABEL_KEYS[value]),
      })),
    [t],
  );

  const handleExport = () => {
    const labelForRule = (rule: SuspicionRuleId) => t(ruleLabelKey(rule));
    downloadCsv(
      findingsToCsvRows(filtered, labelForRule),
      `suspicious-data-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative z-10 bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl text-gray-01 font-semibold">
                {t("suspicious.title")}
              </h2>
              <EnvBadge env={source}>{t(sourceLabelKey(source))}</EnvBadge>
            </div>
            <p className="text-sm text-gray-02 mt-1 max-w-3xl">
              {t("suspicious.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ViewModePills
              options={viewModeOptions}
              value={viewMode}
              onValueChange={setViewMode}
              ariaLabel={t("suspicious.view.label")}
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-03 text-gray-01 rounded-full hover:opacity-80 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              {t("suspicious.exportCsv")}
            </button>
            <button
              type="button"
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

        <SuspiciousFiltersBar
          filters={filters}
          onChange={setFilters}
          source={source}
          onSourceChange={setSource}
          availableDataYears={options.dataYears}
          availableRules={options.rules}
          availableTags={options.tags}
        />
      </div>

      {error ? (
        <Callout variant="error" title={t("suspicious.loadFailed")}>
          <p className="text-sm text-pink-03/80">{error}</p>
        </Callout>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center items-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner label={t("suspicious.loading")} />
        </div>
      ) : (
        <>
          <SuspiciousSummary counts={counts} scan={scan} />

          {viewMode === "findings" && (
            <SuspiciousFindingsTable
              findings={filtered}
              unfilteredTotal={scan.findings.length}
              onSelect={setSelectedFinding}
            />
          )}
          {viewMode === "companies" && (
            <SuspiciousCompaniesTable companies={companies} />
          )}
          {viewMode === "rules" && <SuspiciousRulesView findings={filtered} />}
        </>
      )}

      <SuspiciousFindingDialog
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />
    </div>
  );
}
