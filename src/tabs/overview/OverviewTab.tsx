import { useCallback, useMemo, useState } from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { useKeySetSelection } from "@/hooks/useKeySetSelection";
import { useRunReportsPipeline } from "@/hooks/useRunReportsPipeline";
import { STAGE_RUN_REPORTS_PIPELINE_CONFIG } from "@/lib/run-reports-pipeline-config";
import { RunReportsModal } from "@/components/RunReportsModal";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { MetricCard, MetricCardGrid } from "@/ui/metric-card";
import { ViewModePills } from "@/ui/view-mode-pills";
import { useOverviewData } from "./hooks/useOverviewData";
import { OverviewFilters } from "./components/OverviewFilters";
import { ProdToStageFilters } from "./components/ProdToStageFilters";
import { OverviewStatsBar } from "./components/OverviewStatsBar";
import { OverviewTable } from "./components/OverviewTable";
import { ProdToStageTable } from "./components/ProdToStageTable";
import type {
  OverviewRow,
  OverviewViewMode,
  ProdToStageRow,
} from "./lib/overview-types";

const VIEW_MODES: { value: OverviewViewMode; labelKey: string }[] = [
  { value: "companyYears", labelKey: "overview.views.companyYears" },
  { value: "registryReports", labelKey: "overview.views.registryReports" },
  { value: "prodToStage", labelKey: "overview.views.prodToStage" },
];

