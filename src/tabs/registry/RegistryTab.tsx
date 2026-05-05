import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useBatches } from "@/hooks/useBatches";
import { DEFAULT_RUN_ONLY, type RunOnlyWorkerId } from "@/lib/run-only-workers";
import { NEW_BATCH_DROPDOWN_VALUE } from "@/lib/garbo-batch-types";
import { resolvePipelineBatchId } from "@/lib/resolve-pipeline-batch-id";
import { useTagOptions } from "@/tabs/upload/hooks/useTagOptions";
import {
  UploadApiError,
  createJobsFromUrls,
} from "@/tabs/upload/lib/upload-api";
import RegistryControls from "./components/RegistryControls";
import RegistryRunReportsModal from "./components/RegistryRunReportsModal";
import RegistryStats from "./components/RegistryStats";
import RegistryResultsList from "./components/RegistryResultsList";
import type { RegistryEntry, RegistryEntryUpdate } from "./lib/registry-types";
import { writeRegistryEntriesToCsv } from "./lib/registry-utils";
import {
  defaultRegistryViewFilters,
  mergeRegistryViewFilters,
  type RegistryViewFilters,
} from "./lib/registry-table-utils";
import { useGarboCompanyTagsMap } from "./hooks/useGarboCompanyTagsMap";
import { useRegistryDisplayedView } from "./hooks/useRegistryDisplayedView";
import {
  deleteReportFromRegistry,
  editRegistryEntry,
  fetchRegistryList,
} from "./lib/registry-api";
import RegistryFiltersAndSort from "./components/RegistryFiltersAndSort";

