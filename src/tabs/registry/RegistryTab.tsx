import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Callout } from "@/ui/callout";
import { ApiAuthError } from "@/lib/garbo-auth-fetch";
import { RunReportsModal } from "@/components/RunReportsModal";
import { useRunReportsPipeline } from "@/hooks/useRunReportsPipeline";
import RegistryControls from "./components/RegistryControls";
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
  addRegistryEntry,
  deleteReportFromRegistry,
  editRegistryEntry,
  fetchRegistryList,
} from "./lib/registry-api";
import RegistryFiltersAndSort from "./components/RegistryFiltersAndSort";
import RegistryAddModal from "./components/RegistryAddModal";
import type { RegistryNewEntry } from "./lib/registry-types";

export function RegistryTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [selectedReports, setSelectedReports] = useState<RegistryEntry[]>([]);
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false);
  const [editingReportIds, setEditingReportIds] = useState<string[]>([]);
  const [isRunReportsOpen, setIsRunReportsOpen] = useState<boolean>(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState<boolean>(false);
  const [isAddingEntry, setIsAddingEntry] = useState<boolean>(false);
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
    runForUrls,
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
    tagOptions,
    tagsLoading,
  } = useRunReportsPipeline();

  const {
    displayedRegistry,
    distinctReportYears,
    hasStructuredFilters,
    stats,
  } = useRegistryDisplayedView(registry, query, filters, wikidataToTags);

  const loadRegistry = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setIsAuthError(false);
    try {
      const data = await fetchRegistryList();
      setRegistry(Array.isArray(data) ? data : []);
      setSelectedReports([]);
    } catch (error) {
      console.error("Failed to load registry", error);
      setRegistry([]);
      setSelectedReports([]);
      if (error instanceof ApiAuthError) {
        setIsAuthError(true);
      } else {
        setLoadError(error instanceof Error ? error.message : "Unknown error");
      }
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

  const handleModalRun = useCallback(() => {
    const urls = selectedReports
      .map((entry) => entry.url?.trim())
      .filter((url): url is string => Boolean(url));
    void runForUrls(urls, { onSuccess: () => setIsRunReportsOpen(false) });
  }, [runForUrls, selectedReports]);

  const handleAddEntry = async (entry: RegistryNewEntry) => {
    setIsAddingEntry(true);
    try {
      const newEntry = await addRegistryEntry(entry);
      setRegistry((current) => [newEntry, ...current]);
      toast.success(t("registry.addEntrySuccess"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("registry.addEntryError", { message }));
      throw error;
    } finally {
      setIsAddingEntry(false);
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
      toast.success(t("registry.editReportSuccess"));
    } catch (error) {
      console.error("Failed to edit registry entry", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("registry.editReportError", { message }));
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
          isAdding={isAddingEntry}
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

      {!isLoading && !isAuthError && !loadError && registry.length === 0 && (
        <p className="text-sm text-gray-02">{t("registry.empty")}</p>
      )}

      {!isLoading &&
        !isAuthError &&
        !loadError &&
        registry.length > 0 &&
        displayedRegistry.length === 0 &&
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
            />
          </>
        )}
    </div>
  );
}
