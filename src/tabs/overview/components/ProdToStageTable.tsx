import { useI18n } from "@/contexts/I18nContext";
import { useClientTablePagination } from "@/hooks/useClientTablePagination";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import { ClientTablePagination } from "@/ui/client-table-pagination";
import { EnvBadge } from "@/ui/env-badge";
import type { ProdToStageRow } from "../lib/build-prod-to-stage-rows";

type Props = {
  rows: ProdToStageRow[];
  totalRows: number;
  selectedKeys: Set<string>;
  tagLabelBySlug: Record<string, string>;
  onToggleSelect: (row: ProdToStageRow) => void;
  onToggleSelectAll: (rows: ProdToStageRow[]) => void;
};

export function ProdToStageTable({
  rows,
  totalRows,
  selectedKeys,
  tagLabelBySlug,
  onToggleSelect,
  onToggleSelectAll,
}: Props) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");
  const pagination = useClientTablePagination(rows);
  const allSelected =
    pagination.pageRows.length > 0 &&
    pagination.pageRows.every((row) => selectedKeys.has(row.key));

  return (
    <DataTableShell>
      <DataTable>
        <DataTableHead>
          <tr>
            <th className="px-3 py-3 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleSelectAll(pagination.pageRows)}
                aria-label={t("overview.selectAll")}
              />
            </th>
            <th className="px-4 py-3 font-medium w-[18%]">
              {t("overview.table.company")}
            </th>
            <th className="px-4 py-3 font-medium w-[7%]">
              {t("overview.table.companyReportYear")}
            </th>
            <th className="px-4 py-3 font-medium w-[12%]">
              <EnvBadge env="prod">
                {t("overview.prodToStage.prodCompanyReport")}
              </EnvBadge>
            </th>
            <th className="px-4 py-3 font-medium w-[18%]">
              <EnvBadge env="prod">
                {t("overview.prodToStage.validatedOnProd")}
              </EnvBadge>
            </th>
            <th className="px-4 py-3 font-medium w-[20%]">
              <EnvBadge env="prod">
                {t("overview.prodToStage.prodReportUrl")}
              </EnvBadge>
            </th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {pagination.pageRows.map((row) => {
            const runnable = Boolean(row.reportUrl);
            return (
              <tr
                key={row.key}
                className="hover:bg-gray-04/40 text-gray-01 align-top"
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(row.key)}
                    onChange={() => onToggleSelect(row)}
                    disabled={!runnable}
                    aria-label={t("overview.selectRow", {
                      company: row.companyName,
                    })}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{row.companyName}</div>
                  <div className="text-xs text-gray-02">
                    {row.wikidataId ?? dash}
                  </div>
                  {row.tags.length ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {row.tags.slice(0, 2).map((slug) => (
                        <span
                          key={slug}
                          className="inline-block rounded-full bg-gray-03/40 px-2 py-0.5 text-[10px]"
                        >
                          {tagLabelBySlug[slug] ?? slug}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-gray-02 font-medium">
                  {row.reportYear ?? dash}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-gray-02 break-all">
                  {row.prodCompanyReportId}
                </td>
                <td className="px-4 py-3 text-xs text-gray-02">
                  <p className="font-medium text-gray-01 mb-1">
                    {t("overview.prodToStage.verifiedCount", {
                      count: row.validatedDataPointLabels.length,
                    })}
                  </p>
                  <p className="line-clamp-3">
                    {row.validatedDataPointLabels.slice(0, 4).join(", ")}
                    {row.validatedDataPointLabels.length > 4
                      ? ` +${row.validatedDataPointLabels.length - 4}`
                      : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-02">
                  {row.reportUrl ? (
                    <a
                      href={row.reportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-03 hover:underline break-all"
                    >
                      {row.reportUrl}
                    </a>
                  ) : (
                    <span className="text-orange-03">
                      {t("overview.prodToStage.noRunnableUrl")}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTableBody>
      </DataTable>
      <ClientTablePagination
        from={pagination.from}
        to={pagination.to}
        filteredTotal={pagination.totalRows}
        unfilteredTotal={totalRows}
        page={pagination.page}
        totalPages={pagination.totalPages}
        showAll={pagination.showAll}
        canPaginate={pagination.canPaginate}
        onPageChange={pagination.setPage}
        onShowAllChange={pagination.setShowAll}
      />
    </DataTableShell>
  );
}
