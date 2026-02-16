import { cn } from '@/lib/utils';
import type { PerformanceMetricRow } from './utils';

export type { PerformanceMetricRow };

export interface PerformanceMetricsTableProps {
  totalCompanies: number;
  withAnyData: number;
  exactMatch: PerformanceMetricRow;
  tolerant: PerformanceMetricRow;
  zeroInclusive: PerformanceMetricRow;
}

export function PerformanceMetricsTable({
  totalCompanies,
  withAnyData,
  exactMatch,
  tolerant,
  zeroInclusive,
}: PerformanceMetricsTableProps) {
  const metrics = [zeroInclusive, tolerant, exactMatch];

  return (
    <div className="pt-4 border-t border-gray-03/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-01">Performance Metrics</h3>
        <span className="text-xs text-gray-02">
          {totalCompanies} companies in both APIs, {withAnyData} with data
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-02 uppercase tracking-wide">
              <th className="pr-4 py-1.5">Metric</th>
              <th className="px-4 py-1.5 text-right">Count</th>
              <th className="px-4 py-1.5 text-right">Rate</th>
              <th className="pl-4 py-1.5">Notes</th>
            </tr>
          </thead>
          <tbody className="text-gray-01">
            {metrics.map((m) => (
              <tr
                key={m.label}
                className={cn(
                  'border-t border-gray-03/30',
                  m.rate >= 85 ? 'bg-green-500/20' : m.rate >= 70 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                )}
              >
                <td className="pr-4 py-2 font-medium">{m.label}</td>
                <td className="px-4 py-2 text-right font-mono">
                  {m.success}/{m.total}
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold">{m.rate.toFixed(1)}%</td>
                <td className="pl-4 py-2 text-gray-02 text-xs">{m.excludes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
