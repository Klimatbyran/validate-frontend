import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { CompanyRow } from '../types';
import { DiscrepancyBadge } from './DiscrepancyBadge';

interface CompanyTableRowProps {
  row: CompanyRow;
  index: number;
  difficultCompanyIds: Map<string, number>;
}

export function CompanyTableRow({ row, index, difficultCompanyIds }: CompanyTableRowProps) {
  const isMissingCompany = !row.inStage || !row.inProd;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.01, 0.5) }}
      className="transition-colors hover:bg-gray-03/30"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 font-medium text-gray-01 text-sm">
          {row.name}
          {difficultCompanyIds.has(row.wikidataId) && (
            <span
              className="text-red-400 cursor-help"
              title={`Difficult report — ${difficultCompanyIds.get(row.wikidataId)} errors across all data points`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-02">{row.wikidataId}</span>
          {isMissingCompany && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
              {!row.inStage ? 'Not in Stage' : 'Not in Prod'}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-gray-01">
        {formatNumber(row.stageValue)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-gray-01">
        {formatNumber(row.prodValue)}
      </td>
      <td className="px-4 py-3 text-center">
        <DiscrepancyBadge row={row} />
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {row.diff !== null ? (
          <span
            className={cn(
              row.diff > 0 ? 'text-purple-400' : row.diff < 0 ? 'text-orange-400' : 'text-gray-02'
            )}
          >
            {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString('sv-SE')}
          </span>
        ) : (
          <span className="text-gray-02">—</span>
        )}
      </td>
    </motion.tr>
  );
}
