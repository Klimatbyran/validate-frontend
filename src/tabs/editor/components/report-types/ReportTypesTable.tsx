import type { ReportType } from "../../lib/types";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface ReportTypesTableProps {
  options: ReportType[];
  onEdit: (opt: ReportType) => void;
  onDelete: (opt: ReportType) => void;
  disabled?: boolean;
}

export function ReportTypesTable({
  options,
  onEdit,
  onDelete,
  disabled = false,
}: ReportTypesTableProps) {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-03 bg-gray-04/80">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-03">
            <th className="px-4 py-3 font-semibold text-gray-02">
              {t("editor.reportTypes.slug")}
            </th>
            <th className="px-4 py-3 font-semibold text-gray-02">
              {t("editor.reportTypes.label")}
            </th>
            <th className="px-4 py-3 font-semibold text-gray-02">
              {t("editor.reportTypes.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt) => (
            <tr key={opt.id} className="border-b border-gray-03/60 last:border-0">
              <td className="px-4 py-3 font-mono text-gray-01">{opt.slug}</td>
              <td className="px-4 py-3 text-gray-02">
                {opt.label ?? t("common.placeholderDash")}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(opt)}
                    disabled={disabled}
                    aria-label={t("editor.reportTypes.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(opt)}
                    disabled={disabled}
                    aria-label={t("editor.reportTypes.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
