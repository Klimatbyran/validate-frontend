import { useI18n } from "@/contexts/I18nContext";
import { MetricCard, MetricCardGrid } from "@/ui/metric-card";
import type { OverviewStats, OverviewViewMode } from "../lib/overview-types";

type Props = {
  stats: OverviewStats;
  selectedCount: number;
  viewMode: OverviewViewMode;
};

export function OverviewStatsBar({ stats, selectedCount, viewMode }: Props) {
  const { t } = useI18n();

  const cards =
    viewMode === "registryReports"
      ? [
          { label: t("overview.stats.total"), value: stats.totalRows },
          {
            label: t("overview.stats.missingWikidata"),
            value: stats.missingWikidata ?? 0,
          },
          {
            label: t("overview.stats.linkedCompanyReport"),
            value: stats.linkedCompanyReport ?? 0,
          },
          {
            label: t("overview.stats.pipelineCompleted"),
            value: stats.pipelineCompleted,
          },
          {
            label: t("overview.stats.pipelineFailed"),
            value: stats.pipelineFailed,
          },
          { label: t("overview.stats.selected"), value: selectedCount },
        ]
      : [
          { label: t("overview.stats.total"), value: stats.totalRows },
          {
            label: t("overview.stats.withReport"),
            value: stats.withReport ?? 0,
          },
          {
            label: t("overview.stats.pipelineCompleted"),
            value: stats.pipelineCompleted,
          },
          {
            label: t("overview.stats.pipelineFailed"),
            value: stats.pipelineFailed,
          },
          { label: t("overview.stats.inStage"), value: stats.inStage ?? 0 },
          { label: t("overview.stats.inProd"), value: stats.inProd ?? 0 },
          {
            label: t("overview.stats.prodVerified"),
            value: stats.prodVerified ?? 0,
          },
          { label: t("overview.stats.selected"), value: selectedCount },
        ];

  return (
    <MetricCardGrid
      className={
        viewMode === "registryReports"
          ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-4 xl:grid-cols-8"
      }
    >
      {cards.map((card) => (
        <MetricCard key={card.label} label={card.label} value={card.value} />
      ))}
    </MetricCardGrid>
  );
}
