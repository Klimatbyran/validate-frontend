import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import RegistryControls from "./components/RegistryControls";
import RegistryStats from "./components/RegistryStats";
import RegistryResultsList from "./components/RegistryResultsList";
import type { RegistryEntry, RegistryEntryUpdate } from "./lib/registry-types";
import {
  buildRegistryStats,
  filterRegistryEntries,
  writeRegistryEntriesToCsv,
} from "./lib/registry-utils";
import {
  deleteReportFromRegistry,
  editRegistryEntry,
  fetchRegistryList,
} from "./lib/registry-api";

export function RegistryTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedReports, setSelectedReports] = useState<RegistryEntry[]>([]);
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false);
  const [editingReportIds, setEditingReportIds] = useState<string[]>([]);

  const filteredRegistry = useMemo(
    () => filterRegistryEntries(registry, query),
    [query, registry],
  );
  const stats = useMemo(
    () => buildRegistryStats(filteredRegistry),
    [filteredRegistry],
  );

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
    if (selectedReports.length === filteredRegistry.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(filteredRegistry);
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
          onExport={handleExport}
          isExportDisabled={!selectedReports.length}
          onDeleteSelected={handleDeleteSelected}
          isDeleteDisabled={
            !selectedReports.length || !selectedReportIds.length
          }
          selectedCount={selectedReports.length}
          isDeletingSelected={isDeletingSelected}
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
        query.trim().length > 0 &&
        filteredRegistry.length === 0 && (
          <p className="text-sm text-gray-02">{t("registry.noResults")}</p>
        )}

      {!isLoading && !loadError && filteredRegistry.length > 0 && (
        <>
          <RegistryStats stats={stats} />
          <RegistryResultsList
            registry={filteredRegistry}
            selectedReports={selectedReports}
            allSelected={selectedReports.length === filteredRegistry.length}
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
