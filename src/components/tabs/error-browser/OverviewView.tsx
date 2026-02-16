import { Download } from 'lucide-react';
import { DataPointMetric } from './types';
import { calculateOverviewAggregates, exportOverviewCsv } from './utils';
import { DataPointBar, ScopeSection, ScopeSummary } from './overview';

interface OverviewViewProps {
  allDataPointMetrics: DataPointMetric[];
  selectedYear: number;
  onSelectDataPoint: (dataPointId: string) => void;
}

export function OverviewView({ allDataPointMetrics, selectedYear, onSelectDataPoint }: OverviewViewProps) {
  if (allDataPointMetrics.length === 0) return null;

  const scope1Metrics = allDataPointMetrics.filter((dp) => dp.id.startsWith('scope1-'));
  const scope2Metrics = allDataPointMetrics.filter((dp) => dp.id.startsWith('scope2-'));
  const scope3Metrics = allDataPointMetrics.filter((dp) => dp.id.startsWith('cat-') && dp.id !== 'cat-16');
  const otherMetrics = allDataPointMetrics.filter(
    (dp) =>
      dp.id === 'cat-16' ||
      dp.id === 'scope3-stated-total' ||
      dp.id === 'scope3-calculated-total' ||
      dp.id === 'stated-total' ||
      dp.id === 'calculated-total'
  );

  const scope1Aggregates = calculateOverviewAggregates(scope1Metrics);
  const scope2Aggregates = calculateOverviewAggregates(scope2Metrics);
  const scope3Aggregates = calculateOverviewAggregates(scope3Metrics);
  const scope12Aggregates = calculateOverviewAggregates([...scope1Metrics, ...scope2Metrics]);
  const allScopesAggregates = calculateOverviewAggregates([
    ...scope1Metrics,
    ...scope2Metrics,
    ...scope3Metrics,
  ]);

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => exportOverviewCsv(allDataPointMetrics, selectedYear)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-03 text-gray-01 rounded-lg hover:bg-gray-02 hover:text-white transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {scope1Metrics.length > 0 && (
        <ScopeSection
          title={`Scope 1 (${selectedYear})`}
          aggregates={scope1Aggregates}
          metrics={scope1Metrics}
          onSelectDataPoint={onSelectDataPoint}
        />
      )}

      {scope2Metrics.length > 0 && (
        <ScopeSection
          title={`Scope 2 (${selectedYear})`}
          aggregates={scope2Aggregates}
          metrics={scope2Metrics}
          onSelectDataPoint={onSelectDataPoint}
        />
      )}

      {scope3Metrics.length > 0 && (
        <ScopeSection
          title={`Scope 3 Categories (${selectedYear})`}
          aggregates={scope3Aggregates}
          metrics={scope3Metrics}
          onSelectDataPoint={onSelectDataPoint}
        />
      )}

      {otherMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-01 mb-3">Other</h3>
          <div className="space-y-2">
            {otherMetrics.map((dp) => (
              <DataPointBar key={dp.id} dp={dp} onSelect={onSelectDataPoint} />
            ))}
          </div>
        </div>
      )}

      {allScopesAggregates.totals.withAnyData > 0 && (
        <ScopeSummary
          title={`Overall Accuracy — Scope 1 + 2 + 3 (${selectedYear})`}
          categoryCount={[...scope1Metrics, ...scope2Metrics, ...scope3Metrics].length}
          aggregates={allScopesAggregates}
        />
      )}

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
