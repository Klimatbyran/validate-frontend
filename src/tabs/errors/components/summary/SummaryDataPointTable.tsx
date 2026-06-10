import { cn } from "@/lib/utils";
import { DataTable, DataTableBody, DataTableHead } from "@/ui/data-table";
import { SectionCard, SectionCardHeader } from "@/ui/section-card";
import { useI18n } from "@/contexts/I18nContext";
import {
  tableBodyCellLabel,
  tableBodyCellNumber,
  tableBodyCellPercentBase,
  tableHeaderCellLeft,
  tableHeaderCellRight,
} from "./summary-table-styles";

type TableRow = {
  id: string;
  label: string;
  exactRate: number;
  precisionTolerantRate: number;
  zeroInclusiveRate: number;
  identical: number;
  hallucination: number;
  missing: number;
  rounding: number;
  unitError: number;
  smallError: number;
  categoryError: number;
  error: number;
};

export function SummaryDataPointTable({
  rows,
  formatInt,
  formatPct,
  rateTextClass,
}: {
  rows: TableRow[];
  formatInt: (n: number) => string;
  formatPct: (n: number) => string;
  rateTextClass: (rate: number) => string;
}) {
  const { t } = useI18n();

  return (
    <SectionCard overflowHidden>
      <SectionCardHeader
        title={t("errors.summary.dataPointTableTitle")}
        subtitle={t("errors.summary.dataPointTableSubtitle")}
      />

      <div className="overflow-x-auto">
        <DataTable className="min-w-full">
          <DataTableHead>
            <tr>
              <th className={tableHeaderCellLeft}>
                {t("errors.summary.table.dataPoint")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.zeroInclusive")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.precisionTolerant")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.exactMatch")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.identical")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.hallucination")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.missing")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.rounding")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.unitError")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.smallError")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.categoryError")}
              </th>
              <th className={tableHeaderCellRight}>
                {t("errors.summary.table.error")}
              </th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-gray-02">
                  {t("errors.summary.noRows")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-03/30 transition-colors"
                >
                  <td className={tableBodyCellLabel}>{r.label}</td>
                  <td
                    className={cn(
                      tableBodyCellPercentBase,
                      rateTextClass(r.zeroInclusiveRate),
                    )}
                  >
                    {formatPct(r.zeroInclusiveRate)}
                  </td>
                  <td
                    className={cn(
                      tableBodyCellPercentBase,
                      rateTextClass(r.precisionTolerantRate),
                    )}
                  >
                    {formatPct(r.precisionTolerantRate)}
                  </td>
                  <td
                    className={cn(
                      tableBodyCellPercentBase,
                      rateTextClass(r.exactRate),
                    )}
                  >
                    {formatPct(r.exactRate)}
                  </td>
                  <td className={tableBodyCellNumber}>
                    {formatInt(r.identical)}
                  </td>
                  <td className={tableBodyCellNumber}>
                    {formatInt(r.hallucination)}
                  </td>
                  <td className={tableBodyCellNumber}>
                    {formatInt(r.missing)}
                  </td>
                  <td className={tableBodyCellNumber}>
                    {formatInt(r.rounding)}
                  </td>
                  <td className={tableBodyCellNumber}>
                    {formatInt(r.unitError)}
                  </td>
                  <td className={tableBodyCellNumber}>
                    {formatInt(r.smallError)}
                  </td>
                  <td className={tableBodyCellNumber}>
                    {formatInt(r.categoryError)}
                  </td>
                  <td className={tableBodyCellNumber}>{formatInt(r.error)}</td>
                </tr>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </SectionCard>
  );
}
