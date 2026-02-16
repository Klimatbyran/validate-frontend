import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DiscrepancyType } from './types';
import { discrepancyConfig } from './discrepancyConfig.tsx';

/** Filter pill order: default-on types first, then identical and both-null (off by default) last. */
const FILTER_PILL_ORDER: DiscrepancyType[] = [
  'hallucination',
  'missing',
  'rounding',
  'unit-error',
  'small-error',
  'category-error',
  'error',
  'identical',
  'both-null',
];

interface DiscrepancyFilterPillsProps {
  counts: Record<string, number>;
  visibleTypes: Set<DiscrepancyType>;
  showMissingCompany: boolean;
  onToggleType: (type: DiscrepancyType) => void;
  onShowOnlyType: (type: DiscrepancyType) => void;
  onShowDefaultTypes: () => void;
  onShowAllTypes: () => void;
  onShowMissingCompanyChange: (show: boolean) => void;
}

export function DiscrepancyFilterPills({
  counts,
  visibleTypes,
  showMissingCompany,
  onToggleType,
  onShowOnlyType,
  onShowDefaultTypes,
  onShowAllTypes,
  onShowMissingCompanyChange,
}: DiscrepancyFilterPillsProps) {
  return (
    <div className="pt-4 border-t border-gray-03/50">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-5 h-5 text-gray-02" />
        <span className="text-sm font-medium text-gray-01">Filter</span>
        <button onClick={onShowDefaultTypes} className="text-xs text-gray-02 hover:text-gray-01 underline">
          Reset
        </button>
        <button onClick={onShowAllTypes} className="text-xs text-gray-02 hover:text-gray-01 underline">
          Show all
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {FILTER_PILL_ORDER.map((type) => {
          const config = discrepancyConfig[type];
          const count = counts[type];
          const isActive = visibleTypes.has(type);
          return (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => onToggleType(type)}
              onContextMenu={(e) => {
                e.preventDefault();
                onShowOnlyType(type);
              }}
              title={`Click to toggle, right-click to show only ${config.label}`}
              className={cn(
                isActive
                  ? `${config.bgColor} ${config.textColor} border-0 hover:opacity-90`
                  : 'border border-gray-03 text-gray-01 hover:bg-gray-03/40'
              )}
            >
              <span className="mr-1.5">{config.icon}</span>
              {config.label}
              <span
                className={cn(
                  'ml-2 px-2 py-0.5 rounded-full text-xs font-medium',
                  isActive ? 'bg-white/20 text-white' : `${config.bgColor} ${config.textColor}`
                )}
              >
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-02 cursor-pointer hover:text-gray-01 transition-colors mt-3">
        <input
          type="checkbox"
          checked={showMissingCompany}
          onChange={(e) => onShowMissingCompanyChange(e.target.checked)}
          className="rounded border-gray-02/50 bg-gray-03 text-blue-03 focus:ring-blue-03/50"
        />
        <span>Include companies missing from one API ({counts.missingCompany})</span>
      </label>
    </div>
  );
}
