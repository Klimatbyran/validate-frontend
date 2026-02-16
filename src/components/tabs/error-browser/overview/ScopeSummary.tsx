import { cn } from '@/lib/utils';
import type { OverviewAggregates } from '../utils';
import { AggregateMetrics } from '../AggregateMetrics';

interface ScopeSummaryProps {
  title: string;
  categoryCount: number;
  aggregates: OverviewAggregates;
}

const BREAKDOWN_ITEMS = [
  { label: 'Identical', key: 'identical' as const, color: 'text-green-400' },
  { label: 'Rounding', key: 'rounding' as const, color: 'text-yellow-400' },
  { label: 'Small Error', key: 'smallError' as const, color: 'text-rose-400' },
  { label: 'Hallucination', key: 'hallucination' as const, color: 'text-purple-400' },
  { label: 'Missing', key: 'missing' as const, color: 'text-orange-400' },
  { label: 'Unit Error', key: 'unitError' as const, color: 'text-indigo-400' },
  { label: 'Category Error', key: 'categoryError' as const, color: 'text-cyan-400' },
  { label: 'Error', key: 'error' as const, color: 'text-red-400' },
];

export function ScopeSummary({ title, categoryCount, aggregates }: ScopeSummaryProps) {
  return (
    <div className="border-t-2 border-gray-02/30 pt-6">
      <h3 className="text-base font-semibold text-gray-01 mb-2">{title}</h3>
      <p className="text-xs text-gray-02 mb-4">
        {aggregates.totals.withAnyData} data points with values across {categoryCount} categories (
        {aggregates.totals.totalCompanies} total incl. both-empty)
      </p>
      <AggregateMetrics
        metrics={[
          { label: 'Avg Zero-Inclusive', rate: aggregates.zeroInclusive },
          { label: 'Avg Approximate', rate: aggregates.approximate },
          { label: 'Avg Precision-Tolerant', rate: aggregates.tolerant },
          { label: 'Avg Exact Match', rate: aggregates.exactMatch },
        ]}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {BREAKDOWN_ITEMS.map((item) => (
          <div key={item.label} className="rounded-lg bg-gray-03/30 p-2 text-center">
            <div className={cn('text-lg font-bold font-mono', item.color)}>
              {aggregates.totals[item.key]}
            </div>
            <div className="text-xs text-gray-02">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
