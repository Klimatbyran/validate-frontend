import React from "react";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/ui/help-tip";
import type { ErrorBrowserSummaryStats } from "../SummaryView";
import { useI18n } from "@/contexts/I18nContext";

function SummaryStatCard({
  title,
  footer,
  children,
}: {
  title: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-gray-03/50 border border-gray-02/15 p-4">
      <div className="text-xs text-gray-02">{title}</div>
      {children}
      {footer ? <div className="text-[11px] text-gray-02 mt-2">{footer}</div> : null}
    </div>
  );
}

function SummaryStatRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-02">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SummaryStatRowWithHelp({
  label,
  helpText,
  value,
}: {
  label: React.ReactNode;
  helpText: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-02 inline-flex items-center gap-1">
        {label}
        <HelpTip text={helpText} />
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function SummaryStatsGrid({
  stats,
  selectedYear,
  avg,
  formatInt,
  formatPct,
  rateTextClass,
}: {
  stats: ErrorBrowserSummaryStats;
  selectedYear: number;
  avg: null | { zeroInclusive: number; tolerant: number; exactMatch: number };
  formatInt: (n: number) => string;
  formatPct: (n: number) => string;
  rateTextClass: (rate: number) => string;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
      <SummaryStatCard title={t("errors.summary.totalCompanies")}>
        <div className="text-2xl font-semibold text-gray-01 mt-1">{formatInt(stats.totalCompanies)}</div>
        <div className="text-[11px] text-gray-02 mt-1">{t("errors.summary.notYearFiltered")}</div>
        <div className="mt-3 text-sm text-gray-01">
          <SummaryStatRow
            label={t("errors.summary.noReportingPeriods")}
            value={formatInt(stats.companiesWithNoReportingPeriods)}
          />
        </div>
      </SummaryStatCard>

      <SummaryStatCard
        title={t("errors.summary.stageVsProdForYear", { year: selectedYear })}
        footer={t("errors.summary.yearFiltered")}
      >
        <div className="text-sm text-gray-01 mt-2 space-y-1">
          <SummaryStatRowWithHelp
            label={t("errors.summary.inBoth")}
            helpText={t("errors.summary.stageProdHelp.inBoth", { year: selectedYear })}
            value={formatInt(stats.companiesInBothForYear)}
          />
          <SummaryStatRowWithHelp
            label={t("errors.summary.stageOnly")}
            helpText={t("errors.summary.stageProdHelp.stageOnly", { year: selectedYear })}
            value={formatInt(stats.companiesStageOnlyForYear)}
          />
          <SummaryStatRowWithHelp
            label={t("errors.summary.prodOnly")}
            helpText={t("errors.summary.stageProdHelp.prodOnly", { year: selectedYear })}
            value={formatInt(stats.companiesProdOnlyForYear)}
          />
          <SummaryStatRowWithHelp
            label={t("errors.summary.neither")}
            helpText={t("errors.summary.stageProdHelp.neither", { year: selectedYear })}
            value={formatInt(stats.companiesNeitherForYear)}
          />
        </div>
      </SummaryStatCard>

      <SummaryStatCard title={t("errors.summary.emissionsCoverageForYear", { year: selectedYear })}>
        <div className="text-sm text-gray-01 mt-2 space-y-1">
          <SummaryStatRow
            label={t("errors.summary.withAnyEmissions")}
            value={formatInt(stats.companiesWithAnyEmissions)}
          />
          <SummaryStatRow
            label={t("errors.summary.withNoEmissions")}
            value={formatInt(stats.companiesWithNoEmissions)}
          />
          <SummaryStatRow
            label={t("errors.summary.withReportingPeriod")}
            value={formatInt(stats.companiesWithReportingPeriodForYear)}
          />
        </div>
      </SummaryStatCard>

      <SummaryStatCard title={t("errors.summary.verified")}>
        <div className="text-2xl font-semibold text-gray-01 mt-1">
          {formatInt(stats.companiesFullyVerifiedInProd)}
        </div>
        <div className="text-[11px] text-gray-02 mt-1">{t("errors.summary.verifiedNote")}</div>
      </SummaryStatCard>

      <SummaryStatCard title={t("errors.summary.avgAccuracy")}>
        {avg ? (
          <div className="text-sm text-gray-01 mt-2 space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-gray-02">{t("errors.metrics.zeroInclusive")}</span>
              <span className={cn("font-medium tabular-nums", rateTextClass(avg.zeroInclusive))}>
                {formatPct(avg.zeroInclusive)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-02">{t("errors.metrics.precisionTolerant")}</span>
              <span className={cn("font-medium tabular-nums", rateTextClass(avg.tolerant))}>
                {formatPct(avg.tolerant)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-02">{t("errors.metrics.exactMatch")}</span>
              <span className={cn("font-medium tabular-nums", rateTextClass(avg.exactMatch))}>
                {formatPct(avg.exactMatch)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-02 mt-2">{t("errors.summary.noAvgAccuracy")}</div>
        )}
      </SummaryStatCard>
    </div>
  );
}

