import { Check, CheckCircle, Pencil } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { DataTable, DataTableBody, DataTableHead, DataTableShell } from "@/ui/data-table";
import type { GarboCompanyListItem } from "../../lib/types";
import type { EditState } from "../../lib/types";
import { resolveCompanyReportId } from "../../lib/company-report-shells";
import { formatNumber, getScope2Total, getPeriodForYear } from "../../lib/multi-company-utils";

function periodEditContext(period: { startDate: string; endDate: string; companyReportId?: string | null; companyReport?: { id?: string } | null }) {
  return {
    startDate: period.startDate,
    endDate: period.endDate,
    companyReportId: resolveCompanyReportId(period),
  };
}

export function MultiCompanyTable({
  companies,
  selectedYear,
  allFilteredSelected,
  onToggleSelectAll,
  selectedCompanyIds,
  onToggleCompanySelection,
  actionLoading,
  onEdit,
}: {
  companies: GarboCompanyListItem[];
  selectedYear: string;
  allFilteredSelected: boolean;
  onToggleSelectAll: () => void;
  selectedCompanyIds: Set<string>;
  onToggleCompanySelection: (companyId: string) => void;
  actionLoading: boolean;
  onEdit: (state: EditState) => void;
}) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");

  return (
    <DataTableShell>
      <DataTable>
        <DataTableHead>
          <tr>
            <th className="w-10 px-2 py-3 font-medium">
              <label className="flex items-center justify-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={onToggleSelectAll}
                  className="sr-only"
                  aria-label={t("editor.companies.selectAll")}
                />
                <span
                  className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                    allFilteredSelected ? "bg-blue-03 border-blue-03" : "border-gray-03"
                  }`}
                  aria-hidden
                >
                  {allFilteredSelected && <Check className="w-3 h-3 text-white" />}
                </span>
              </label>
            </th>
            <th className="px-4 py-3 font-medium">{t("editor.companies.company")}</th>
            <th className="px-4 py-3 font-medium">{t("editor.companies.tags")}</th>
            {selectedYear && (
              <>
                <th className="px-4 py-3 font-medium">{t("editor.companies.reportUrl")}</th>
                <th className="px-4 py-3 font-medium">{t("editor.companies.scope1")}</th>
                <th className="px-4 py-3 font-medium">{t("editor.companies.scope2")}</th>
                <th className="px-4 py-3 font-medium w-24">{t("editor.companies.edit")}</th>
              </>
            )}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {companies.map((c) => {
            const period = selectedYear
              ? getPeriodForYear(c.reportingPeriods, Number(selectedYear))
              : null;
            const scope1 = period?.emissions?.scope1?.total ?? null;
            const scope2 = getScope2Total(period);
            const checked = selectedCompanyIds.has(c.id);

            return (
              <tr key={c.id} className="hover:bg-gray-04/50">
                <td className="w-10 px-2 py-3">
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleCompanySelection(c.id)}
                      className="sr-only"
                      aria-label={t("editor.companies.select")}
                    />
                    <span
                      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                        checked ? "bg-blue-03 border-blue-03" : "border-gray-03"
                      }`}
                      aria-hidden
                    >
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                  </label>
                </td>
                <td className="px-4 py-3 text-gray-01 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-01">
                  {c.tags?.length ? c.tags.join(", ") : dash}
                  <button
                    type="button"
                    onClick={() =>
                      onEdit({
                        companyId: c.id,
                        companyName: c.name,
                        field: "tags",
                        currentValue: c.tags?.join(", ") ?? "",
                      })
                    }
                    disabled={actionLoading}
                    className="ml-2 p-1 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50"
                    aria-label={t("editor.companies.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
                {selectedYear && period && (
                  <>
                    <td className="px-4 py-3 text-gray-01">
                      {period.reportURL ? (
                        <a
                          href={period.reportURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-03 hover:underline truncate max-w-[180px] block"
                        >
                          {period.reportURL}
                        </a>
                      ) : (
                        dash
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onEdit({
                            companyId: c.id,
                            companyName: c.name,
                            field: "reportURL",
                            year: Number(selectedYear),
                            ...periodEditContext(period),
                            currentValue: period.reportURL ?? "",
                          })
                        }
                        disabled={actionLoading}
                        className="ml-2 p-1 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50 inline-flex align-middle"
                        aria-label={t("editor.companies.edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-01">
                      {formatNumber(scope1, dash)}
                      <button
                        type="button"
                        onClick={() =>
                          onEdit({
                            companyId: c.id,
                            companyName: c.name,
                            field: "scope1",
                            year: Number(selectedYear),
                            ...periodEditContext(period),
                            currentValue: scope1,
                          })
                        }
                        disabled={actionLoading}
                        className="ml-2 p-1 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50 inline-flex align-middle"
                        aria-label={t("editor.companies.edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-01">
                      {formatNumber(scope2, dash)}
                      <button
                        type="button"
                        onClick={() =>
                          onEdit({
                            companyId: c.id,
                            companyName: c.name,
                            field: "scope2",
                            year: Number(selectedYear),
                            ...periodEditContext(period),
                            currentValue: scope2,
                          })
                        }
                        disabled={actionLoading}
                        className="ml-2 p-1 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50 inline-flex align-middle"
                        aria-label={t("editor.companies.edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onEdit({
                              companyId: c.id,
                              companyName: c.name,
                              field: "scope1",
                              year: Number(selectedYear),
                              ...periodEditContext(period),
                              currentValue: scope1,
                            })
                          }
                          disabled={actionLoading}
                          className="p-2 rounded-full text-gray-02 hover:text-green-600 hover:bg-gray-03 disabled:opacity-50"
                          aria-label={t("editor.companies.verify")}
                          title={t("editor.companies.verify")}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </DataTableBody>
      </DataTable>
    </DataTableShell>
  );
}

