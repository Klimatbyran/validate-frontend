import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import RegistryControls from "./components/RegistryControls";
import RegistryStats from "./components/RegistryStats";
import RegistryResultsList from "./components/RegistryResultsList";
import type { RegistryEntry } from "./lib/registry-types";
import {
  buildRegistryStats,
  filterRegistryEntries,
  writeRegistryEntriesToCsv,
} from "./lib/registry-utils";
import { fetchRegistryList } from "./lib/registry-api";

export function RegistryTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedReports, setSelectedReports] = useState<RegistryEntry[]>([]);
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);

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
          />
        </>
      )}
    </div>
  );
}
