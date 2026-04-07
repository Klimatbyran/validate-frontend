import { Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { TagOption } from "../../lib/types";
import { DataTable, DataTableBody, DataTableHead, DataTableShell } from "@/ui/data-table";

interface TagOptionsTableProps {
  options: TagOption[];
  onEdit: (opt: TagOption) => void;
  onDelete: (opt: TagOption) => void;
  disabled?: boolean;
}

export function TagOptionsTable({
  options,
  onEdit,
  onDelete,
  disabled = false,
}: TagOptionsTableProps) {
  const { t } = useI18n();

  return (
    <DataTableShell>
      <DataTable>
        <DataTableHead>
          <tr>
            <th className="px-4 py-3 font-medium text-gray-02 text-xs uppercase tracking-wider">
              {t("editor.tagOptions.slug")}
            </th>
            <th className="px-4 py-3 font-medium text-gray-02 text-xs uppercase tracking-wider">
              {t("editor.tagOptions.label")}
            </th>
            <th className="px-4 py-3 font-medium text-gray-02 text-xs uppercase tracking-wider w-28">
              {t("editor.tagOptions.actions")}
            </th>
          </tr>
        </DataTableHead>
        <DataTableBody>
            {options.map((opt) => (
              <tr key={opt.id} className="hover:bg-gray-04/50">
              <td className="px-4 py-3 text-gray-01 font-mono text-sm">{opt.slug}</td>
              <td className="px-4 py-3 text-gray-01">{opt.label ?? t("common.placeholderDash")}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(opt)}
                    disabled={disabled}
                    className="p-2 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50"
                    aria-label={t("editor.tagOptions.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(opt)}
                    disabled={disabled}
                    className="p-2 rounded-full text-gray-02 hover:text-red-500 hover:bg-gray-03 disabled:opacity-50"
                    aria-label={t("editor.tagOptions.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
    </DataTableShell>
  );
}
