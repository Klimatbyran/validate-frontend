import { useEffect, useRef, useState } from "react";
import { WandIcon } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { RunReportsModal } from "@/components/RunReportsModal";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { Button } from "@/ui/button";
import { ClientTablePagination } from "@/ui/client-table-pagination";
import { ViewModePills } from "@/ui/view-mode-pills";
import { CoverageCrawlReportsDialog } from "./CoverageCrawlReportsDialog";
import { CoverageFindReportDialog } from "./CoverageFindReportDialog";
import { CoverageReplaceReportUrlDialog } from "./CoverageReplaceReportUrlDialog";
import { CoverageRunReportYearPrompt } from "./CoverageRunReportYearPrompt";
import { CoverageRematchModeDialog } from "./CoverageRematchModeDialog";
import { CoverageYearEntriesTable } from "./CoverageYearEntriesTable";
import { CoverageYearStatsHeader } from "./CoverageYearStatsHeader";
import { useCoverageYearReportActions } from "@/tabs/overview/hooks/useCoverageYearReportActions";
import { coverageEntryForSavedReport } from "@/tabs/overview/lib/coverage-registry-report-run";
import type { SaveReportSuccess } from "@/tabs/crawler/lib/crawler-types";
import type {
  CoverageEntry,
  CoverageEntryFilter,
  CoverageRematchMode,
  CoverageYearDetail,
  RegistryReportPill,
} from "@/tabs/overview/lib/coverage-types";

