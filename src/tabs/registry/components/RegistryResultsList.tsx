import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import type { RegistryEntry } from "../lib/registry-types";
import RegistryResultItem from "./RegistryResultItem";

interface RegistryResultsListProps {
  entries: RegistryEntry[];
  selectedReports: RegistryEntry[];
  onToggleSelect: (entry: RegistryEntry) => void;
}

const RegistryResultsList = ({
  entries,
  selectedReports,
  onToggleSelect,
}: RegistryResultsListProps) => {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
    >
      <h3 className="text-xl font-semibold text-gray-01 mb-4">
        {t("registry.results")}
      </h3>

      <div className="rounded-lg border border-gray-03/70 overflow-hidden">
        {entries.map((entry) => {
          const entryId = entry.wikidataId ?? entry.url;
          const isSelected = selectedReports.some(
            (r) => (r.wikidataId ?? r.url) === entryId,
          );
          return (
            <RegistryResultItem
              key={entryId}
              entry={entry}
              selected={isSelected}
              onToggleSelect={onToggleSelect}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

export default RegistryResultsList;
