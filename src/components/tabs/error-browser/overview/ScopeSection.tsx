import type { DataPointMetric } from '../types';
import type { OverviewAggregates } from '../utils';
import { AggregateMetrics } from '../components/AggregateMetrics';
import { DataPointBar } from './DataPointBar';

interface ScopeSectionProps {
  title: string;
  aggregates: OverviewAggregates;
  metrics: DataPointMetric[];
  onSelectDataPoint: (id: string) => void;
}

export function ScopeSection({ title, aggregates, metrics, onSelectDataPoint }: ScopeSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-01 mb-3">{title}</h3>
      <AggregateMetrics
        metrics={[
          { label: 'Avg Zero-Inclusive', rate: aggregates.zeroInclusive },
          { label: 'Avg Approximate', rate: aggregates.approximate },
          { label: 'Avg Precision-Tolerant', rate: aggregates.tolerant },
          { label: 'Avg Exact Match', rate: aggregates.exactMatch },
        ]}
      />
      <div className="space-y-2">
        {metrics.map((dp) => (
          <DataPointBar key={dp.id} dp={dp} onSelect={onSelectDataPoint} />
        ))}
      </div>
    </div>
  );
}
