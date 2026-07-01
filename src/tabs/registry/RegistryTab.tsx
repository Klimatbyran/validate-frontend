import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Callout } from "@/ui/callout";
import { RunReportsModal } from "@/components/RunReportsModal";
import { useRunReportsPipeline } from "@/hooks/useRunReportsPipeline";
import RegistryControls from "./components/RegistryControls";
import RegistryStats from "./components/RegistryStats";
import RegistryResultsList from "./components/RegistryResultsList";
import type {
  RegistryBulkFileAddInput,
  RegistryBulkProgress,
  RegistryEntry,
  RegistryEntryUpdate,
  RegistryNewEntry,
} from "./lib/registry-types";
import {
  isSameRegistryEntrySelection,
  registryEntrySelectionKey,
  writeRegistryEntriesToCsv,
} from "./lib/registry-utils";
import {
  defaultRegistryViewFilters,
  mergeRegistryViewFilters,
  type RegistryViewFilters,
} from "./lib/registry-table-utils";
import { useGarboCompanyTagsMap } from "./hooks/useGarboCompanyTagsMap";
import {
  RegistryBatchesProvider,
  useRegistryBatchesContext,
} from "./contexts/RegistryBatchesContext";
import { useRegistryData } from "./hooks/useRegistryData";
import {
  addRegistryEntry,
  addRegistryEntries,
  addRegistryEntriesFromFiles,
  deleteReportFromRegistry,
  editRegistryEntry,
  getRegistryRunReportsPipelineConfig,
} from "./lib/registry-api";
import RegistryFiltersAndSort from "./components/RegistryFiltersAndSort";
import RegistryAddModal from "./components/RegistryAddModal";

export function RegistryTab() {
  return (
    <RegistryBatchesProvider>
      <RegistryTabContent />
    </RegistryBatchesProvider>
  );
}

