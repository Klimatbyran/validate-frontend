import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { SectionCard, SectionCardBody } from '@/ui/section-card';
import type { DataPointMetric } from '../types';
import { calculateOverviewAggregates } from '../lib';
import { SummaryStatsGrid } from './summary/SummaryStatsGrid';
import { SummaryDataPointTable } from './summary/SummaryDataPointTable';

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

interface SummaryViewProps {
  selectedYear: number;
  allDataPointMetrics: DataPointMetric[];
  stats: ErrorBrowserSummaryStats;
}

export function SummaryView({ selectedYear, allDataPointMetrics, stats }: SummaryViewProps) {
  const { t } = useI18n();

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

          <SummaryStatsGrid
            stats={stats}
            selectedYear={selectedYear}
            avg={avg}
            formatInt={formatInt}
            formatPct={formatPct}
            rateTextClass={rateTextClass}
          />
        </SectionCardBody>
      </SectionCard>

      <SummaryDataPointTable
        rows={rows}
        formatInt={formatInt}
        formatPct={formatPct}
        rateTextClass={rateTextClass}
      />
    </div>
  );
}

