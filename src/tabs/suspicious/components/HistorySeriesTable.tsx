import { useI18n } from "@/contexts/I18nContext";
import type { HistoryYearValue } from "../types";

export function HistorySeriesTable({
  series,
  unit,
}: {
  series: HistoryYearValue[];
  unit: string;
}) {
  const { t, formatNumber } = useI18n();

  if (series.length === 0) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-02 mb-2">
        {t("suspicious.detail.historyYears")}
      </p>
      <div className="overflow-hidden rounded-lg border border-gray-03">
        <table className="w-full text-sm">
          <thead className="bg-gray-05/80">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-gray-02 font-medium">
                {t("yearLabels.dataYear")}
              </th>
              <th className="px-3 py-2 text-right text-[11px] uppercase tracking-wide text-gray-02 font-medium">
                {t("suspicious.table.value")}
                <span className="ml-1 normal-case tracking-normal text-gray-03">
                  ({unit})
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {series.map((row) => (
              <tr
                key={row.year}
                className={
                  row.isFlagged
                    ? "bg-pink-03/10 border-t border-pink-03/20"
                    : "border-t border-gray-03/50"
                }
              >
                <td className="px-3 py-2 text-gray-01">
                  {row.year}
                  {row.isFlagged ? (
                    <span className="ml-2 text-[11px] uppercase tracking-wide text-pink-02">
                      {t("suspicious.detail.flaggedYear")}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-01">
                  {formatNumber(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