function RegistryTabContent() {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedReports, setSelectedReports] = useState<RegistryEntry[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false);
  const [editingReportIds, setEditingReportIds] = useState<string[]>([]);
  const [isRunReportsOpen, setIsRunReportsOpen] = useState<boolean>(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState<boolean>(false);
  const [isAddingEntry, setIsAddingEntry] = useState<boolean>(false);
  const [bulkAddProgress, setBulkAddProgress] =
    useState<RegistryBulkProgress | null>(null);
  const [filters, setFilters] = useState(defaultRegistryViewFilters);
  const resetListView = useCallback(() => {
    setPage(1);
    setSelectedReports([]);
  }, []);
  const patchFilters = useCallback(
    (patch: Partial<RegistryViewFilters>) => {
      setFilters((f) => mergeRegistryViewFilters(f, patch));
      resetListView();
    },
    [resetListView],
  );
  const {
    wikidataToTags,
    loading: companyTagsLoading,
    error: companyTagsError,
  } = useGarboCompanyTagsMap();
  const {
    batches: registryBatches,
    isLoading: registryBatchesLoading,
    refetch: refetchRegistryBatches,
  } = useRegistryBatchesContext();
  const {
    runForUrls,
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
    tagOptions,
    tagsLoading,
  } = useRunReportsPipeline({
    ...getRegistryRunReportsPipelineConfig(),
    batchesOverride: {
      batches: registryBatches,
      isLoading: registryBatchesLoading,
      refetch: refetchRegistryBatches,
    },
  });

  const batchFilterOptions = useMemo(
    () =>
      [...registryBatches]
        .sort((a, b) =>
          a.batchName.localeCompare(b.batchName, undefined, {
            sensitivity: "base",
          }),
        )
        .map(({ id, batchName }) => ({ id, batchName })),
    [registryBatches],
  );

  const {
    rows: displayedRegistry,
    meta,
    reportYears: distinctReportYears,
    stats,
    isLoading,
    loadError,
    isAuthError,
    hasStructuredFilters,
    refresh,
  } = useRegistryData({
    page,
    query,
    filters,
    wikidataToTags,
    companyTagsLoading,
  });

  const handleRefresh = () => {
    void refresh();
  };

  const handleExport = () => {
    if (!selectedReports.length) {
      return;
    }

    writeRegistryEntriesToCsv(selectedReports);
  };

  const handleToggleSelect = (entry: RegistryEntry) => {
    setSelectedReports((current) => {
      const isSelected = current.some((r) =>
        isSameRegistryEntrySelection(r, entry),
      );
      if (isSelected) {
        const key = registryEntrySelectionKey(entry);
        return current.filter((r) => registryEntrySelectionKey(r) !== key);
      }
      return [...current, entry];
    });
  };

  const handleSelectAll = () => {
    if (selectedReports.length === displayedRegistry.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(displayedRegistry);
    }
  };

  const selectedReportIds = useMemo(
    () =>
      selectedReports
        .map((entry) => entry.id)
        .filter((id): id is string => Boolean(id)),
    [selectedReports],
  );

  const handleDeleteSelected = async () => {
    if (!selectedReportIds.length) {
      return;
    }

    setIsDeletingSelected(true);
    try {
      await deleteReportFromRegistry(selectedReportIds);
      const deletedIds = new Set(selectedReportIds);
      setSelectedReports((current) =>
        current.filter((item) => !item.id || !deletedIds.has(item.id)),
      );
      await refresh();
    } catch (error) {
      console.error("Failed to delete selected reports", error);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleModalRun = useCallback(() => {
    const urls = selectedReports
      .map((entry) => entry.url?.trim())
      .filter((url): url is string => Boolean(url));
    void runForUrls(urls, { onSuccess: () => setIsRunReportsOpen(false) });
  }, [runForUrls, selectedReports]);

  const handleAddEntry = async (entry: RegistryNewEntry) => {
    setIsAddingEntry(true);
    try {
      await addRegistryEntry(entry);
      await refresh();
      refetchRegistryBatches();
      toast.success(t("registry.addEntrySuccess"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("registry.addEntryError", { message }));
      throw error;
    } finally {
      setIsAddingEntry(false);
    }
  };

  const handleAddMany = async (entries: RegistryNewEntry[]) => {
    setIsAddingEntry(true);
    try {
      const saved = await addRegistryEntries(entries);
      await refresh();
      refetchRegistryBatches();
      toast.success(t("registry.addEntriesSuccess", { count: saved.length }));
    } catch (error) {
      const partial = error as Error & { partialSuccess?: RegistryEntry[] };
      if (partial.partialSuccess?.length) {
        await refresh();
        refetchRegistryBatches();
        toast.warning(
          t("registry.addEntriesPartial", {
            saved: partial.partialSuccess.length,
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("registry.addEntryError", { message }));
      throw error;
    } finally {
      setIsAddingEntry(false);
    }
  };

  const handleAddFiles = async (input: RegistryBulkFileAddInput) => {
    setIsAddingEntry(true);
    setBulkAddProgress({
      phase: "upload",
      completed: 0,
      total: input.files.length,
    });
    try {
      const newEntries = await addRegistryEntriesFromFiles({
        ...input,
        onProgress: setBulkAddProgress,
      });
      await refresh();
      refetchRegistryBatches();
      toast.success(
        t("registry.addEntriesSuccess", { count: newEntries.length }),
      );
    } catch (error) {
      const partial = error as Error & { partialSuccess?: RegistryEntry[] };
      if (partial.partialSuccess?.length) {
        await refresh();
        refetchRegistryBatches();
        toast.warning(
          t("registry.addEntriesPartial", {
            saved: partial.partialSuccess.length,
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("registry.addEntryError", { message }));
      throw error;
    } finally {
      setIsAddingEntry(false);
      setBulkAddProgress(null);
    }
  };

  const handleEditEntry = async (entry: RegistryEntryUpdate) => {
    const reportId = entry.id;

    setEditingReportIds((current) =>
      current.includes(reportId) ? current : [...current, reportId],
    );

    try {
      const updatedEntry = await editRegistryEntry(entry);
      setSelectedReports((current) =>
        current.map((item) =>
          item.id === updatedEntry.id ? updatedEntry : item,
        ),
      );
      toast.success(t("registry.editReportSuccess"));
      refetchRegistryBatches();
      await refresh();
    } catch (error) {
      console.error("Failed to edit registry entry", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("registry.editReportError", { message }));
    } finally {
      setEditingReportIds((current) => current.filter((id) => id !== reportId));
    }
  };

  const paginationFrom =
    meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const paginationTo = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-gray-01">
          {t("registry.title")}
        </h2>
        <p className="text-sm text-gray-02 mt-2 mb-4">
          {t("registry.subtitle")}
        </p>

        <RegistryControls
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            resetListView();
          }}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
          onAddEntry={() => setIsAddEntryOpen(true)}
          onRunReports={() => setIsRunReportsOpen(true)}
          isRunReportsDisabled={!selectedReports.length}
          onExport={handleExport}
          isExportDisabled={!selectedReports.length}
          onDeleteSelected={handleDeleteSelected}
          isDeleteDisabled={
            !selectedReports.length || !selectedReportIds.length
          }
          selectedCount={selectedReports.length}
          isDeletingSelected={isDeletingSelected}
        />

        <RegistryAddModal
          open={isAddEntryOpen}
          onOpenChange={setIsAddEntryOpen}
          onAdd={handleAddEntry}
          onAddMany={handleAddMany}
          onAddFiles={handleAddFiles}
          isAdding={isAddingEntry}
          bulkProgress={bulkAddProgress}
        />

        <RegistryFiltersAndSort
          disabled={isLoading && displayedRegistry.length === 0}
          filters={filters}
          onFiltersChange={patchFilters}
          distinctYears={distinctReportYears}
          batchOptions={batchFilterOptions}
          batchesLoading={registryBatchesLoading}
          tagOptions={tagOptions}
          tagsOptionsLoading={tagsLoading}
          companyTagsLoading={companyTagsLoading}
          companyTagsError={companyTagsError}
        />

        <RunReportsModal
          open={isRunReportsOpen}
          onOpenChange={setIsRunReportsOpen}
          items={selectedReports}
          autoApprove={autoApprove}
          onAutoApproveChange={setAutoApprove}
          runOptions={runOptions}
          onRunReports={handleModalRun}
          isRunning={isRunningReports}
        />
      </motion.div>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
            <p className="text-sm text-gray-02">{t("registry.loading")}</p>
          </div>
        </div>
      )}

      {!isLoading && isAuthError && (
        <Callout variant="info">
          <p className="text-sm text-blue-03/90">
            {t("auth.loginRequiredTab")}
          </p>
        </Callout>
      )}

      {!isLoading && !isAuthError && loadError && (
        <p className="text-sm text-red-01">{t("registry.fetchError")}</p>
      )}

      {!isLoading &&
        !isAuthError &&
        !loadError &&
        meta.total === 0 &&
        !query.trim() &&
        !hasStructuredFilters && (
          <p className="text-sm text-gray-02">{t("registry.empty")}</p>
        )}

      {!isLoading &&
        !isAuthError &&
        !loadError &&
        meta.total === 0 &&
        (query.trim().length > 0 || hasStructuredFilters) && (
          <p className="text-sm text-gray-02">{t("registry.noResults")}</p>
        )}

      {!isLoading &&
        !isAuthError &&
        !loadError &&
        displayedRegistry.length > 0 && (
          <>
            <RegistryStats stats={stats} />
            <RegistryResultsList
              registry={displayedRegistry}
              selectedReports={selectedReports}
              allSelected={selectedReports.length === displayedRegistry.length}
              onSelectAll={handleSelectAll}
              onToggleSelect={handleToggleSelect}
              onEdit={handleEditEntry}
              editingReportIds={editingReportIds}
              pagination={{
                from: paginationFrom,
                to: paginationTo,
                total: meta.total,
                page: meta.page,
                totalPages: meta.totalPages,
                onPageChange: setPage,
              }}
            />
          </>
        )}
    </div>
  );
}
