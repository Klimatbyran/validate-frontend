import { Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { TagOption } from "../lib/types";

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
    <div className="rounded-lg border border-gray-03 bg-gray-04/80 overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-03 bg-gray-04 text-gray-02 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">{t("editor.tagOptions.slug")}</th>
            <th className="px-4 py-3 font-medium">{t("editor.tagOptions.label")}</th>
            <th className="px-4 py-3 font-medium w-28">{t("editor.tagOptions.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt) => (
            <tr key={opt.id} className="border-b border-gray-03/50 hover:bg-gray-04/50">
              <td className="px-4 py-3 text-gray-01 font-mono text-sm">{opt.slug}</td>
              <td className="px-4 py-3 text-gray-01">{opt.label ?? "—"}</td>
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
        </tbody>
      </table>
    </div>
  );
}