export function RegistryTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedReports, setSelectedReports] = useState<RegistryEntry[]>([]);
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false);
  const [editingReportIds, setEditingReportIds] = useState<string[]>([]);
  const [isRunReportsOpen, setIsRunReportsOpen] = useState<boolean>(false);
  const [isRunningReports, setIsRunningReports] = useState<boolean>(false);
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [runAllWorkers, setRunAllWorkers] = useState<boolean>(false);
  const [selectedWorkers, setSelectedWorkers] = useState<RunOnlyWorkerId[]>(
    DEFAULT_RUN_ONLY,
  );
  const [forceReindex, setForceReindex] = useState<boolean>(false);
  const [batchDropdownChoice, setBatchDropdownChoice] = useState<string>("");
  const [customBatchName, setCustomBatchName] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filters, setFilters] = useState(defaultRegistryViewFilters);
  const patchFilters = useCallback((patch: Partial<RegistryViewFilters>) => {
    setFilters((f) => mergeRegistryViewFilters(f, patch));
  }, []);
  const {
    wikidataToTags,
    loading: companyTagsLoading,
    error: companyTagsError,
  } = useGarboCompanyTagsMap();
  const {
    batches: existingBatches,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatches();
  const { tagOptions, loading: tagsLoading, error: tagsError } = useTagOptions();

  const {
    displayedRegistry,
    distinctReportYears,
    hasStructuredFilters,
    stats,
  } = useRegistryDisplayedView(registry, query, filters, wikidataToTags);

  const loadRegistry = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchRegistryList();
      setRegistry(Array.isArray(data) ? data : []);
      setSelectedReports([]);
    } catch (error) {
      console.error("Failed to load registry", error);
      setRegistry([]);
      setSelectedReports([]);
      setLoadError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRegistry();
  }, [loadRegistry]);

  const handleRefresh = () => {
    void loadRegistry();
  };

  const handleExport = () => {
    if (!selectedReports.length) {
      return;
    }

    writeRegistryEntriesToCsv(selectedReports);
  };

  const handleToggleSelect = (entry: RegistryEntry) => {
    const entryId = entry.wikidataId ?? entry.url;
    setSelectedReports((current) => {
      const isSelected = current.some(
        (r) => (r.wikidataId ?? r.url) === entryId,
      );
      if (isSelected) {
        return current.filter((r) => (r.wikidataId ?? r.url) !== entryId);
      } else {
        return [...current, entry];
      }
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

  const runOnly =
    !runAllWorkers && selectedWorkers.length > 0 ? selectedWorkers : undefined;
  const tags = selectedTags.length > 0 ? selectedTags : undefined;

  const handleDeleteSelected = async () => {
    if (!selectedReportIds.length) {
      return;
    }

    setIsDeletingSelected(true);
    try {
      await deleteReportFromRegistry(selectedReportIds);
      const deletedIds = new Set(selectedReportIds);
      setRegistry((current) =>
        current.filter((item) => !item.id || !deletedIds.has(item.id)),
      );
      setSelectedReports((current) =>
        current.filter((item) => !item.id || !deletedIds.has(item.id)),
      );
    } catch (error) {
      console.error("Failed to delete selected reports", error);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleWorkerToggle = useCallback(
    (workerId: RunOnlyWorkerId, checked: boolean) => {
      setSelectedWorkers((current) =>
        checked
          ? [...current, workerId]
          : current.filter((id) => id !== workerId),
      );
    },
    [],
  );

  const handleRunReports = async () => {
    const urls = selectedReports
      .map((entry) => entry.url?.trim())
      .filter((url): url is string => Boolean(url));

    if (!urls.length) {
      toast.error(t("registry.noReportUrls"));
      return;
    }

    if (!runAllWorkers && selectedWorkers.length === 0) {
      toast.error(t("upload.selectAtLeastOneWorker"));
      return;
    }

    if (
      batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE &&
      !customBatchName.trim()
    ) {
      toast.error(t("upload.batchNameRequired"));
      return;
    }

    let pipelineBatchId: string | undefined;
    try {
      pipelineBatchId = await resolvePipelineBatchId({
        batchDropdownChoice,
        customBatchName,
      });
    } catch (e) {
      toast.error(
        t("upload.couldNotAddJobs", {
          message: e instanceof Error ? e.message : t("upload.unknownError"),
        }),
      );
      return;
    }

    setIsRunningReports(true);
    try {
      const result = await createJobsFromUrls({
        urls,
        autoApprove,
        forceReindex,
        batchId: pipelineBatchId,
        runOnly,
        tags,
      });

      const envelope =
        !Array.isArray(result) && result && typeof result === "object"
          ? result
          : null;
      const cacheErrors =
        envelope && Array.isArray(envelope.errors) ? envelope.errors : [];

      if (cacheErrors.length > 0) {
        toast.warning(
          t("registry.runReportsPartial", {
            failed: cacheErrors.length,
            total: urls.length,
            succeeded: urls.length - cacheErrors.length,
          }),
        );
      } else {
        toast.success(t("registry.runReportsSuccess", { count: urls.length }));
      }

      if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
        refetchBatches();
      }

      setIsRunReportsOpen(false);
    } catch (error) {
      console.error("Failed to run selected reports", error);
      const errorMessage =
        error instanceof UploadApiError || error instanceof Error
          ? error.message
          : t("upload.unknownError");
      toast.error(t("registry.runReportsError", { message: errorMessage }));
    } finally {
      setIsRunningReports(false);
    }
  };

  const handleEditEntry = async (entry: RegistryEntryUpdate) => {
    const reportId = entry.id;

    setEditingReportIds((current) =>
      current.includes(reportId) ? current : [...current, reportId],
    );

    try {
      const updatedEntry = await editRegistryEntry(entry);
      setRegistry((current) =>
        current.map((item) =>
          item.id === updatedEntry.id ? updatedEntry : item,
        ),
      );
      setSelectedReports((current) =>
        current.map((item) =>
          item.id === updatedEntry.id ? updatedEntry : item,
        ),
      );
    } catch (error) {
      console.error("Failed to edit registry entry", error);
    } finally {
      setEditingReportIds((current) => current.filter((id) => id !== reportId));
    }
  };

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
            setSelectedReports([]);
          }}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
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

        <RegistryFiltersAndSort
          disabled={isLoading || registry.length === 0}
          filters={filters}
          onFiltersChange={patchFilters}
          distinctYears={distinctReportYears}
          tagOptions={tagOptions}
          tagsOptionsLoading={tagsLoading}
          companyTagsLoading={companyTagsLoading}
          companyTagsError={companyTagsError}
        />

        <RegistryRunReportsModal
          open={isRunReportsOpen}
          onOpenChange={setIsRunReportsOpen}
          selectedReports={selectedReports}
          autoApprove={autoApprove}
          onAutoApproveChange={setAutoApprove}
          runOptions={{
            batch: {
              existingBatches,
              batchesLoading,
              batchDropdownChoice,
              onBatchDropdownChoiceChange: setBatchDropdownChoice,
              customBatchName,
              onCustomBatchNameChange: setCustomBatchName,
            },
            tags: {
              tagOptions,
              tagsLoading,
              tagsError,
              selectedTags,
              onSelectedTagsChange: setSelectedTags,
            },
            workers: {
              runAllWorkers,
              onRunAllWorkersChange: setRunAllWorkers,
              selectedWorkers,
              onSelectedWorkersChange: handleWorkerToggle,
              forceReindex,
              onForceReindexChange: setForceReindex,
            },
          }}
          onRunReports={handleRunReports}
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

      {!isLoading && loadError && (
        <p className="text-sm text-red-01">{t("registry.fetchError")}</p>
      )}

      {!isLoading && !loadError && registry.length === 0 && (
        <p className="text-sm text-gray-02">{t("registry.empty")}</p>
      )}

      {!isLoading &&
        !loadError &&
        registry.length > 0 &&
        displayedRegistry.length === 0 &&
        (query.trim().length > 0 || hasStructuredFilters) && (
          <p className="text-sm text-gray-02">{t("registry.noResults")}</p>
        )}

      {!isLoading && !loadError && displayedRegistry.length > 0 && (
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
          />
        </>
      )}
    </div>
  );
}
