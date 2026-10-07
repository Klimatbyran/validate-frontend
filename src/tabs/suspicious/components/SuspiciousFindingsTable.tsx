import { useI18n } from "@/contexts/I18nContext";
import { ClientTablePagination } from "@/ui/client-table-pagination";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import type { SuspicionFinding } from "../types";
import { formatMessageParams } from "../lib/finding-display";
import { useClientPagination } from "../hooks/useClientPagination";
import { OriginBadge, RuleBadge, SeverityBadge } from "./SuspicionBadges";

const PAGE_SIZE = 50;

const headerClass =
  "px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-02";

export function SuspiciousFindingsTable({
  findings,
  unfilteredTotal,
  onSelect,
}: {
  findings: SuspicionFinding[];
  unfilteredTotal: number;
  onSelect: (finding: SuspicionFinding) => void;
}) {
  const { t, formatNumber } = useI18n();
  const pagination = useClientPagination(findings, PAGE_SIZE);

  return (
    <DataTableShell>
      <DataTable>
        <DataTableHead>
          <tr>
            <th className={headerClass}>{t("suspicious.table.company")}</th>
            <th className={headerClass}>{t("yearLabels.dataYear")}</th>
            <th className={headerClass}>{t("suspicious.table.dataPoint")}</th>
            <th className={`${headerClass} text-right`}>
              {t("suspicious.table.value")}
            </th>
            <th className={headerClass}>{t("suspicious.table.why")}</th>
            <th className={headerClass}>{t("suspicious.table.rule")}</th>
            <th className={headerClass}>{t("suspicious.table.severity")}</th>
            <th className={headerClass}>{t("suspicious.table.origin")}</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {pagination.pageRows.map((finding) => (
            <tr
              key={finding.id}
              onClick={() => onSelect(finding)}
              className="cursor-pointer hover:bg-gray-03/30 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="text-gray-01">{finding.companyName}</span>
                {finding.tags.length > 0 ? (
                  <span className="block text-[11px] text-gray-02">
                    {finding.tags.join(", ")}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-gray-01">{finding.dataYear}</td>
              <td className="px-4 py-3 text-gray-01">
                {finding.dataPointLabel}
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-01">
                {formatNumber(finding.value)}
              </td>
              <td className="px-4 py-3 text-gray-02 max-w-md">
                {t(
                  finding.messageKey,
                  formatMessageParams(finding.messageParams, formatNumber),
                )}
              </td>
              <td className="px-4 py-3">
                <RuleBadge rule={finding.rule} />
              </td>
              <td className="px-4 py-3">
                <SeverityBadge severity={finding.severity} />
              </td>
              <td className="px-4 py-3">
                <OriginBadge origin={finding.origin} />
              </td>
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
      <ClientTablePagination
        from={pagination.from}
        to={pagination.to}
        filteredTotal={pagination.totalRows}
        unfilteredTotal={unfilteredTotal}
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
