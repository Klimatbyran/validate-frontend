import { Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { coveragePercentCardClass } from "@/tabs/overview/lib/coverage-overview-styles";
import type { CoverageYearDetail } from "@/tabs/overview/lib/coverage-types";

function CoverageStatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${className}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

type CoverageYearStatsHeaderProps = {
  detail: CoverageYearDetail;
  isRefreshingRegistry: boolean;
  isRematching: boolean;
  onEdit: () => void;
  onRematchClick: () => void;
  onRefreshRegistry: () => void;
};

export function CoverageYearStatsHeader({
  detail,
  isRefreshingRegistry,
  isRematching,
  onEdit,
  onRematchClick,
  onRefreshRegistry,
}: CoverageYearStatsHeaderProps) {
  const { t } = useI18n();
  const missingCount =
    detail.totalNames - detail.matchedCount - detail.ambiguousCount;

  return (
    <div className="rounded-lg border border-gray-03 bg-gray-05/50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-01">
          {detail.listName} — {detail.year}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="text-xs"
            onClick={onEdit}
          >
            {t("overview.coverage.editYear")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onRematchClick}
            disabled={isRematching || isRefreshingRegistry}
          >
            {isRematching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("overview.coverage.rematchCompanies")
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => void onRefreshRegistry()}
            disabled={isRefreshingRegistry || isRematching}
          >
            {isRefreshingRegistry ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("overview.coverage.refreshRegistry")
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <CoverageStatCard
          label={t("overview.coverage.stats.total")}
          value={detail.totalNames}
          className="border-gray-03/80 bg-gray-04/30 text-gray-01"
        />
        <CoverageStatCard
          label={t("overview.coverage.stats.matched")}
          value={detail.matchedCount}
          className="border-green-03/30 bg-green-03/10 text-green-03"
        />
        <CoverageStatCard
          label={t("overview.coverage.stats.missing")}
          value={missingCount}
          className="border-orange-03/30 bg-orange-03/10 text-orange-03"
        />
        <CoverageStatCard
          label={t("overview.coverage.stats.ambiguous")}
          value={detail.ambiguousCount}
          className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
        />
        <CoverageStatCard
          label={t("overview.coverage.stats.coverage")}
          value={`${detail.coveragePercent}%`}
          className={coveragePercentCardClass(detail.coveragePercent)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CoverageStatCard
          label={t("overview.coverage.stats.inRegistry")}
          value={detail.hasAnyReportCount}
          className="border-gray-03/80 bg-gray-04/30 text-gray-01"
        />
        <CoverageStatCard
          label={t("overview.coverage.stats.inProd")}
          value={detail.prodReadyCount}
          className="border-green-03/30 bg-green-03/10 text-green-03"
        />
        <CoverageStatCard
          label={t("overview.coverage.stats.missingReports")}
          value={detail.noReportCount}
          className="border-orange-03/30 bg-orange-03/10 text-orange-03"
        />
      </div>
      {detail.registryRefreshedAt ? (
        <p className="text-xs text-gray-02">
          {t("overview.coverage.registryRefreshedAt", {
            time: new Date(detail.registryRefreshedAt).toLocaleString(),
          })}
        </p>
      ) : null}
    </div>
  );
}
