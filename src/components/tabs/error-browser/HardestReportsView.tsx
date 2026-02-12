import React from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiscrepancyType, WorstCompany, discrepancyConfig } from './types';
import { ErrorDistributionHistogram } from './ErrorDistributionHistogram';

interface HardestReportsViewProps {
  isLoading: boolean;
  worstCompanies: WorstCompany[];
  totalWithBothRPs: number;
  selectedYear: number;
}

function exportHardestReportsCsv(worstCompanies: WorstCompany[], selectedYear: number) {
  const headers = ['Rank', 'Company', 'WikidataId', 'Errors', 'Total Data Points', 'Difficult', 'Error Types', 'Affected Data Points'];
  const csvRows = [headers.join(',')];

  worstCompanies.forEach((company, index) => {
    const errorTypes = Object.entries(company.breakdown)
      .map(([type, count]) => `${type}:${count}`)
      .join('; ');
    const affectedDPs = company.errorDataPoints
      .map(dp => dp.label)
      .join('; ');

    csvRows.push([
      index + 1,
      `"${company.name.replace(/"/g, '""')}"`,
      company.wikidataId,
      company.errorCount,
      company.totalDataPoints,
      company.errorCount >= 5 ? 'yes' : 'no',
      `"${errorTypes}"`,
      `"${affectedDPs}"`,
    ].join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hardest-reports-${selectedYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function HardestReportsView({ isLoading, worstCompanies, totalWithBothRPs, selectedYear }: HardestReportsViewProps) {
  // Build error distribution for histogram
  const distribution = React.useMemo(() => {
    if (worstCompanies.length === 0) return [];
    const maxErrors = worstCompanies[0]?.errorCount || 0;
    const dist = new Array(maxErrors + 1).fill(0);
    dist[0] = totalWithBothRPs - worstCompanies.length;
    for (const c of worstCompanies) {
      if (c.errorCount <= maxErrors) dist[c.errorCount]++;
    }
    return dist;
  }, [worstCompanies, totalWithBothRPs]);

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-02">Loading companies...</span>
        </div>
      ) : (
        <>
          <div className="flex justify-end p-4 pb-0">
            <button
              onClick={() => exportHardestReportsCsv(worstCompanies, selectedYear)}
              disabled={worstCompanies.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {distribution.length > 0 && (
            <ErrorDistributionHistogram distribution={distribution} />
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-03/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-02 uppercase tracking-wider">Errors</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">Breakdown</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">Affected Data Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-03/50">
                {worstCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-02">
                      No companies with errors found.
                    </td>
                  </tr>
                ) : (
                  worstCompanies.map((company, index) => (
                    <HardestReportRow key={company.wikidataId} company={company} index={index} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!isLoading && (
        <div className="px-4 py-3 bg-gray-03/30 text-sm text-gray-02 border-t border-gray-03/50">
          {worstCompanies.length} companies with errors
          {worstCompanies.filter(c => c.errorCount >= 5).length > 0 && (
            <span className="ml-2 text-red-400">
              ({worstCompanies.filter(c => c.errorCount >= 5).length} difficult reports)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function HardestReportRow({ company, index }: { company: WorstCompany; index: number }) {
  const isDifficult = company.errorCount >= 5;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.01, 0.5) }}
      className={cn('transition-colors hover:bg-gray-03/30', isDifficult ? 'bg-red-500/5' : '')}
    >
      <td className="px-4 py-3 text-sm text-gray-02 font-mono">{index + 1}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-01 text-sm">{company.name}</span>
          {isDifficult && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
              Difficult Report
            </span>
          )}
        </div>
        <div className="text-xs text-gray-02 mt-0.5">{company.wikidataId}</div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={cn(
          'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
          company.errorCount > 10 ? 'bg-red-500/20 text-red-400' :
          company.errorCount >= 5 ? 'bg-orange-500/20 text-orange-400' :
          'bg-yellow-500/20 text-yellow-400'
        )}>
          {company.errorCount}
        </span>
        {company.totalDataPoints > 0 && (
          <div className="text-xs text-gray-02 mt-0.5">/{company.totalDataPoints}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {Object.entries(company.breakdown).map(([type, count]) => {
            const config = discrepancyConfig[type as DiscrepancyType];
            if (!config) return null;
            return (
              <span
                key={type}
                className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', config.bgColor, config.textColor)}
              >
                {config.icon}
                {count}
              </span>
            );
          })}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 max-w-md">
          {company.errorDataPoints.map((dp, i) => {
            const config = discrepancyConfig[dp.discrepancy];
            return (
              <span
                key={i}
                className={cn('px-1.5 py-0.5 rounded text-xs', config.bgColor, config.textColor)}
                title={`${dp.label}: ${config.label}`}
              >
                {dp.label.replace(/Cat \d+ - /, 'C').replace('Scope ', 'S')}
              </span>
            );
          })}
        </div>
      </td>
    </motion.tr>
  );
}
