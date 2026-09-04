import { useI18n } from "@/contexts/I18nContext";
import { MetricCard, MetricCardGrid } from "@/ui/metric-card";
import type { SuspicionCounts } from "../lib/filters";
import type { SuspicionScanResult } from "../lib/detect";

export function SuspiciousSummary({
  counts,
  scan,
}: {
  counts: SuspicionCounts;
  scan: SuspicionScanResult;
}) {
  const { t, formatNumber } = useI18n();

  return (
    <MetricCardGrid className="grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
      <MetricCard
        label={t("suspicious.summary.findings")}
        value={formatNumber(counts.total)}
      />
      <MetricCard
        label={t("suspicious.severity.high")}
        value={formatNumber(counts.high)}
      />
      <MetricCard
        label={t("suspicious.severity.medium")}
        value={formatNumber(counts.medium)}
      />
      <MetricCard
        label={t("suspicious.origin.ai")}
        value={formatNumber(counts.ai)}
      />
      <MetricCard
        label={t("suspicious.origin.verified")}
        value={formatNumber(counts.verified)}
      />
      <MetricCard
        label={t("suspicious.summary.companiesAffected")}
        value={formatNumber(counts.companies)}
      />
      <MetricCard
        label={t("suspicious.summary.valuesScanned")}
        value={formatNumber(scan.observationCount)}
      />
    </MetricCardGrid>
  );
}
