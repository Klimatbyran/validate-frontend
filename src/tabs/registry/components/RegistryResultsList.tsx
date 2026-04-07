import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import type { RegistryEntry, RegistryEntryUpdate } from "../lib/registry-types";
import RegistryResultItem from "./RegistryResultItem";

interface RegistryResultsListProps {
  registry: RegistryEntry[];
  selectedReports: RegistryEntry[];
  allSelected: boolean;
  onSelectAll: () => void;
  onToggleSelect: (entry: RegistryEntry) => void;
  onEdit: (entry: RegistryEntryUpdate) => Promise<void>;
  editingReportIds: string[];
}

const RegistryResultsList = ({
  registry,
  selectedReports,
  allSelected,
  onSelectAll,
  onToggleSelect,
  onEdit,
  editingReportIds,
}: RegistryResultsListProps) => {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg"
    >
      <DataTableShell>
        <DataTable className="text-left">
          <DataTableHead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">
                <span className="font-semibold text-gray-02 uppercase">
                  {t("registry.posts")}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">
                {t("registry.reportYear")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">
                {t("registry.reportUrl")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">
                {t("registry.edit")}
              </th>
              <th className="pl-4 py-3 flex flex-col text-xs tracking-wider">
                <span className="font-semibold flex gap-2 text-gray-02 uppercase">
                  {t("registry.selected")}
                  <button className="flex" onClick={onSelectAll}>
                    <span className="flex gap-2">
                      (
                      {allSelected
                        ? t("registry.clearAll")
                        : t("registry.selectAll")}
                      )
                    </span>
                  </button>
                </span>
                <span className="font-medium text-gray-02">
                  {t("registry.selected")}: {selectedReports.length}
                </span>
              </th>
            </tr>
          </DataTableHead>

          <DataTableBody>
            {registry.map((entry) => {
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
                  onEdit={onEdit}
                  isEditing={Boolean(
                    entry.id && editingReportIds.includes(entry.id),
                  )}
                />
              );
            })}
          </DataTableBody>
        </DataTable>
      </DataTableShell>
    </motion.div>
  );
};

export default RegistryResultsList;
