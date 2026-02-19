import { cn } from '@/lib/utils';

interface AggregateMetricsProps {
  metrics: Array<{ label: string; rate: number }>;
}

export function AggregateMetrics({ metrics }: AggregateMetricsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg p-3 text-center bg-gray-03/30"
        >
          <div className="text-xs text-gray-02 mb-1">{metric.label}</div>
          <div
            className={cn(
              'text-lg font-bold',
              metric.rate >= 85 ? 'text-green-400' : metric.rate >= 70 ? 'text-yellow-400' : 'text-red-400'
            )}
          >
            {metric.rate.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}