export function OverviewTab() {
  const { t } = useI18n();
  const data = useOverviewData();
  const {
    selectedKeys,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectedFrom,
  } = useKeySetSelection({ resetWhen: data.viewMode });
  const [isRunReportsOpen, setIsRunReportsOpen] = useState(false);
  const envPipeline = useRunReportsPipeline();
  const stagePipeline = useRunReportsPipeline(
    STAGE_RUN_REPORTS_PIPELINE_CONFIG,
  );

  const isProdToStage = data.viewMode === "prodToStage";
  const activePipeline = isProdToStage ? stagePipeline : envPipeline;

  const selectedOverviewRows = useMemo(
    () => selectedFrom(data.rows),
    [selectedFrom, data.rows],
  );

  const selectedProdToStageRows = useMemo(
    () => selectedFrom(data.prodToStageRows),
    [selectedFrom, data.prodToStageRows],
  );

  const runItems = useMemo(() => {
    if (isProdToStage) {
      return selectedProdToStageRows
        .filter((row) => row.reportUrl)
        .map((row) => ({
          url: row.reportUrl!,
          companyName: row.companyName,
          wikidataId: row.wikidataId,
          reportYear: row.reportYear,
        }));
    }
    return selectedOverviewRows
      .filter((row) => row.runUrl)
      .map((row) => ({
        id: row.registryEntry?.id,
        url: row.runUrl!,
        companyName: row.companyName,
        wikidataId: row.wikidataId,
        reportYear: row.reportYear,
      }));
  }, [isProdToStage, selectedProdToStageRows, selectedOverviewRows]);

  const toggleSelectOverview = useCallback(
    (row: OverviewRow) => {
      toggleSelect(row);
    },
    [toggleSelect],
  );

  const toggleSelectProdToStage = useCallback(
    (row: ProdToStageRow) => {
      toggleSelect(row);
    },
    [toggleSelect],
  );

  const toggleSelectAllOverview = useCallback(
    (rows: OverviewRow[]) => {
      toggleSelectAll(rows);
    },
    [toggleSelectAll],
  );

  const toggleSelectAllProdToStage = useCallback(
    (rows: ProdToStageRow[]) => {
      toggleSelectAll(rows.filter((row) => row.reportUrl));
    },
    [toggleSelectAll],
  );

  const handleRunReports = useCallback(() => {
    const urls = runItems.map((item) => item.url);
    void activePipeline.runForUrls(urls, {
      onSuccess: () => {
        setIsRunReportsOpen(false);
        clearSelection();
        data.refresh();
      },
    });
  }, [activePipeline, runItems, data, clearSelection]);

  const viewSubtitle =
    data.viewMode === "companyYears"
      ? t("overview.subtitleCompanyYears")
      : data.viewMode === "registryReports"
        ? t("overview.subtitleRegistryReports")
        : t("overview.subtitleProdToStage");

  const selectedCount = isProdToStage
    ? selectedProdToStageRows.length
    : selectedOverviewRows.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-01">
                {t("overview.title")}
              </h2>
              <p className="text-sm text-gray-02 mt-2 max-w-3xl">
                {viewSubtitle}
              </p>
            </div>
            <ViewModePills
              options={VIEW_MODES.map((mode) => ({
                value: mode.value,
                label: t(mode.labelKey),
              }))}
              value={data.viewMode}
              onValueChange={data.setViewMode}
              ariaLabel={t("overview.viewModeLabel")}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => data.refresh()}
              disabled={data.isRefreshing}
            >
              {data.isRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {t("common.refresh")}
            </Button>
            <Button
              onClick={() => setIsRunReportsOpen(true)}
              disabled={
                runItems.length === 0 || activePipeline.isRunningReports
              }
            >
              {activePipeline.isRunningReports ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isProdToStage
                ? t("overview.prodToStage.runOnStage", {
                    count: runItems.length,
                  })
                : t("overview.runSelected", { count: runItems.length })}
            </Button>
          </div>
        </div>

        {isProdToStage ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-03/30 bg-blue-03/10 px-4 py-3 text-sm text-gray-01 space-y-2">
              <p className="font-medium">
                {t("overview.prodToStage.bannerTitle")}
              </p>
              <ul className="list-disc pl-5 text-gray-02 space-y-1 text-xs">
                <li>{t("overview.prodToStage.bannerReadProd")}</li>
                <li>{t("overview.prodToStage.bannerRunStage")}</li>
                <li>{t("overview.prodToStage.bannerNeverProd")}</li>
              </ul>
            </div>
            {!data.isLoading &&
            !data.error &&
            data.pagination.totalRows === 0 ? (
              <div className="rounded-lg border border-gray-03 bg-gray-05/70 px-4 py-3 text-xs text-gray-02 space-y-1">
                <p className="font-medium text-gray-01">
                  {t("overview.prodToStage.emptyDiagnosticsTitle")}
                </p>
                <p>
                  {t("overview.prodToStage.emptyDiagnosticsCompanies", {
                    prod: data.prodCompanyCount,
                    stage: data.stageCompanyCount,
                  })}
                </p>
                <p>
                  {t("overview.prodToStage.emptyDiagnosticsShells", {
                    count: data.prodToStageDiagnostics.prodShells,
                  })}
                </p>
                <p>
                  {t("overview.prodToStage.emptyDiagnosticsSkippedUnlinked", {
                    count: data.prodToStageDiagnostics.skippedUnlinked,
                  })}
                </p>
                <p>
                  {t("overview.prodToStage.emptyDiagnosticsSkippedUnverified", {
                    count:
                      data.prodToStageDiagnostics.skippedNoFullyVerifiedOnProd,
                  })}
                </p>
                <p>
                  {t("overview.prodToStage.emptyDiagnosticsSkippedStage", {
                    count: data.prodToStageDiagnostics.skippedStageHasEmissions,
                  })}
                </p>
                <p className="font-medium text-gray-01">
                  {t("overview.prodToStage.emptyDiagnosticsIncluded", {
                    count: data.prodToStageDiagnostics.included,
                  })}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isProdToStage ? (
          <OverviewStatsBar
            stats={data.stats}
            selectedCount={selectedCount}
            viewMode={data.viewMode}
          />
        ) : (
          <MetricCardGrid className="grid-cols-2 sm:grid-cols-4">
            <MetricCard
              label={t("overview.prodToStage.stats.total")}
              value={data.prodToStageRows.length}
            />
            <MetricCard
              label={t("overview.prodToStage.stats.runnable")}
              value={data.prodToStageRows.filter((row) => row.reportUrl).length}
            />
            <MetricCard
              label={t("overview.prodToStage.stats.selected")}
              value={selectedCount}
            />
            <MetricCard
              label={t("overview.prodToStage.stats.allCandidates")}
              value={data.pagination.totalRows}
            />
          </MetricCardGrid>
        )}

        {isProdToStage ? (
          <ProdToStageFilters data={data} />
        ) : (
          <OverviewFilters data={data} />
        )}

        {data.error ? (
          <Callout variant="error" title={t("overview.apiErrorTitle")}>
            <p className="text-sm">{data.error}</p>
          </Callout>
        ) : null}

        {!data.error && data.warnings.length > 0 ? (
          <Callout
            variant="warning"
            title={t("overview.apiWarningsTitle")}
            description={
              data.localEnv
                ? t("overview.apiWarningsEnv", { env: data.localEnv })
                : undefined
            }
          >
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {data.warnings.map((warning) => (
                <li key={warning.code}>
                  <span className="font-mono text-xs text-gray-02">
                    {warning.code}
                  </span>
                  {": "}
                  {warning.message}
                </li>
              ))}
            </ul>
          </Callout>
        ) : null}

        {data.isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : data.error ? null : isProdToStage ? (
          <ProdToStageTable
            data={data}
            selectedKeys={selectedKeys}
            tagLabelBySlug={data.tagLabelBySlug}
            onToggleSelect={toggleSelectProdToStage}
            onToggleSelectAll={toggleSelectAllProdToStage}
          />
        ) : (
          <OverviewTable
            data={data}
            selectedKeys={selectedKeys}
            onToggleSelect={toggleSelectOverview}
            onToggleSelectAll={toggleSelectAllOverview}
          />
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => data.clearFilters()}
            disabled={!data.filtersAreActive}
          >
            {t("common.clearFilters")}
          </Button>
        </div>
      </div>

      <RunReportsModal
        open={isRunReportsOpen}
        onOpenChange={setIsRunReportsOpen}
        items={runItems}
        autoApprove={activePipeline.autoApprove}
        onAutoApproveChange={activePipeline.setAutoApprove}
        runOptions={activePipeline.runOptions}
        onRunReports={handleRunReports}
        isRunning={activePipeline.isRunningReports}
      />
    </motion.div>
  );
}
