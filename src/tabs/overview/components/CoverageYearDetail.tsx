import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import { Button } from "@/ui/button";
import { ViewModePills } from "@/ui/view-mode-pills";
import { ReportYearPill } from "./ReportYearPill";
import { CoverageFindReportDialog } from "./CoverageFindReportDialog";
import { CoverageFindReportYearPrompt } from "./CoverageFindReportYearPrompt";
import { searchCompanyReports } from "@/tabs/crawler/lib/crawler-utils";
import { useRunReportsPipeline } from "@/hooks/useRunReportsPipeline";
import { fetchCoverageYearNames } from "@/tabs/overview/lib/coverage-api";
import type {
  CompanyReport,
  SaveReportSuccess,
} from "@/tabs/crawler/lib/crawler-types";
import type {
  CoverageEntry,
  CoverageEntryFilter,
  CoverageYearDetail,
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
};

type FindReportSession = {
  entry: CoverageEntry;
  reportYear: number;
  companyReport: CompanyReport;
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
}: CoverageYearDetailProps) {
  const { t } = useI18n();
  const [findReportSession, setFindReportSession] =
    useState<FindReportSession | null>(null);
  const [findingReportEntryId, setFindingReportEntryId] = useState<
    string | null
  >(null);
  const [yearPromptEntryId, setYearPromptEntryId] = useState<string | null>(
    null,
  );
  const [isLoadingRegistryNames, setIsLoadingRegistryNames] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const runPipeline = useRunReportsPipeline();

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

  const yearPromptEntry =
    yearPromptEntryId != null
      ? (entries.find((entry) => entry.id === yearPromptEntryId) ?? null)
      : null;

  const handleYearConfirm = async (
    entry: CoverageEntry,
    reportYear: number,
  ) => {
    setFindingReportEntryId(entry.id);
    try {
      const results = await searchCompanyReports({
        companies: [
          {
            name: entry.matchedCompany?.name ?? entry.name,
            reportYear: String(reportYear),
            wikidataId: entry.matchedCompany?.wikidataId,
          },
        ],
      });
      const report = results[0] ?? {
        companyName: entry.name,
        reportYear: String(reportYear),
        results: [],
      };
      setYearPromptEntryId(null);
      setFindReportSession({
        entry,
        reportYear,
        companyReport: {
          ...report,
          wikidataId: entry.matchedCompany?.wikidataId,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.findReportError"),
      );
    } finally {
      setFindingReportEntryId(null);
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
            className="border-blue-03/30 bg-blue-03/10 text-blue-03"
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
                      isFindingReport={findingReportEntryId === entry.id}
                      onEditEntry={onEditEntry}
                      onFindReportClick={() => setYearPromptEntryId(entry.id)}
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

      {yearPromptEntry ? (
        <CoverageFindReportYearPrompt
          open
          onOpenChange={(open) => {
            if (!findingReportEntryId) {
              setYearPromptEntryId(open ? yearPromptEntry.id : null);
            }
          }}
          companyName={yearPromptEntry.name}
          defaultYear={year}
          isSearching={findingReportEntryId === yearPromptEntry.id}
          onConfirm={(reportYear) =>
            void handleYearConfirm(yearPromptEntry, reportYear)
          }
        />
      ) : null}

      {findReportSession ? (
        <CoverageFindReportDialog
          open
          onOpenChange={(open) => {
            if (!open) setFindReportSession(null);
          }}
          entry={findReportSession.entry}
          reportYear={findReportSession.reportYear}
          companyReport={findReportSession.companyReport}
          runPipeline={runPipeline}
          onSaved={(saved) =>
            onRegistryReportSaved?.(findReportSession.entry.id, saved)
          }
        />
      ) : null}
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
  isFindingReport,
  onEditEntry,
  onFindReportClick,
}: {
  entry: CoverageEntry;
  rowRef: (element: HTMLTableRowElement | null) => void;
  dataIndex: number;
  isFindingReport: boolean;
  onEditEntry: (entry: CoverageEntry) => void;
  onFindReportClick: () => void;
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
          <div className="flex flex-wrap gap-1.5">
            {reports.map((report) => (
              <ReportYearPill key={report.reportId} report={report} />
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
            variant="secondary"
            size="sm"
            onClick={() => onEditEntry(entry)}
            disabled={isFindingReport}
          >
            {t("overview.coverage.editMatch")}
          </Button>
          {isFindingReport ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="min-w-[7.5rem]"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onFindReportClick}>
              {t("overview.coverage.findReport")}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
