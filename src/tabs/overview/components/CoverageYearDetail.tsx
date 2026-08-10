import { Link } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { RunReportsModal } from "@/components/RunReportsModal";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import { Button } from "@/ui/button";
import { ViewModePills } from "@/ui/view-mode-pills";
import { ReportYearPill } from "./ReportYearPill";
import { CoverageFindReportDialog } from "./CoverageFindReportDialog";
import { CoverageReplaceReportUrlDialog } from "./CoverageReplaceReportUrlDialog";
import { CoverageRunReportYearPrompt } from "./CoverageRunReportYearPrompt";
import { useRunReportsPipeline } from "@/hooks/useRunReportsPipeline";
import type { RunReportListItem } from "@/lib/run-reports-types";
import { fetchCoverageYearNames } from "@/tabs/overview/lib/coverage-api";
import {
  pickRegistryReportForYear,
  registryReportYears,
  toRunReportListItem,
} from "@/tabs/overview/lib/coverage-registry-report-run";
import { coveragePercentCardClass } from "@/tabs/overview/lib/coverage-overview-styles";
import { getRegistryRunReportsPipelineConfig } from "@/tabs/registry/lib/registry-api";
import {
  deleteReportFromRegistry,
  replaceRegistryReportSourceUrl,
} from "@/tabs/registry/lib/registry-api";
import type { SaveReportSuccess } from "@/tabs/crawler/lib/crawler-types";
import type {
  CoverageEntry,
  CoverageEntryFilter,
  CoverageYearDetail,
  RegistryReportPill,
} from "@/tabs/overview/lib/coverage-types";

const COVERAGE_ROW_HEIGHT_PX = 56;
const COVERAGE_TABLE_MAX_HEIGHT_PX = 560;

