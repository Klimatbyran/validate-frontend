import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import { ClientTablePagination } from "@/ui/client-table-pagination";
import type { RegistryEntry, RegistryEntryUpdate } from "../lib/registry-types";
import {
  isSameRegistryEntrySelection,
  registryEntrySelectionKey,
} from "../lib/registry-utils";
import RegistryResultItem from "./RegistryResultItem";

type RegistryPagination = {
  from: number;
  to: number;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

interface RegistryResultsListProps {
  registry: RegistryEntry[];
  selectedReports: RegistryEntry[];
  allSelected: boolean;
  onSelectAll: () => void;
  onToggleSelect: (entry: RegistryEntry) => void;
  onEdit: (entry: RegistryEntryUpdate) => Promise<void>;
  editingReportIds: string[];
  pagination: RegistryPagination;
}

const RegistryResultsList = ({
  registry,
  selectedReports,
  allSelected,
  onSelectAll,
  onToggleSelect,
  onEdit,
  editingReportIds,
  pagination,
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
                {t("registry.batch")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">
                {t("registry.reportType")}
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
              const rowKey = registryEntrySelectionKey(entry);
              const isSelected = selectedReports.some((r) =>
                isSameRegistryEntrySelection(r, entry),
              );
              return (
                <RegistryResultItem
                  key={rowKey}
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
        <ClientTablePagination
          from={pagination.from}
          to={pagination.to}
          filteredTotal={pagination.total}
          page={pagination.page}
          totalPages={pagination.totalPages}
          showAll={false}
          canPaginate={pagination.totalPages > 1}
          onPageChange={pagination.onPageChange}
          onShowAllChange={() => undefined}
        />
      </DataTableShell>
    </motion.div>
  );
};

export default RegistryResultsList;