type CoverageYearDetailProps = {
  listId: string;
  year: number;
  detail: CoverageYearDetail;
  filter: CoverageEntryFilter;
  onFilterChange: (filter: CoverageEntryFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isRefreshingRegistry: boolean;
  onRefreshRegistry: () => void;
  isRematching: boolean;
  onRematchCompanies: (mode: CoverageRematchMode) => void | Promise<void>;
  refreshingEntryId: string | null;
  onRefreshEntryReports: (entry: CoverageEntry) => void | Promise<void>;
  onEdit: () => void;
  onEditEntry: (entry: CoverageEntry) => void;
  onRegistryReportSaved?: (entryId: string, saved: SaveReportSuccess) => void;
  onRegistryReportRemoved?: (entryId: string, reportId: string) => void;
  onRegistryReportUpdated?: (
    entryId: string,
    reportId: string,
    updated: RegistryReportPill,
  ) => void;
  onEntryReportsLinked?: (detail: CoverageYearDetail) => void;
};

export function CoverageYearDetailView({
  listId,
  year,
  detail,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  page,
  totalPages,
  pageSize,
  onPageChange,
  isRefreshingRegistry,
  onRefreshRegistry,
  isRematching,
  onRematchCompanies,
  refreshingEntryId,
  onRefreshEntryReports,
  onEdit,
  onEditEntry,
  onRegistryReportSaved,
  onRegistryReportRemoved,
  onRegistryReportUpdated,
  onEntryReportsLinked,
}: CoverageYearDetailProps) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [crawlEntries, setCrawlEntries] = useState<CoverageEntry[] | null>(
    null,
  );
  const [rematchDialogOpen, setRematchDialogOpen] = useState(false);
  const entryByIdRef = useRef<Map<string, CoverageEntry>>(new Map());

  const filteredCount = detail.filteredCount ?? detail.entries.length;
  const entries = detail.entries;

  const reportActions = useCoverageYearReportActions({
    listId,
    year,
    entries,
    onRegistryReportRemoved,
    onRegistryReportUpdated,
    onEntryReportsLinked,
  });

  useEffect(() => {
    setSelectedIds(new Set());
    entryByIdRef.current = new Map();
    setCrawlEntries(null);
  }, [listId, year]);

  useEffect(() => {
    for (const entry of entries) {
      entryByIdRef.current.set(entry.id, entry);
    }
  }, [entries]);

  const loadedSelectedCount = entries.filter((entry) =>
    selectedIds.has(entry.id),
  ).length;
  const allLoadedSelected =
    entries.length > 0 && loadedSelectedCount === entries.length;
  const someLoadedSelected = loadedSelectedCount > 0 && !allLoadedSelected;

  const selectedCount = selectedIds.size;
  const selectedEntries = [...selectedIds]
    .map((id) => entryByIdRef.current.get(id))
    .filter((entry): entry is CoverageEntry => entry != null);

  const toggleEntrySelected = (entry: CoverageEntry) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      return next;
    });
  };

  const toggleSelectAllLoaded = () => {
    setSelectedIds((previous) => {
      if (allLoadedSelected) {
        const next = new Set(previous);
        for (const entry of entries) next.delete(entry.id);
        return next;
      }
      const next = new Set(previous);
      for (const entry of entries) next.add(entry.id);
      return next;
    });
  };

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

  return (
    <div className="space-y-4">
      <CoverageYearStatsHeader
        detail={detail}
        isRefreshingRegistry={isRefreshingRegistry}
        isRematching={isRematching}
        onEdit={onEdit}
        onRematchClick={() => setRematchDialogOpen(true)}
        onRefreshRegistry={onRefreshRegistry}
      />

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
        <Button
          size="sm"
          onClick={() => {
            if (selectedEntries.length === 0) return;
            setCrawlEntries(selectedEntries);
          }}
          disabled={selectedCount === 0 || crawlEntries != null}
        >
          {t("overview.coverage.crawlReports", { count: selectedCount })}
          <WandIcon className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-sm text-gray-02 tabular-nums">
          {t("overview.coverage.filteredCount", {
            shown: entries.length,
            total: filteredCount,
          })}
        </p>
      </div>

      <CoverageYearEntriesTable
        entries={entries}
        selectedIds={selectedIds}
        allLoadedSelected={allLoadedSelected}
        someLoadedSelected={someLoadedSelected}
        onToggleSelectAllLoaded={toggleSelectAllLoaded}
        onToggleEntrySelected={toggleEntrySelected}
        onEditEntry={onEditEntry}
        onRefreshEntryReports={(entry) => void onRefreshEntryReports(entry)}
        refreshingEntryId={refreshingEntryId}
        onFindReportClick={(entry) =>
          reportActions.setFindReportSession({ entry })
        }
        onRunReportClick={reportActions.handleRunReportClick}
        onRunReport={reportActions.openRunReportModal}
        onReplaceReport={(entry, report) =>
          reportActions.setReplaceReportTarget({ entryId: entry.id, report })
        }
        onRemoveReport={(entry, report) =>
          reportActions.setRemoveReportTarget({ entryId: entry.id, report })
        }
        onConfirmReport={(entry, report) => {
          void reportActions.handleConfirmReport(entry.id, report);
        }}
      />

      <ClientTablePagination
        from={filteredCount === 0 ? 0 : (page - 1) * pageSize + 1}
        to={Math.min(page * pageSize, filteredCount)}
        filteredTotal={filteredCount}
        unfilteredTotal={detail.totalNames}
        page={page}
        totalPages={totalPages}
        showAll={false}
        canPaginate={totalPages > 1}
        allowShowAll={false}
        onPageChange={onPageChange}
      />

      <CoverageRematchModeDialog
        open={rematchDialogOpen}
        onOpenChange={setRematchDialogOpen}
        isSubmitting={isRematching}
        onConfirm={async (mode) => {
          await onRematchCompanies(mode);
          setRematchDialogOpen(false);
        }}
      />

      {crawlEntries ? (
        <CoverageCrawlReportsDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setCrawlEntries(null);
              onRefreshRegistry();
            }
          }}
          entries={crawlEntries}
          runPipeline={reportActions.runPipeline}
          onSaved={(saved) => {
            const entry = coverageEntryForSavedReport(crawlEntries, saved);
            if (entry) onRegistryReportSaved?.(entry.id, saved);
          }}
        />
      ) : null}

      {reportActions.findReportSession ? (
        <CoverageFindReportDialog
          open
          onOpenChange={(open) => {
            if (!open) reportActions.setFindReportSession(null);
          }}
          listId={listId}
          entry={reportActions.findReportSession.entry}
          defaultYear={year}
          runPipeline={reportActions.runPipeline}
          onLinked={(linkedDetail) => {
            onEntryReportsLinked?.(linkedDetail);
            reportActions.setFindReportSession(null);
          }}
          onSaved={(saved) =>
            onRegistryReportSaved?.(
              reportActions.findReportSession!.entry.id,
              saved,
            )
          }
        />
      ) : null}

      {reportActions.replaceReportTarget ? (
        <CoverageReplaceReportUrlDialog
          open
          onOpenChange={(open) => {
            if (!open && !reportActions.isReplacingReport) {
              reportActions.setReplaceReportTarget(null);
            }
          }}
          report={reportActions.replaceReportTarget.report}
          isSaving={reportActions.isReplacingReport}
          onSave={reportActions.handleReplaceReportUrl}
        />
      ) : null}

      <ConfirmDialog
        open={reportActions.removeReportTarget != null}
        onOpenChange={(open) => {
          if (!open && !reportActions.isRemovingReport) {
            reportActions.setRemoveReportTarget(null);
          }
        }}
        title={t("overview.coverage.removeReportTitle")}
        description={t("overview.coverage.removeReportDescription", {
          year: reportActions.removeReportTarget?.report.reportYear ?? "?",
        })}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("overview.coverage.removeReportConfirm")}
        confirmVariant="danger"
        isLoading={reportActions.isRemovingReport}
        onConfirm={reportActions.handleRemoveReport}
      />

      {reportActions.runReportYearEntry ? (
        <CoverageRunReportYearPrompt
          open
          onOpenChange={(open) => {
            reportActions.setRunReportYearEntryId(
              open ? reportActions.runReportYearEntry!.id : null,
            );
          }}
          companyName={reportActions.runReportYearEntry.name}
          reports={reportActions.runReportYearEntry.registryReports}
          onConfirm={(report) =>
            reportActions.handleRunReportYearConfirm(
              reportActions.runReportYearEntry!,
              report,
            )
          }
        />
      ) : null}

      <RunReportsModal
        open={reportActions.isRunModalOpen}
        onOpenChange={(open) => {
          reportActions.setIsRunModalOpen(open);
          if (!open) reportActions.setRunReportSession(null);
        }}
        items={reportActions.runModalItems}
        autoApprove={reportActions.autoApprove}
        onAutoApproveChange={reportActions.setAutoApprove}
        runOptions={reportActions.runOptions}
        onRunReports={reportActions.handleRunReportModalRun}
        isRunning={reportActions.isRunningReports}
      />
    </div>
  );
}