type CoverageYearDetailProps = {
  listId: string;
  year: number;
  detail: CoverageYearDetail;
  filter: CoverageEntryFilter;
  onFilterChange: (filter: CoverageEntryFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  isRefreshingRegistry: boolean;
  onRefreshRegistry: () => void;
  onEdit: () => void;
  onEditEntry: (entry: CoverageEntry) => void;
  onViewRegistryReports?: (names: string[]) => void;
  onRegistryReportSaved?: (entryId: string, saved: SaveReportSuccess) => void;
  onRegistryReportRemoved?: (entryId: string, reportId: string) => void;
  onRegistryReportUpdated?: (
    entryId: string,
    reportId: string,
    updated: RegistryReportPill,
  ) => void;
};

type FindReportSession = {
  entry: CoverageEntry;
};

type RegistryReportActionTarget = {
  entryId: string;
  report: RegistryReportPill;
};

type RunReportSession = {
  entry: CoverageEntry;
  runItem: RunReportListItem;
};

export function CoverageYearDetailView({
  listId,
  year,
  detail,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  hasMore,
  isLoadingMore,
  onLoadMore,
  isRefreshingRegistry,
  onRefreshRegistry,
  onEdit,
  onEditEntry,
  onViewRegistryReports,
  onRegistryReportSaved,
  onRegistryReportRemoved,
  onRegistryReportUpdated,
}: CoverageYearDetailProps) {
  const { t } = useI18n();
  const [findReportSession, setFindReportSession] =
    useState<FindReportSession | null>(null);
  const [replaceReportTarget, setReplaceReportTarget] =
    useState<RegistryReportActionTarget | null>(null);
  const [removeReportTarget, setRemoveReportTarget] =
    useState<RegistryReportActionTarget | null>(null);
  const [isReplacingReport, setIsReplacingReport] = useState(false);
  const [isRemovingReport, setIsRemovingReport] = useState(false);
  const [runReportYearEntryId, setRunReportYearEntryId] = useState<
    string | null
  >(null);
  const [runReportSession, setRunReportSession] =
    useState<RunReportSession | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isLoadingRegistryNames, setIsLoadingRegistryNames] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const runPipeline = useRunReportsPipeline(
    getRegistryRunReportsPipelineConfig(),
  );
  const {
    runForUrls,
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
  } = runPipeline;

  const missingCount =
    detail.totalNames - detail.matchedCount - detail.ambiguousCount;
  const filteredCount = detail.filteredCount ?? detail.entries.length;
  const entries = detail.entries;

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => COVERAGE_ROW_HEIGHT_PX,
    overscan: 12,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  const filterOptions: { value: CoverageEntryFilter; label: string }[] = [
    { value: "all", label: t("overview.coverage.filters.all") },
    { value: "matched", label: t("overview.coverage.filters.matched") },
    { value: "missing", label: t("overview.coverage.filters.missing") },
    { value: "ambiguous", label: t("overview.coverage.filters.ambiguous") },
    {
      value: "registryInProd",
      label: t("overview.coverage.filters.registryInProd"),
    },
    {
      value: "registryOnly",
      label: t("overview.coverage.filters.registryOnly"),
    },
    {
      value: "registryMissing",
      label: t("overview.coverage.filters.registryMissing"),
    },
  ];

  const runReportYearEntry =
    runReportYearEntryId != null
      ? (entries.find((entry) => entry.id === runReportYearEntryId) ?? null)
      : null;

  const runReportYearOptions = useMemo(
    () =>
      runReportYearEntry
        ? registryReportYears(runReportYearEntry.registryReports)
        : [],
    [runReportYearEntry],
  );

  const runModalItems = useMemo((): RunReportListItem[] => {
    if (!runReportSession) return [];
    return [runReportSession.runItem];
  }, [runReportSession]);

  const openRunReportModal = (entry: CoverageEntry, reportYear: number) => {
    const report = pickRegistryReportForYear(entry.registryReports, reportYear);
    if (!report) {
      toast.error(t("overview.coverage.runReportMissing"));
      return;
    }
    setRunReportSession({
      entry,
      runItem: toRunReportListItem(entry, report),
    });
    setIsRunModalOpen(true);
  };

  const handleRunReportClick = (entry: CoverageEntry) => {
    const years = registryReportYears(entry.registryReports);
    if (years.length === 0) return;
    if (years.length === 1) {
      openRunReportModal(entry, years[0]!);
      return;
    }
    setRunReportYearEntryId(entry.id);
  };

  const handleRunReportYearConfirm = (
    entry: CoverageEntry,
    reportYear: number,
  ) => {
    setRunReportYearEntryId(null);
    openRunReportModal(entry, reportYear);
  };

  const handleRunReportModalRun = () => {
    const url = runReportSession?.runItem.url?.trim();
    if (!url) return;
    void runForUrls([url], {
      runItems: runReportSession ? [runReportSession.runItem] : undefined,
      onSuccess: () => setIsRunModalOpen(false),
    });
  };

  const handleReplaceReportUrl = async (url: string) => {
    if (!replaceReportTarget) return;
    setIsReplacingReport(true);
    try {
      const { entry: updated, cacheFailed } =
        await replaceRegistryReportSourceUrl(
          replaceReportTarget.report.reportId,
          url,
        );
      onRegistryReportUpdated?.(
        replaceReportTarget.entryId,
        replaceReportTarget.report.reportId,
        {
          ...replaceReportTarget.report,
          url: updated.url,
          sourceUrl: updated.sourceUrl ?? updated.url,
          prodReady: false,
        },
      );
      toast.success(
        cacheFailed
          ? t("overview.coverage.replaceReportUrlSuccessCacheFailed")
          : t("overview.coverage.replaceReportUrlSuccess"),
      );
      setReplaceReportTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.replaceReportUrlError"),
      );
    } finally {
      setIsReplacingReport(false);
    }
  };

  const handleRemoveReport = async () => {
    if (!removeReportTarget) return;
    setIsRemovingReport(true);
    try {
      await deleteReportFromRegistry([removeReportTarget.report.reportId]);
      onRegistryReportRemoved?.(
        removeReportTarget.entryId,
        removeReportTarget.report.reportId,
      );
      toast.success(t("overview.coverage.removeReportSuccess"));
      setRemoveReportTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.removeReportError"),
      );
    } finally {
      setIsRemovingReport(false);
    }
  };

  const handleViewInRegistry = async () => {
    if (!onViewRegistryReports) return;
    setIsLoadingRegistryNames(true);
    try {
      const response = await fetchCoverageYearNames(listId, year);
      onViewRegistryReports(response.names);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.errorTitle"),
      );
    } finally {
      setIsLoadingRegistryNames(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-03 bg-gray-05/50 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-01">
            {detail.listName} — {detail.year}
          </h3>
          <div className="flex flex-wrap gap-2">
            {onViewRegistryReports ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleViewInRegistry()}
                disabled={isLoadingRegistryNames}
              >
                {isLoadingRegistryNames ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("overview.coverage.reports.viewInRegistry")
                )}
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={onEdit}>
              {t("overview.coverage.editYear")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onRefreshRegistry()}
              disabled={isRefreshingRegistry}
            >
              {isRefreshingRegistry ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("overview.coverage.refreshRegistry")
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <CoverageStatCard
            label={t("overview.coverage.stats.total")}
            value={detail.totalNames}
            className="border-gray-03/80 bg-gray-04/30 text-gray-01"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.matched")}
            value={detail.matchedCount}
            className="border-green-03/30 bg-green-03/10 text-green-03"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.missing")}
            value={missingCount}
            className="border-orange-03/30 bg-orange-03/10 text-orange-03"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.ambiguous")}
            value={detail.ambiguousCount}
            className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.coverage")}
            value={`${detail.coveragePercent}%`}
            className={coveragePercentCardClass(detail.coveragePercent)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CoverageStatCard
            label={t("overview.coverage.stats.inRegistry")}
            value={detail.hasAnyReportCount}
            className="border-gray-03/80 bg-gray-04/30 text-gray-01"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.inProd")}
            value={detail.prodReadyCount}
            className="border-green-03/30 bg-green-03/10 text-green-03"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.missingReports")}
            value={detail.noReportCount}
            className="border-orange-03/30 bg-orange-03/10 text-orange-03"
          />
        </div>
        {detail.registryRefreshedAt ? (
          <p className="text-xs text-gray-02">
            {t("overview.coverage.registryRefreshedAt", {
              time: new Date(detail.registryRefreshedAt).toLocaleString(),
            })}
          </p>
        ) : null}
      </div>

      <ViewModePills
        options={filterOptions}
        value={filter}
        onValueChange={onFilterChange}
        ariaLabel={t("overview.coverage.entryFilterLabel")}
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="w-full max-w-md rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("overview.coverage.searchPlaceholder")}
        />
        <p className="text-sm text-gray-02 tabular-nums">
          {t("overview.coverage.filteredCount", {
            shown: entries.length,
            total: filteredCount,
          })}
        </p>
      </div>

      <div
        ref={tableScrollRef}
        className="overflow-auto rounded-lg border border-gray-03"
        style={{ maxHeight: COVERAGE_TABLE_MAX_HEIGHT_PX }}
      >
        <table className="min-w-full text-sm table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-05/95 text-left text-gray-02 backdrop-blur-sm">
            <tr>
              <th className="w-[24%] px-4 py-2 font-medium">
                {t("overview.coverage.columns.listName")}
              </th>
              <th className="w-[14%] px-4 py-2 font-medium">
                {t("overview.coverage.columns.status")}
              </th>
              <th className="w-[22%] px-4 py-2 font-medium">
                {t("overview.coverage.columns.dbMatch")}
              </th>
              <th className="w-[18%] px-4 py-2 font-medium">
                {t("overview.coverage.columns.reports")}
              </th>
              <th className="w-[22%] px-4 py-2 font-medium min-w-[12rem]">
                {t("overview.coverage.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-02">
                  {t("overview.coverage.noEntries")}
                </td>
              </tr>
            ) : (
              <>
                {rowVirtualizer.getVirtualItems().length > 0 ? (
                  <tr aria-hidden="true">
                    <td
                      colSpan={5}
                      style={{
                        height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0,
                        padding: 0,
                        border: 0,
                      }}
                    />
                  </tr>
                ) : null}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = entries[virtualRow.index];
                  if (!entry) return null;

                  return (
                    <CoverageEntryRow
                      key={entry.id}
                      entry={entry}
                      rowRef={rowVirtualizer.measureElement}
                      dataIndex={virtualRow.index}
                      onEditEntry={onEditEntry}
                      onFindReportClick={() => setFindReportSession({ entry })}
                      onRunReportClick={() => handleRunReportClick(entry)}
                      onReplaceReport={(report) =>
                        setReplaceReportTarget({ entryId: entry.id, report })
                      }
                      onRemoveReport={(report) =>
                        setRemoveReportTarget({ entryId: entry.id, report })
                      }
                    />
                  );
                })}
                {rowVirtualizer.getVirtualItems().length > 0 ? (
                  <tr aria-hidden="true">
                    <td
                      colSpan={5}
                      style={{
                        height:
                          rowVirtualizer.getTotalSize() -
                          (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                        padding: 0,
                        border: 0,
                      }}
                    />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onLoadMore()}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2">
                  {t("overview.coverage.loadingMore")}
                </span>
              </>
            ) : (
              t("overview.coverage.loadMore")
            )}
          </Button>
        </div>
      ) : null}

      {findReportSession ? (
        <CoverageFindReportDialog
          open
          onOpenChange={(open) => {
            if (!open) setFindReportSession(null);
          }}
          entry={findReportSession.entry}
          defaultYear={year}
          runPipeline={runPipeline}
          onSaved={(saved) =>
            onRegistryReportSaved?.(findReportSession.entry.id, saved)
          }
        />
      ) : null}

      {replaceReportTarget ? (
        <CoverageReplaceReportUrlDialog
          open
          onOpenChange={(open) => {
            if (!open && !isReplacingReport) setReplaceReportTarget(null);
          }}
          report={replaceReportTarget.report}
          isSaving={isReplacingReport}
          onSave={handleReplaceReportUrl}
        />
      ) : null}

      <ConfirmDialog
        open={removeReportTarget != null}
        onOpenChange={(open) => {
          if (!open && !isRemovingReport) setRemoveReportTarget(null);
        }}
        title={t("overview.coverage.removeReportTitle")}
        description={t("overview.coverage.removeReportDescription", {
          year: removeReportTarget?.report.reportYear ?? "?",
        })}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("overview.coverage.removeReportConfirm")}
        confirmVariant="danger"
        isLoading={isRemovingReport}
        onConfirm={handleRemoveReport}
      />

      {runReportYearEntry ? (
        <CoverageRunReportYearPrompt
          open
          onOpenChange={(open) => {
            setRunReportYearEntryId(open ? runReportYearEntry.id : null);
          }}
          companyName={runReportYearEntry.name}
          yearOptions={runReportYearOptions}
          onConfirm={(reportYear) =>
            handleRunReportYearConfirm(runReportYearEntry, reportYear)
          }
        />
      ) : null}

      <RunReportsModal
        open={isRunModalOpen}
        onOpenChange={(open) => {
          setIsRunModalOpen(open);
          if (!open) setRunReportSession(null);
        }}
        items={runModalItems}
        autoApprove={autoApprove}
        onAutoApproveChange={setAutoApprove}
        runOptions={runOptions}
        onRunReports={handleRunReportModalRun}
        isRunning={isRunningReports}
      />
    </div>
  );
}

function CoverageStatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${className}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CoverageEntryRow({
  entry,
  rowRef,
  dataIndex,
  onEditEntry,
  onFindReportClick,
  onRunReportClick,
  onReplaceReport,
  onRemoveReport,
}: {
  entry: CoverageEntry;
  rowRef: (element: HTMLTableRowElement | null) => void;
  dataIndex: number;
  onEditEntry: (entry: CoverageEntry) => void;
  onFindReportClick: () => void;
  onRunReportClick: () => void;
  onReplaceReport: (report: RegistryReportPill) => void;
  onRemoveReport: (report: RegistryReportPill) => void;
}) {
  const { t } = useI18n();

  const statusLabel =
    entry.status === "matched"
      ? t("overview.coverage.filters.matched")
      : entry.status === "missing"
        ? t("overview.coverage.filters.missing")
        : t("overview.coverage.filters.ambiguous");

  const statusClass =
    entry.status === "matched"
      ? "text-green-03"
      : entry.status === "missing"
        ? "text-orange-03"
        : "text-yellow-400";

  const reports = entry.registryReports ?? [];
  const canRunReport = registryReportYears(reports).length > 0;

  return (
    <tr
      ref={rowRef}
      data-index={dataIndex}
      className="border-t border-gray-03/60"
    >
      <td
        className="px-4 py-2 text-gray-01 align-top truncate"
        title={entry.name}
      >
        {entry.name}
      </td>
      <td className={`px-4 py-2 font-medium align-top ${statusClass}`}>
        <span>{statusLabel}</span>
        {entry.matchMethod === "manual" ? (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-03">
            {t("overview.coverage.manualBadge")}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-2 text-gray-02 align-top truncate">
        {entry.matchedCompany ? (
          <Link
            to={editorCompanyPath(
              entry.matchedCompany.wikidataId ?? entry.matchedCompany.id,
            )}
            className="text-blue-03 hover:underline"
          >
            {entry.matchedCompany.name}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2 align-top">
        {reports.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {reports.map((report) => (
              <div
                key={report.reportId}
                className="inline-flex items-center gap-0.5"
              >
                <ReportYearPill report={report} />
                <button
                  type="button"
                  className="rounded-full p-1 text-gray-02 transition-colors hover:bg-gray-03/60 hover:text-gray-01"
                  title={t("overview.coverage.replaceReportUrl")}
                  onClick={() => onReplaceReport(report)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-1 text-gray-02 transition-colors hover:bg-pink-03/20 hover:text-pink-03"
                  title={t("overview.coverage.removeReport")}
                  onClick={() => onRemoveReport(report)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <span className="font-medium text-gray-02">
            {t("overview.coverage.reports.missing")}
          </span>
        )}
      </td>
      <td className="px-4 py-2 align-top">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditEntry(entry)}
          >
            {t("overview.coverage.editMatch")}
          </Button>
          <Button variant="outline" size="sm" onClick={onFindReportClick}>
            {t("overview.coverage.findReport")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRunReportClick}
            disabled={!canRunReport}
            title={
              canRunReport
                ? undefined
                : t("overview.coverage.runReportDisabled")
            }
          >
            {t("overview.coverage.runReport")}
          </Button>
        </div>
      </td>
    </tr>
  );
}
