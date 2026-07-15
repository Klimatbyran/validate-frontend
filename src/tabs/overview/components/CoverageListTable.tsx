import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import type { CoverageListSummary } from "@/tabs/overview/lib/coverage-types";
import {
  coveragePercentTextClass,
} from "@/tabs/overview/lib/coverage-overview-styles";

type CoverageListTableProps = {
  lists: CoverageListSummary[];
  onSelectList: (listId: string) => void;
  onCreateList: () => void;
};

export function CoverageListTable({
  lists,
  onSelectList,
  onCreateList,
}: CoverageListTableProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreateList}>{t("overview.coverage.addList")}</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-03">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-05/80 text-left text-gray-02">
            <tr>
              <th className="px-4 py-2 font-medium">
                {t("overview.coverage.columns.list")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("overview.coverage.columns.years")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("overview.coverage.columns.latestCoverage")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("overview.coverage.columns.updated")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lists.map((list) => {
              const latestYear = list.years[0];
              return (
                <tr
                  key={list.id}
                  className="border-t border-gray-03/60 cursor-pointer hover:bg-gray-05/50"
                  onClick={() => onSelectList(list.id)}
                >
                  <td className="px-4 py-2 font-medium text-gray-01">
                    {list.name}
                  </td>
                  <td className="px-4 py-2 text-gray-02">
                    {list.years.length}
                  </td>
                  <td className="px-4 py-2">
                    {latestYear ? (
                      <span className="text-gray-02 tabular-nums">
                        <span className="font-medium text-gray-01">
                          {latestYear.year}
                        </span>
                        {": "}
                        <span
                          className={`font-semibold ${coveragePercentTextClass(latestYear.coveragePercent)}`}
                        >
                          {latestYear.coveragePercent}%
                        </span>
                        {" ("}
                        {latestYear.matchedCount}/{latestYear.totalNames}
                        {")"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-02">
                    {new Date(list.updatedAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {lists.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-02">
                  {t("overview.coverage.noLists")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
