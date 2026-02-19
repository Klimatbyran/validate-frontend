import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DataPointMetric } from '../types';

interface DataPointBarProps {
  dp: DataPointMetric;
  onSelect: (id: string) => void;
}

export function DataPointBar({ dp, onSelect }: DataPointBarProps) {
  const rate = dp.tolerantRate;
  const barColor = rate >= 85 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-500';
  const bgColor = 'bg-gray-03/20';

  return (
    <div
      className={cn('rounded-lg p-3 cursor-pointer hover:opacity-90 transition-opacity', bgColor)}
      onClick={() => onSelect(dp.id)}
      title={`Click to view ${dp.label} in browser`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-01">{dp.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-02">
            {dp.tolerantSuccess}/{dp.withAnyData}
          </span>
          <span
            className={cn(
              'text-sm font-bold',
              rate >= 85 ? 'text-green-400' : rate >= 70 ? 'text-yellow-400' : 'text-red-400'
            )}
          >
            {rate.toFixed(1)}%
          </span>
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
