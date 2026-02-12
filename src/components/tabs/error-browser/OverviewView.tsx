import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataPointMetric } from './types';
import { AggregateMetrics } from './AggregateMetrics';

interface OverviewViewProps {
  allDataPointMetrics: DataPointMetric[];
  selectedYear: number;
  onSelectDataPoint: (dataPointId: string) => void;
}

function calculateAggregates(metrics: DataPointMetric[]) {
  const totals = metrics.reduce((acc, dp) => {
    acc.identical += dp.breakdown.identical;
    acc.rounding += dp.breakdown.rounding;
    acc.hallucination += dp.breakdown.hallucination;
    acc.missing += dp.breakdown.missing;
    acc.unitError += dp.breakdown.unitError;
    acc.smallError += dp.breakdown.smallError;
    acc.error += dp.breakdown.error;
    acc.categoryError += dp.breakdown.categoryError;
    acc.bothNull += dp.breakdown.bothNull;
    acc.withAnyData += dp.withAnyData;
    acc.totalCompanies += dp.breakdown.identical + dp.breakdown.rounding + dp.breakdown.hallucination + dp.breakdown.missing + dp.breakdown.unitError + dp.breakdown.smallError + dp.breakdown.error + dp.breakdown.categoryError + dp.breakdown.bothNull;
    return acc;
  }, { identical: 0, rounding: 0, hallucination: 0, missing: 0, unitError: 0, smallError: 0, error: 0, categoryError: 0, bothNull: 0, withAnyData: 0, totalCompanies: 0 });

  return {
    exactMatch: totals.withAnyData > 0 ? (totals.identical / totals.withAnyData) * 100 : 0,
    tolerant: totals.withAnyData > 0 ? ((totals.identical + totals.rounding) / totals.withAnyData) * 100 : 0,
    approximate: totals.withAnyData > 0 ? ((totals.identical + totals.rounding + totals.smallError) / totals.withAnyData) * 100 : 0,
    zeroInclusive: totals.totalCompanies > 0 ? ((totals.identical + totals.rounding + totals.bothNull) / totals.totalCompanies) * 100 : 0,
    totals,
  };
}

