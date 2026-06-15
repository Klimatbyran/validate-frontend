import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import type { OverviewData } from "../hooks/useOverviewData";
import {
  statusColumnsForView,
  type OverviewRow,
  type OverviewStatusColumn,
} from "../lib/overview-types";
import { useClientTablePagination } from "@/hooks/useClientTablePagination";
import { ClientTablePagination } from "@/ui/client-table-pagination";
import { OverviewStatusIcon } from "./OverviewStatusIcon";
import { OverviewStatusModal } from "./OverviewStatusModal";

type Props = {
  data: OverviewData;
  selectedKeys: Set<string>;
  onToggleSelect: (row: OverviewRow) => void;
  onToggleSelectAll: (rows: OverviewRow[]) => void;
};

export function OverviewTable({
  data,
  selectedKeys,
  onToggleSelect,
  onToggleSelectAll,
}: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const dash = t("common.placeholderDash");
  const [modalRow, setModalRow] = useState<OverviewRow | null>(null);
  const [modalColumn, setModalColumn] = useState<OverviewStatusColumn | null>(
    null,
  );

  const columns = statusColumnsForView(data.viewMode);
  const columnHintPrefix =
    data.viewMode === "companyYears"
      ? "overview.columnHints.companyYears"
      : "overview.columnHints.registryReports";
  const pagination = useClientTablePagination(data.rows);
  const allSelected =
    pagination.pageRows.length > 0 &&
    pagination.pageRows.every((row) => selectedKeys.has(row.key));

  function headerHint(key: string): string {
    return t(`${columnHintPrefix}.${key}`);
  }

  const modalDetail = useMemo(() => {
    if (!modalRow || !modalColumn) return null;
    return modalRow.statuses[modalColumn] ?? null;
  }, [modalRow, modalColumn]);

  return (
    <>
      <OverviewStatusModal
        open={Boolean(modalRow && modalColumn && modalDetail)}
        onOpenChange={(open) => {
          if (!open) {
            setModalRow(null);
            setModalColumn(null);
          }
        }}
        row={modalRow}
        column={modalColumn}
        detail={modalDetail}
      />

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
              <th
                className="px-4 py-3 font-medium w-[22%] cursor-help"
                title={headerHint("company")}
              >
                {t("overview.table.company")}
              </th>
              <th
                className="px-4 py-3 font-medium w-[8%] cursor-help"
                title={headerHint(
                  data.viewMode === "registryReports"
                    ? "reportYear"
                    : "companyReportYear",
                )}
              >
                {data.viewMode === "registryReports"
                  ? t("overview.table.reportYear")
                  : t("overview.table.companyReportYear")}
              </th>
              {data.viewMode === "registryReports" ? (
                <th
                  className="px-4 py-3 font-medium w-[12%] cursor-help"
                  title={headerHint("companyReportId")}
                >
                  {t("overview.table.companyReportId")}
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-3 py-3 font-medium text-center min-w-[72px] cursor-help"
                  title={headerHint(column)}
                >
                  <span className="text-xs leading-tight">
                    {t(`overview.columns.${column}`)}
                  </span>
                </th>
              ))}
              {data.viewMode === "companyYears" ? (
                <th
                  className="px-4 py-3 font-medium w-[12%] cursor-help"
                  title={headerHint("tags")}
                >
                  {t("overview.table.tags")}
                </th>
              ) : null}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {pagination.pageRows.map((row) => (
              <tr
                key={row.key}
                className="hover:bg-gray-04/40 text-gray-01 align-top"
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(row.key)}
                    onChange={() => onToggleSelect(row)}
                    aria-label={t("overview.selectRow", {
                      company: row.companyName,
                    })}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (row.companyId) {
                        navigate(editorCompanyPath(row.companyId));
                      }
                    }}
                    className={`text-left ${row.companyId ? "hover:text-blue-03" : ""}`}
                    disabled={!row.companyId}
                  >
                    <div className="font-medium">{row.companyName}</div>
                    <div className="text-xs text-gray-02">
                      {row.wikidataId ?? dash}
                    </div>
                  </button>
                </td>
                <td className="px-4 py-3 font-medium text-gray-02">
                  {row.reportYear ?? dash}
                </td>
                {data.viewMode === "registryReports" ? (
                  <td className="px-4 py-3 text-xs text-gray-02 font-mono">
                    {row.companyReportId ?? dash}
                  </td>
                ) : null}
                {columns.map((column) => {
                  const status = row.statuses[column];
                  if (!status) return <td key={column} className="px-3 py-3" />;
                  return (
                    <td key={column} className="px-3 py-3 text-center">
                      <OverviewStatusIcon
                        kind={status.kind}
                        title={status.summary}
                        onClick={() => {
                          setModalRow(row);
                          setModalColumn(column);
                        }}
                      />
                    </td>
                  );
                })}
                {data.viewMode === "companyYears" ? (
                  <td className="px-4 py-3 text-gray-02">
                    {row.tags.length ? (
                      <div className="flex flex-wrap gap-1">
                        {row.tags.slice(0, 3).map((slug) => (
                          <span
                            key={slug}
                            className="inline-block rounded-full bg-gray-03/40 px-2 py-0.5 text-[10px]"
                          >
                            {data.tagLabelBySlug[slug] ?? slug}
                          </span>
                        ))}
                        {row.tags.length > 3 ? (
                          <span className="text-[10px] text-gray-03">
                            +{row.tags.length - 3}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      dash
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
        <ClientTablePagination
          from={pagination.from}
          to={pagination.to}
          filteredTotal={pagination.totalRows}
          unfilteredTotal={data.allRows.length}
          page={pagination.page}
          totalPages={pagination.totalPages}
          showAll={pagination.showAll}
          canPaginate={pagination.canPaginate}
          onPageChange={pagination.setPage}
          onShowAllChange={pagination.setShowAll}
        />
      </DataTableShell>
    </>
  );
}
