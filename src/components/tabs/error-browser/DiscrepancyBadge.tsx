import React from 'react';
import { cn } from '@/lib/utils';
import { CompanyRow, discrepancyConfig } from './types';

interface DiscrepancyBadgeProps {
  row: CompanyRow;
}

export function DiscrepancyBadge({ row }: DiscrepancyBadgeProps) {
  const config = discrepancyConfig[row.discrepancy];

  return (
    <div>
      <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          config.bgColor,
          config.textColor
        )}>
          {config.icon}
          {config.label}
          {row.discrepancy === 'small-error' && row.stageValue !== null && row.prodValue !== null && Math.abs(row.prodValue) > 0 && (() => {
            const pct = Math.abs(row.stageValue - row.prodValue) / Math.abs(row.prodValue) * 100;
            return (
              <span className="opacity-75">
                ({pct < 0.1 ? pct.toFixed(2) : pct.toFixed(1)}%)
              </span>
            );
          })()}
        </span>
        {row.unitErrorFactor !== undefined && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-500/20 text-indigo-400 cursor-help"
            title={`Stage value is ${row.unitErrorFactor >= 1 ? row.unitErrorFactor + '×' : '1/' + (1 / row.unitErrorFactor) + '×'} the prod value — likely a unit mismatch (e.g. tonnes vs kilotonnes)`}
          >
            {row.unitErrorFactor >= 1 ? `×${row.unitErrorFactor.toLocaleString()}` : `÷${(1 / row.unitErrorFactor).toLocaleString()}`}
          </span>
        )}
        {row.categoryErrorKind && (
          <CategoryErrorKindBadge kind={row.categoryErrorKind} />
        )}
      </div>
      {row.matchedDataPoint && (
        <div className="text-xs text-cyan-400/70 mt-0.5">
          Found in {row.matchedDataPoint}
        </div>
      )}
    </div>
  );
}

function CategoryErrorKindBadge({ kind }: { kind: NonNullable<CompanyRow['categoryErrorKind']> }) {
  const kindConfig = {
    conservative: {
      bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400', label: 'Conservative',
      title: 'Right number placed in a safer/generic bucket (e.g. unknown, other)',
    },
    swap: {
      bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400', label: 'Swap',
      title: "Values are swapped between two categories — both have each other's value",
    },
    'mix-up': {
      bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400', label: 'Mix-up',
      title: 'Value placed in the wrong category (not a clean swap)',
    },
    overcategorized: {
      bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400', dot: 'bg-fuchsia-400', label: 'Overcategorized',
      title: 'Value belongs in a generic bucket (unknown/other) but was placed in a specific category — false precision',
    },
    duplicating: {
      bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400', label: 'Duplicating',
      title: 'Same value appears in multiple categories, inflating totals',
    },
  };

  const cfg = kindConfig[kind];

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium cursor-help', cfg.bg, cfg.text)}
      title={cfg.title}
    >
      <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}
