import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import { HelpTip } from '@/ui/help-tip';
import { DataTable, DataTableBody, DataTableHead } from '@/ui/data-table';
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/ui/section-card';
import type { DataPointMetric } from '../types';
import { calculateOverviewAggregates } from '../lib';

export interface ErrorBrowserSummaryStats {
  totalCompanies: number;
  companiesInBothForYear: number;
  companiesStageOnlyForYear: number;
  companiesProdOnlyForYear: number;
  companiesNeitherForYear: number;
  companiesWithAnyEmissions: number;
  companiesWithNoEmissions: number;
  companiesWithNoReportingPeriods: number;
  companiesWithReportingPeriodForYear: number;
  companiesFullyVerifiedInProd: number;
}

function formatInt(n: number): string {
  return new Intl.NumberFormat().format(n);
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function rateTextClass(rate: number): string {
  return rate >= 85 ? 'text-green-400' : rate >= 70 ? 'text-yellow-400' : 'text-red-400';
}

function calcRates(dp: DataPointMetric) {
  const identical = dp.breakdown.identical;
  const rounding = dp.breakdown.rounding;
  const bothNull = dp.breakdown.bothNull;
  const withAnyData = dp.withAnyData;
  const totalSlots =
    dp.breakdown.identical +
    dp.breakdown.rounding +
    dp.breakdown.hallucination +
    dp.breakdown.missing +
    dp.breakdown.unitError +
    dp.breakdown.smallError +
    dp.breakdown.error +
    dp.breakdown.categoryError +
    dp.breakdown.bothNull;

  const exactRate = withAnyData > 0 ? (identical / withAnyData) * 100 : 0;
  const precisionTolerantRate = withAnyData > 0 ? ((identical + rounding) / withAnyData) * 100 : 0;
  const zeroInclusiveRate = totalSlots > 0 ? ((identical + rounding + bothNull) / totalSlots) * 100 : 0;

  return { exactRate, precisionTolerantRate, zeroInclusiveRate };
}

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
      <span className="text-gray-02 inline-flex items-center gap-1 group">
        {label}
        <HelpTip text={helpText} />
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

interface SummaryViewProps {
  selectedYear: number;
  allDataPointMetrics: DataPointMetric[];
  stats: ErrorBrowserSummaryStats;
}

export function SummaryView({ selectedYear, allDataPointMetrics, stats }: SummaryViewProps) {
  const { t } = useI18n();

  const tableHeaderCellLeft =
    "px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider";
  const tableHeaderCellRight =
    "px-4 py-3 text-right text-xs font-semibold text-gray-02 uppercase tracking-wider";
  const tableBodyCellLabel = "px-4 py-3 text-sm text-gray-01 whitespace-nowrap";
  const tableBodyCellNumber = "px-4 py-3 text-sm text-gray-01 text-right tabular-nums";
  const tableBodyCellPercentBase =
    "px-4 py-3 text-sm text-right tabular-nums font-medium";

  const avg = React.useMemo(() => {
    if (allDataPointMetrics.length === 0) return null;
    // Match the Overview headline cards: Scope 1 + Scope 2 + Scope 3 categories (excludes "Other").
    const scope123 = allDataPointMetrics.filter(
      (dp) => dp.id.startsWith('scope1-') || dp.id.startsWith('scope2-') || (dp.id.startsWith('cat-') && dp.id !== 'cat-16')
    );
    return calculateOverviewAggregates(scope123);
  }, [allDataPointMetrics]);

  const rows = React.useMemo(() => {
    return allDataPointMetrics.map((dp) => {
      const { exactRate, precisionTolerantRate, zeroInclusiveRate } = calcRates(dp);
      return {
        id: dp.id,
        label: dp.label,
        exactRate,
        precisionTolerantRate,
        zeroInclusiveRate,
        ...dp.breakdown,
      };
    });
  }, [allDataPointMetrics]);

  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionCardBody className="space-y-0">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-01">
                {t("errors.summary.title", { year: selectedYear })}
              </h3>
              <p className="text-xs text-gray-02 mt-1">{t("errors.summary.subtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
            <SummaryStatCard title={t("errors.summary.totalCompanies")}>
              <div className="text-2xl font-semibold text-gray-01 mt-1">
                {formatInt(stats.totalCompanies)}
              </div>
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
        </SectionCardBody>
      </SectionCard>

      <SectionCard overflowHidden>
        <SectionCardHeader
          title={t("errors.summary.dataPointTableTitle")}
          subtitle={t("errors.summary.dataPointTableSubtitle")}
        />

        <div className="overflow-x-auto">
          <DataTable className="min-w-full">
            <DataTableHead>
              <tr>
                <th className={tableHeaderCellLeft}>{t("errors.summary.table.dataPoint")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.zeroInclusive")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.precisionTolerant")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.exactMatch")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.identical")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.hallucination")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.missing")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.rounding")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.unitError")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.smallError")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.categoryError")}</th>
                <th className={tableHeaderCellRight}>{t("errors.summary.table.error")}</th>
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
                  <tr key={r.id} className="hover:bg-gray-03/30 transition-colors">
                    <td className={tableBodyCellLabel}>{r.label}</td>
                    <td className={cn(tableBodyCellPercentBase, rateTextClass(r.zeroInclusiveRate))}>
                      {formatPct(r.zeroInclusiveRate)}
                    </td>
                    <td className={cn(tableBodyCellPercentBase, rateTextClass(r.precisionTolerantRate))}>
                      {formatPct(r.precisionTolerantRate)}
                    </td>
                    <td className={cn(tableBodyCellPercentBase, rateTextClass(r.exactRate))}>
                      {formatPct(r.exactRate)}
                    </td>
                    <td className={tableBodyCellNumber}>{formatInt(r.identical)}</td>
                    <td className={tableBodyCellNumber}>{formatInt(r.hallucination)}</td>
                    <td className={tableBodyCellNumber}>{formatInt(r.missing)}</td>
                    <td className={tableBodyCellNumber}>{formatInt(r.rounding)}</td>
                    <td className={tableBodyCellNumber}>{formatInt(r.unitError)}</td>
                    <td className={tableBodyCellNumber}>{formatInt(r.smallError)}</td>
                    <td className={tableBodyCellNumber}>{formatInt(r.categoryError)}</td>
                    <td className={tableBodyCellNumber}>{formatInt(r.error)}</td>
                  </tr>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </SectionCard>
    </div>
  );
}

