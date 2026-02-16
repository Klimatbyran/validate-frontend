import { cn } from '@/lib/utils';
import { DiscrepancyType } from './types';
import { discrepancyConfig } from './discrepancyConfig.tsx';

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
        <span className="text-xs text-gray-02 uppercase tracking-wide">Filter by type:</span>
        <button onClick={onShowDefaultTypes} className="text-xs text-gray-02 hover:text-gray-01 underline">
          Reset
        </button>
        <button onClick={onShowAllTypes} className="text-xs text-gray-02 hover:text-gray-01 underline">
          Show all
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {(Object.keys(discrepancyConfig) as DiscrepancyType[]).map((type) => {
          const config = discrepancyConfig[type];
          const count = counts[type];
          const isActive = visibleTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => onToggleType(type)}
              onContextMenu={(e) => {
                e.preventDefault();
                onShowOnlyType(type);
              }}
              title={`Click to toggle, right-click to show only ${config.label}`}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                config.borderColor,
                isActive ? [config.bgColor, config.textColor] : 'bg-transparent text-gray-02/50 opacity-50',
                'hover:opacity-100 cursor-pointer'
              )}
            >
              {config.icon}
              <span>{config.label}</span>
              <span className={cn('px-1.5 py-0.5 rounded text-xs font-bold', isActive ? 'bg-white/10' : 'bg-white/5')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-02 cursor-pointer hover:text-gray-01 transition-colors mt-3">
        <input
          type="checkbox"
          checked={showMissingCompany}
          onChange={(e) => onShowMissingCompanyChange(e.target.checked)}
          className="rounded border-gray-02/50 bg-gray-03 text-blue-500 focus:ring-blue-500/50"
        />
        <span>Include companies missing from one API ({counts.missingCompany})</span>
      </label>
    </div>
  );
}