function exportOverviewCsv(metrics: DataPointMetric[], selectedYear: number) {
  const headers = ['Data Point', 'Identical', 'Rounding', 'Small Error', 'Hallucination', 'Missing', 'Unit Error', 'Category Error', 'Error', 'Both Empty', 'With Data', 'Tolerant Rate %'];
  const csvRows = [headers.join(',')];

  for (const dp of metrics) {
    csvRows.push([
      `"${dp.label}"`,
      dp.breakdown.identical, dp.breakdown.rounding, dp.breakdown.smallError,
      dp.breakdown.hallucination, dp.breakdown.missing, dp.breakdown.unitError,
      dp.breakdown.categoryError, dp.breakdown.error, dp.breakdown.bothNull,
      dp.withAnyData, dp.tolerantRate.toFixed(1),
    ].join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `overview-${selectedYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OverviewView({ allDataPointMetrics, selectedYear, onSelectDataPoint }: OverviewViewProps) {
  if (allDataPointMetrics.length === 0) return null;

  const scope1Metrics = allDataPointMetrics.filter(dp => dp.id.startsWith('scope1-'));
  const scope2Metrics = allDataPointMetrics.filter(dp => dp.id.startsWith('scope2-'));
  const scope3Metrics = allDataPointMetrics.filter(dp => dp.id.startsWith('cat-') && dp.id !== 'cat-16');
  const otherMetrics = allDataPointMetrics.filter(dp =>
    dp.id === 'cat-16' || dp.id === 'scope3-stated-total' || dp.id === 'scope3-calculated-total' || dp.id === 'stated-total' || dp.id === 'calculated-total'
  );

  const scope1Aggregates = calculateAggregates(scope1Metrics);
  const scope2Aggregates = calculateAggregates(scope2Metrics);
  const scope3Aggregates = calculateAggregates(scope3Metrics);
  const scope12Aggregates = calculateAggregates([...scope1Metrics, ...scope2Metrics]);
  const allScopesAggregates = calculateAggregates([...scope1Metrics, ...scope2Metrics, ...scope3Metrics]);

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => exportOverviewCsv(allDataPointMetrics, selectedYear)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      {/* Scope 1 */}
      {scope1Metrics.length > 0 && (
        <ScopeSection
          title={`Scope 1 (${selectedYear})`}
          aggregates={scope1Aggregates}
          metrics={scope1Metrics}
          onSelectDataPoint={onSelectDataPoint}
        />
      )}

      {/* Scope 2 */}
      {scope2Metrics.length > 0 && (
        <ScopeSection
          title={`Scope 2 (${selectedYear})`}
          aggregates={scope2Aggregates}
          metrics={scope2Metrics}
          onSelectDataPoint={onSelectDataPoint}
        />
      )}

      {/* Scope 3 Categories */}
      {scope3Metrics.length > 0 && (
        <ScopeSection
          title={`Scope 3 Categories (${selectedYear})`}
          aggregates={scope3Aggregates}
          metrics={scope3Metrics}
          onSelectDataPoint={onSelectDataPoint}
        />
      )}

      {/* Other metrics */}
      {otherMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-01 mb-3">Other</h3>
          <div className="space-y-2">
            {otherMetrics.map(dp => (
              <DataPointBar key={dp.id} dp={dp} onSelect={onSelectDataPoint} />
            ))}
          </div>
        </div>
      )}

      {/* Overall Summary: Scope 1 + 2 + 3 */}
      {allScopesAggregates.totals.withAnyData > 0 && (
        <ScopeSummary
          title={`Overall Accuracy — Scope 1 + 2 + 3 (${selectedYear})`}
          categoryCount={[...scope1Metrics, ...scope2Metrics, ...scope3Metrics].length}
          aggregates={allScopesAggregates}
        />
      )}

      {/* Overall Summary: Scope 1 + 2 only */}
      {scope12Aggregates.totals.withAnyData > 0 && (
        <ScopeSummary
          title={`Overall Accuracy — Scope 1 + 2 (${selectedYear})`}
          categoryCount={[...scope1Metrics, ...scope2Metrics].length}
          aggregates={scope12Aggregates}
        />
      )}
    </div>
  );
}

function ScopeSection({
  title,
  aggregates,
  metrics,
  onSelectDataPoint,
}: {
  title: string;
  aggregates: ReturnType<typeof calculateAggregates>;
  metrics: DataPointMetric[];
  onSelectDataPoint: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-01 mb-3">{title}</h3>
      <AggregateMetrics metrics={[
        { label: 'Avg Zero-Inclusive', rate: aggregates.zeroInclusive },
        { label: 'Avg Approximate', rate: aggregates.approximate },
        { label: 'Avg Precision-Tolerant', rate: aggregates.tolerant },
        { label: 'Avg Exact Match', rate: aggregates.exactMatch },
      ]} />
      <div className="space-y-2">
        {metrics.map(dp => (
          <DataPointBar key={dp.id} dp={dp} onSelect={onSelectDataPoint} />
        ))}
      </div>
    </div>
  );
}

function DataPointBar({ dp, onSelect }: { dp: DataPointMetric; onSelect: (id: string) => void }) {
  const rate = dp.tolerantRate;
  const barColor = rate >= 85 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-500';
  const bgColor = rate >= 85 ? 'bg-green-500/10' : rate >= 70 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  return (
    <div
      className={cn('rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity', bgColor)}
      onClick={() => onSelect(dp.id)}
      title={`Click to view ${dp.label} in browser`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-01">{dp.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-02">{dp.tolerantSuccess}/{dp.withAnyData}</span>
          <span className="text-sm font-bold text-gray-01">{rate.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 bg-gray-03/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full', barColor)}
        />
      </div>
      {dp.withAnyData > 0 && (
        <div className="flex gap-3 mt-1.5 text-xs text-gray-02">
          <span className="text-green-400">{dp.breakdown.identical} identical</span>
          <span className="text-yellow-400">{dp.breakdown.rounding} rounding</span>
          <span className="text-purple-400">{dp.breakdown.hallucination} halluc.</span>
          <span className="text-orange-400">{dp.breakdown.missing} missing</span>
          <span className="text-cyan-400">{dp.breakdown.categoryError} cat. err.</span>
          <span className="text-indigo-400">{dp.breakdown.unitError} unit err.</span>
          <span className="text-rose-400">{dp.breakdown.smallError} small err.</span>
          <span className="text-red-400">{dp.breakdown.error} error</span>
        </div>
      )}
    </div>
  );
}

function ScopeSummary({
  title,
  categoryCount,
  aggregates,
}: {
  title: string;
  categoryCount: number;
  aggregates: ReturnType<typeof calculateAggregates>;
}) {
  const breakdownItems = [
    { label: 'Identical', count: aggregates.totals.identical, color: 'text-green-400' },
    { label: 'Rounding', count: aggregates.totals.rounding, color: 'text-yellow-400' },
    { label: 'Small Error', count: aggregates.totals.smallError, color: 'text-rose-400' },
    { label: 'Hallucination', count: aggregates.totals.hallucination, color: 'text-purple-400' },
    { label: 'Missing', count: aggregates.totals.missing, color: 'text-orange-400' },
    { label: 'Unit Error', count: aggregates.totals.unitError, color: 'text-indigo-400' },
    { label: 'Category Error', count: aggregates.totals.categoryError, color: 'text-cyan-400' },
    { label: 'Error', count: aggregates.totals.error, color: 'text-red-400' },
  ];

  return (
    <div className="border-t-2 border-gray-02/30 pt-6">
      <h3 className="text-base font-semibold text-gray-01 mb-2">{title}</h3>
      <p className="text-xs text-gray-02 mb-4">
        {aggregates.totals.withAnyData} data points with values across {categoryCount} categories
        {' '}({aggregates.totals.totalCompanies} total incl. both-empty)
      </p>
      <AggregateMetrics metrics={[
        { label: 'Avg Zero-Inclusive', rate: aggregates.zeroInclusive },
        { label: 'Avg Approximate', rate: aggregates.approximate },
        { label: 'Avg Precision-Tolerant', rate: aggregates.tolerant },
        { label: 'Avg Exact Match', rate: aggregates.exactMatch },
      ]} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {breakdownItems.map(item => (
          <div key={item.label} className="rounded-lg bg-gray-03/30 p-2 text-center">
            <div className={cn('text-lg font-bold font-mono', item.color)}>{item.count}</div>
            <div className="text-xs text-gray-02">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
