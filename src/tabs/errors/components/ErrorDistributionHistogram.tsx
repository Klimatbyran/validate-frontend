import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ErrorDistributionHistogramProps {
  distribution: number[];
  barMaxHeight?: number;
}

export function ErrorDistributionHistogram({ distribution, barMaxHeight = 300 }: ErrorDistributionHistogramProps) {
  const maxCount = Math.max(...distribution);

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-gray-01 mb-4">Error Distribution</h3>
      <div className="flex items-end gap-1" style={{ height: barMaxHeight + 30 }}>
        {distribution.map((count, errorNum) => {
          const height = maxCount > 0 ? (count / maxCount) * barMaxHeight : 0;
          const barColor = errorNum === 0 ? 'bg-green-500'
            : errorNum < 3 ? 'bg-yellow-500'
            : errorNum < 5 ? 'bg-orange-500'
            : 'bg-red-500';

          return (
            <div key={errorNum} className="flex flex-col items-center flex-1 min-w-0">
              {count > 0 && (
                <span className="text-xs text-gray-02 mb-1 font-mono">{count}</span>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{ duration: 0.4, delay: errorNum * 0.03 }}
                className={cn('w-full rounded-t', barColor, 'min-w-[4px]')}
                style={{ opacity: count > 0 ? 1 : 0.15 }}
                title={`${count} companies with ${errorNum} errors`}
              />
              <span className={cn(
                'text-xs mt-1 font-mono',
                errorNum >= 5 ? 'text-red-400 font-bold' : 'text-gray-02'
              )}>
                {errorNum}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-gray-02">
        <span>Number of errors per company</span>
        <span className="text-red-400">Red zone (≥5) = difficult report</span>
      </div>
    </div>
  );
}
