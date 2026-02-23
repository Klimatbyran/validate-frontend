import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import type { OverviewAggregates } from '../lib';
import { AggregateMetrics } from '../components/AggregateMetrics';

interface ScopeSummaryProps {
  title: string;
  categoryCount: number;
  aggregates: OverviewAggregates;
}

const BREAKDOWN_ITEMS = [
  { filterKey: 'identical', key: 'identical' as const, color: 'text-green-400' },
  { filterKey: 'rounding', key: 'rounding' as const, color: 'text-yellow-400' },
  { filterKey: 'small-error', key: 'smallError' as const, color: 'text-rose-400' },
  { filterKey: 'hallucination', key: 'hallucination' as const, color: 'text-purple-400' },
  { filterKey: 'missing', key: 'missing' as const, color: 'text-orange-400' },
  { filterKey: 'unit-error', key: 'unitError' as const, color: 'text-indigo-400' },
  { filterKey: 'category-error', key: 'categoryError' as const, color: 'text-cyan-400' },
  { filterKey: 'error', key: 'error' as const, color: 'text-red-400' },
];

export function ScopeSummary({ title, categoryCount, aggregates }: ScopeSummaryProps) {
  const { t } = useI18n();
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-01 mb-2">{title}</h3>
      <p className="text-xs text-gray-02 mb-4">
        {t("errors.overview.dataPointsWithValues", {
          withAnyData: aggregates.totals.withAnyData,
          categoryCount,
          totalCompanies: aggregates.totals.totalCompanies,
        })}
      </p>
      <AggregateMetrics
        metrics={[
          { label: t("errors.overview.avgZeroInclusive"), rate: aggregates.zeroInclusive },
          { label: t("errors.overview.avgApproximate"), rate: aggregates.approximate },
          { label: t("errors.overview.avgPrecisionTolerant"), rate: aggregates.tolerant },
          { label: t("errors.overview.avgExactMatch"), rate: aggregates.exactMatch },
        ]}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {BREAKDOWN_ITEMS.map((item) => (
          <div key={item.key} className="rounded-lg bg-gray-03/30 p-2 text-center">
            <div className={cn('text-lg font-bold font-mono', item.color)}>
              {aggregates.totals[item.key]}
            </div>
            <div className="text-xs text-gray-02">{t(`errors.filterType.${item.filterKey}`)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
