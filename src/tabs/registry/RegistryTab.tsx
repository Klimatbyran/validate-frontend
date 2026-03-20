import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import RegistryControls from "./components/RegistryControls";
import RegistryStats from "./components/RegistryStats";
import RegistryResultsList from "./components/RegistryResultsList";
import type { RegistryEntry } from "./lib/registry-types";
import { searchRegistryEntries } from "./lib/registry-api";
import { buildRegistryStats } from "./lib/registry-utils";

export function RegistryTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [selectedReports, setSelectedReports] = useState<RegistryEntry[]>([]);
  const stats = useMemo(() => buildRegistryStats(entries), [entries]);

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setSelectedReports([]);

    try {
      const results = await searchRegistryEntries(trimmedQuery);
      setEntries(results);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setEntries([]);
    setHasSearched(false);
    setSelectedReports([]);
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
    if (selectedReports.length === entries.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(entries);
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
          onQueryChange={setQuery}
          onSearch={handleSearch}
          onClear={handleClear}
          isLoading={isLoading}
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

      {!isLoading && !hasSearched && (
        <p className="text-sm text-gray-02">{t("registry.typeQueryHint")}</p>
      )}

      {!isLoading && hasSearched && entries.length === 0 && (
        <p className="text-sm text-gray-02">{t("registry.noResults")}</p>
      )}

      {!isLoading && entries.length > 0 && (
        <>
          <RegistryStats stats={stats} />
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-02">
              {t("registry.selected")}: {selectedReports.length} /{" "}
              {entries.length}
            </p>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm px-3 py-1.5 bg-blue-03 text-gray-05 rounded hover:bg-blue-04 transition-colors"
            >
              {selectedReports.length === entries.length
                ? t("registry.clearAll")
                : t("registry.selectAll")}
            </button>
          </div>
          <RegistryResultsList
            entries={entries}
            selectedReports={selectedReports}
            onToggleSelect={handleToggleSelect}
          />
        </>
      )}
    </div>
  );
}
