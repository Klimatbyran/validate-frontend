import { useI18n } from "@/contexts/I18nContext";
import { AlertCircle, CheckCircle2, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import type { GarboCompanyListItem } from "../../lib/types";
import type { VerificationState } from "../../lib/verification";
import { displayBaseYear } from "../../lib/company-edit-utils";
import { editorCompanyPath } from "../../lib/editor-routes";
import type { CompanySortId } from "../../lib/single-company-overview-list";
import { ReportingPeriodQuickEditModal } from "./ReportingPeriodQuickEditModal";
import type { SingleCompanyOverviewList } from "../../hooks/useSingleCompanyOverviewList";

function StatusIcon({ state }: { state: VerificationState }) {
  if (state === "verified")
    return <CheckCircle2 className="w-4 h-4 text-green-03" />;
  if (state === "unverified")
    return <AlertCircle className="w-4 h-4 text-orange-03" />;
  return <Minus className="w-4 h-4 text-gray-03" />;
}

type Props = {
  list: SingleCompanyOverviewList;
  dash: string;
  quickEdit: { companyId: string; year: string } | null;
  onQuickEditChange: (v: { companyId: string; year: string } | null) => void;
};

export function SingleCompanyOverviewTable({
  list,
  dash,
  quickEdit,
  onQuickEditChange,
}: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();

  if (list.loadingList || list.filteredCompanies.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-lg border border-gray-03 bg-gray-05/60 px-4 py-3">
        <p className="text-sm text-gray-01">
          {t("editor.singleCompanyView.tableStatsLine", {
            shown: list.filteredCompanies.length,
            total: list.companyList.length,
            verifiedPeriods: list.filterPeriodStats.verifiedEmissionsPeriods,
            periodTotal: list.filterPeriodStats.totalPeriods,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-02">
            {t("editor.singleCompanyView.sortLabel")}
          </span>
          <SingleSelectDropdown
            options={
              [
                "name-asc",
                "name-desc",
                "id-asc",
                "id-desc",
              ] satisfies CompanySortId[]
            }
            value={list.companySort}
            onChange={(v) => list.setCompanySort(v as CompanySortId)}
            getOptionLabel={(id) => {
              switch (id) {
                case "name-desc":
                  return t("editor.singleCompanyView.sortNameDesc");
                case "id-asc":
                  return t("editor.singleCompanyView.sortIdAsc");
                case "id-desc":
                  return t("editor.singleCompanyView.sortIdDesc");
                default:
                  return t("editor.singleCompanyView.sortNameAsc");
              }
            }}
            placeholder={t("editor.singleCompanyView.sortNameAsc")}
            triggerClassName="min-w-[200px] !h-8 !text-xs px-3"
          />
        </div>
      </div>

      <DataTableShell>
        {quickEdit && (
          <ReportingPeriodQuickEditModal
            open={true}
            onOpenChange={(open) => {
              if (!open) onQuickEditChange(null);
            }}
            company={
              list.companyList.find((x) => x.id === quickEdit.companyId)!
            }
            year={quickEdit.year}
            onSaved={() => {
              void list.refreshCompanyList();
            }}
          />
        )}
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-3 font-medium w-[22%]">
                {t("editor.companies.company")}
              </th>
              <th className="px-4 py-3 font-medium">
                <div className="leading-tight">
                  <div>{t("editor.singleCompanyView.table.baseYear")}</div>
                  <div className="text-[10px] text-gray-01 normal-case tracking-normal">
                    {t("editor.singleCompanyView.table.allYears")}
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 font-medium">
                <div className="leading-tight">
                  <div>{t("editor.singleCompanyView.table.emissions")}</div>
                  <div className="text-[10px] text-gray-01 normal-case tracking-normal">
                    {t("editor.singleCompanyView.table.allYears")}
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 font-medium">
                <div className="leading-tight">
                  <div>{t("editor.singleCompanyView.table.economy")}</div>
                  <div className="text-[10px] text-gray-01 normal-case tracking-normal">
                    {t("editor.singleCompanyView.table.allYears")}
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 font-medium">
                {t("editor.companies.year")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("editor.singleCompanyView.sections.industry")}
              </th>
              <th className="px-4 py-3 font-medium w-[18%]">
                {t("editor.companies.tags")}
              </th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {list.sortedCompanies.map((c: GarboCompanyListItem) => {
              const overview = list.companyOverviewById.get(c.id);
              return (
                <tr
                  key={c.id}
                  onClick={() => navigate(editorCompanyPath(c.id))}
                  className="hover:bg-gray-04/50 cursor-pointer text-gray-01 align-top"
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      <span className="text-xs text-gray-02">
                        {c.wikidataId ?? c.id.split("-")[0]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-02">
                    <div className="flex items-center gap-2">
                      <StatusIcon state={overview?.baseYear ?? "none"} />
                      <span>{displayBaseYear(c.baseYear, dash)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusIcon state={overview?.emissions ?? "none"} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusIcon state={overview?.economy ?? "none"} />
                  </td>
                  <td className="px-4 py-3 text-gray-02">
                    {overview?.perYear?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {overview.perYear.map((p) => (
                          <button
                            key={p.year}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickEditChange({
                                companyId: c.id,
                                year: p.year,
                              });
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-03 px-2 py-1 text-xs text-gray-01 bg-gray-05 hover:bg-gray-03/40"
                            title={t("editor.periodEditor.quickEditYearTitle", {
                              year: p.year,
                            })}
                          >
                            <span className="font-semibold">{p.year}</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="text-[10px] text-gray-03">E</span>
                              <StatusIcon state={p.emissions} />
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="text-[10px] text-gray-03">$</span>
                              <StatusIcon state={p.economy} />
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-02">
                    <div className="flex items-center gap-2">
                      <StatusIcon state={overview?.industry ?? "none"} />
                      <span>{c.industry?.subIndustryCode ?? dash}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-02">
                    {c.tags?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {c.tags.slice(0, 4).map((slug) => (
                          <span
                            key={slug}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-03/40 text-gray-01 border border-gray-03"
                          >
                            {list.tagLabelBySlug[slug] ?? slug}
                          </span>
                        ))}
                        {c.tags.length > 4 && (
                          <span className="text-[11px] text-gray-02">
                            +{c.tags.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      dash
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTableBody>
        </DataTable>
        <p className="px-4 py-2 text-xs text-gray-01/90 border-t border-gray-03/50">
          {t("editor.singleCompanyView.showingCount", {
            count: list.filteredCompanies.length,
            total: list.companyList.length,
          })}
        </p>
      </DataTableShell>
    </div>
  );
}
