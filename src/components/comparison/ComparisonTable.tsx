import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DiscrepancyType =
  | 'identical'      // a === b
  | 'hallucination'  // stage has value, prod (truth) has not
  | 'missing'        // prod has value, stage has not
  | 'rounding'       // small difference within threshold
  | 'error';         // significant discrepancy

export interface ComparisonRow {
  id: string;
  label: string;
  stageValue: number | null;
  prodValue: number | null;
  unit?: string;
}

export interface ComparisonTableProps {
  rows: ComparisonRow[];
  stageLabel?: string;
  prodLabel?: string;
  roundingThreshold?: number;
  showIdentical?: boolean;
  onToggleShowIdentical?: (show: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
}

function classifyDiscrepancy(
  stageValue: number | null,
  prodValue: number | null,
  roundingThreshold: number
): DiscrepancyType {
  const stageHasValue = stageValue !== null && stageValue !== undefined;
  const prodHasValue = prodValue !== null && prodValue !== undefined;

  // Both null = identical
  if (!stageHasValue && !prodHasValue) {
    return 'identical';
  }

  // Stage has value but prod doesn't = hallucination
  if (stageHasValue && !prodHasValue) {
    return 'hallucination';
  }

  // Prod has value but stage doesn't = missing
  if (!stageHasValue && prodHasValue) {
    return 'missing';
  }

  // Both have values - compare them
  const diff = Math.abs(stageValue! - prodValue!);

  if (diff === 0) {
    return 'identical';
  }

  if (diff <= roundingThreshold) {
    return 'rounding';
  }

  return 'error';
}

const discrepancyConfig: Record<DiscrepancyType, {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  identical: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Identical',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  hallucination: {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Hallucination',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  missing: {
    icon: <MinusCircle className="w-4 h-4" />,
    label: 'Missing',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  rounding: {
    icon: <Calculator className="w-4 h-4" />,
    label: 'Rounding',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    label: 'Error',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

function formatValue(value: number | null, unit?: string): string {
  if (value === null || value === undefined) {
    return '—';
  }
  const formatted = value.toLocaleString('sv-SE');
  return unit ? `${formatted} ${unit}` : formatted;
}

function DiscrepancyBadge({ type }: { type: DiscrepancyType }) {
  const config = discrepancyConfig[type];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      config.bgColor,
      config.textColor
    )}>
      {config.icon}
      {config.label}
    </span>
  );
}

export function ComparisonTable({
  rows,
  stageLabel = 'Stage',
  prodLabel = 'Prod (Truth)',
  roundingThreshold = 0.5,
  showIdentical = false,
  onToggleShowIdentical,
  isLoading = false,
  error = null,
}: ComparisonTableProps) {
  // Classify all rows
  const classifiedRows = React.useMemo(() => {
    return rows.map(row => ({
      ...row,
      discrepancy: classifyDiscrepancy(row.stageValue, row.prodValue, roundingThreshold),
    }));
  }, [rows, roundingThreshold]);

  // Filter rows based on showIdentical
  const visibleRows = React.useMemo(() => {
    if (showIdentical) {
      return classifiedRows;
    }
    return classifiedRows.filter(row => row.discrepancy !== 'identical');
  }, [classifiedRows, showIdentical]);

  // Count by discrepancy type
  const counts = React.useMemo(() => {
    const result: Record<DiscrepancyType, number> = {
      identical: 0,
      hallucination: 0,
      missing: 0,
      rounding: 0,
      error: 0,
    };
    for (const row of classifiedRows) {
      result[row.discrepancy]++;
    }
    return result;
  }, [classifiedRows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Loading comparison data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Error loading data</span>
        </div>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data to compare
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-gray-600 font-medium">Summary:</span>
        {(Object.keys(discrepancyConfig) as DiscrepancyType[]).map(type => (
          <button
            key={type}
            onClick={() => {
              if (type === 'identical' && onToggleShowIdentical) {
                onToggleShowIdentical(!showIdentical);
              }
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              discrepancyConfig[type].bgColor,
              discrepancyConfig[type].textColor,
              discrepancyConfig[type].borderColor,
              'border',
              type === 'identical' && 'cursor-pointer hover:opacity-80',
              type === 'identical' && !showIdentical && 'opacity-50'
            )}
          >
            {discrepancyConfig[type].icon}
            <span>{discrepancyConfig[type].label}</span>
            <span className="bg-white/50 px-1.5 py-0.5 rounded text-xs font-bold">
              {counts[type]}
            </span>
          </button>
        ))}
      </div>

      {/* Toggle for identical rows */}
      {counts.identical > 0 && onToggleShowIdentical && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showIdentical}
            onChange={(e) => onToggleShowIdentical(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show identical values ({counts.identical} hidden)
        </label>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Field
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {stageLabel}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {prodLabel}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Diff
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {counts.identical > 0
                    ? 'All values are identical. Toggle "Show identical values" to see them.'
                    : 'No data to display'}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, index) => {
                const config = discrepancyConfig[row.discrepancy];
                const diff = row.stageValue !== null && row.prodValue !== null
                  ? row.stageValue - row.prodValue
                  : null;

                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'transition-colors',
                      config.bgColor,
                      'hover:opacity-80'
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatValue(row.stageValue, row.unit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatValue(row.prodValue, row.unit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DiscrepancyBadge type={row.discrepancy} />
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {diff !== null ? (
                        <span className={cn(
                          diff > 0 ? 'text-purple-600' : diff < 0 ? 'text-orange-600' : 'text-gray-400'
                        )}>
                          {diff > 0 ? '+' : ''}{diff.toLocaleString('sv-SE')}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { classifyDiscrepancy, discrepancyConfig };
