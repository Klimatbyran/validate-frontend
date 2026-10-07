import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { ClientTablePagination } from "@/ui/client-table-pagination";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import type { SuspiciousCompanySummary } from "../types";
import { useClientPagination } from "../hooks/useClientPagination";

const PAGE_SIZE = 50;

const headerClass =
  "px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-02";

export function SuspiciousCompaniesTable({
  companies,
}: {
  companies: SuspiciousCompanySummary[];
}) {
  const { t } = useI18n();
  const pagination = useClientPagination(companies, PAGE_SIZE);

  return (
    <DataTableShell>
      <DataTable>
        <DataTableHead>
          <tr>
            <th className={headerClass}>{t("suspicious.table.company")}</th>
            <th className={`${headerClass} text-right`}>
              {t("suspicious.table.findings")}
            </th>
            <th className={`${headerClass} text-right`}>
              {t("suspicious.severity.high")}
            </th>
            <th className={`${headerClass} text-right`}>
              {t("suspicious.origin.ai")}
            </th>
            <th className={`${headerClass} text-right`}>
              {t("suspicious.origin.verified")}
            </th>
            <th className={headerClass}>{t("suspicious.table.dataYears")}</th>
            <th className={headerClass} />
          </tr>
        </DataTableHead>
        <DataTableBody>
          {pagination.pageRows.map((company) => (
            <tr key={company.companyId} className="hover:bg-gray-03/30">
              <td className="px-4 py-3 text-gray-01">{company.companyName}</td>
              <td className="px-4 py-3 text-right text-gray-01">
                {company.findingCount}
              </td>
              <td className="px-4 py-3 text-right text-pink-02">
                {company.highCount}
              </td>
              <td className="px-4 py-3 text-right text-orange-02">
                {company.aiCount}
              </td>
              <td className="px-4 py-3 text-right text-green-03">
                {company.verifiedCount}
              </td>
              <td className="px-4 py-3 text-gray-02">
                {company.dataYears.join(", ")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/editor/company/${company.companyId}`}
                  className="text-sm text-blue-03 hover:text-blue-02 transition-colors"
                >
                  {t("suspicious.detail.openInEditor")}
                </Link>
              </td>
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
      <ClientTablePagination
        from={pagination.from}
        to={pagination.to}
        filteredTotal={pagination.totalRows}
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
