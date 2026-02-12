import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, AlertTriangle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiscrepancyType, CompanyRow, DATA_POINTS, discrepancyConfig } from './types';
import { formatValue } from './utils';
import { DiscrepancyBadge } from './DiscrepancyBadge';

interface BrowserViewProps {
  isLoading: boolean;
  error: string | null;
  comparisonRows: CompanyRow[];
  difficultCompanyIds: Map<string, number>;
  selectedDataPoint: string;
  onDataPointChange: (dataPoint: string) => void;
  selectedYear: number;
}

export function BrowserView({
  isLoading,
  error,
  comparisonRows,
  difficultCompanyIds,
  selectedDataPoint,
  onDataPointChange,
  selectedYear,
}: BrowserViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [visibleTypes, setVisibleTypes] = React.useState<Set<DiscrepancyType>>(
    new Set(['hallucination', 'missing', 'rounding', 'unit-error', 'small-error', 'error', 'category-error'])
  );
  const [showMissingCompany, setShowMissingCompany] = React.useState(false);

  const toggleType = (type: DiscrepancyType) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const showOnlyType = (type: DiscrepancyType) => setVisibleTypes(new Set([type]));

  const showAllTypes = () => {
    setVisibleTypes(new Set(['identical', 'both-null', 'hallucination', 'missing', 'rounding', 'unit-error', 'small-error', 'error', 'category-error']));
  };

  const showDefaultTypes = () => {
    setVisibleTypes(new Set(['hallucination', 'missing', 'rounding', 'small-error', 'error', 'category-error']));
  };

  // Count by discrepancy type
  const counts = React.useMemo(() => {
    const result: Record<string, number> = {
      identical: 0, 'both-null': 0, hallucination: 0, missing: 0,
      rounding: 0, 'unit-error': 0, 'small-error': 0, error: 0,
      'category-error': 0, missingCompany: 0,
    };
    for (const row of comparisonRows) {
      if (!row.inStage || !row.inProd) result.missingCompany++;
      if (showMissingCompany || (row.inStage && row.inProd)) {
        result[row.discrepancy]++;
      }
    }
    return result;
  }, [comparisonRows, showMissingCompany]);

  // Filter rows
  const filteredRows = React.useMemo(() => {
    let rows = comparisonRows;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.wikidataId.toLowerCase().includes(query)
      );
    }
    rows = rows.filter(r => visibleTypes.has(r.discrepancy));
    if (!showMissingCompany) {
      rows = rows.filter(r => r.inStage && r.inProd);
    }
    return rows;
  }, [comparisonRows, searchQuery, visibleTypes, showMissingCompany]);

  // Accuracy metrics for this data point
  const metrics = React.useMemo(() => {
    const bothExist = comparisonRows.filter(r => r.inStage && r.inProd);
    if (bothExist.length === 0) return null;

    const identical = bothExist.filter(r => r.discrepancy === 'identical').length;
    const rounding = bothExist.filter(r => r.discrepancy === 'rounding').length;
    const bothNull = bothExist.filter(r => r.discrepancy === 'both-null').length;
    const hallucination = bothExist.filter(r => r.discrepancy === 'hallucination').length;
    const missing = bothExist.filter(r => r.discrepancy === 'missing').length;
    const unitError = bothExist.filter(r => r.discrepancy === 'unit-error').length;
    const smallError = bothExist.filter(r => r.discrepancy === 'small-error').length;
    const errorCount = bothExist.filter(r => r.discrepancy === 'error').length;
    const categoryError = bothExist.filter(r => r.discrepancy === 'category-error').length;

    const totalCompanies = bothExist.length;
    const withAnyData = identical + rounding + hallucination + missing + unitError + smallError + errorCount + categoryError;

    return {
      totalCompanies,
      withAnyData,
      exactMatch: {
        success: identical, total: withAnyData,
        rate: withAnyData > 0 ? (identical / withAnyData) * 100 : 0,
        label: 'Exact Match', excludes: 'Nothing',
      },
      tolerant: {
        success: identical + rounding, total: withAnyData,
        rate: withAnyData > 0 ? ((identical + rounding) / withAnyData) * 100 : 0,
        label: 'Precision-Tolerant', excludes: 'Rounding (≤0.5)',
      },
      zeroInclusive: {
        success: identical + rounding + bothNull, total: totalCompanies,
        rate: totalCompanies > 0 ? ((identical + rounding + bothNull) / totalCompanies) * 100 : 0,
        label: 'Zero-Inclusive', excludes: 'Rounding + both empty is correct',
      },
    };
  }, [comparisonRows]);

  // Export to CSV
  const exportToCsv = () => {
    const headers = ['Company', 'WikidataId', 'Stage', 'Prod', 'Diff', 'Status', 'In Stage', 'In Prod'];
    const csvRows = [headers.join(',')];

    for (const row of filteredRows) {
      csvRows.push([
        `"${row.name.replace(/"/g, '""')}"`,
        row.wikidataId, row.stageValue ?? '', row.prodValue ?? '',
        row.diff ?? '', row.discrepancy,
        row.inStage ? 'yes' : 'no', row.inProd ? 'yes' : 'no',
      ].join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDataPoint}-comparison-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedDataPointLabel = DATA_POINTS.find(dp => dp.id === selectedDataPoint)?.label || selectedDataPoint;

  return (
    <>
      {/* Controls: data point selector, search, export */}
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1 flex-1 max-w-md">
            <label className="text-xs text-gray-02 uppercase tracking-wide">Data Point</label>
            <select
              value={selectedDataPoint}
              onChange={(e) => onDataPointChange(e.target.value)}
              className="bg-gray-03 text-gray-01 rounded px-3 py-2 text-sm border border-gray-02/20"
            >
              {DATA_POINTS.map(dp => (
                <option key={dp.id} value={dp.id}>{dp.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 max-w-xs">
            <label className="text-xs text-gray-02 uppercase tracking-wide">Search</label>
            <input
              type="text"
              placeholder="Filter companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-03 text-gray-01 rounded px-3 py-2 text-sm border border-gray-02/20 placeholder-gray-02"
            />
          </div>

          <button
            onClick={exportToCsv}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Performance Metrics */}
        {!isLoading && metrics && (
          <div className="pt-4 border-t border-gray-03/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-01">Performance Metrics</h3>
              <span className="text-xs text-gray-02">
                {metrics.totalCompanies} companies in both APIs, {metrics.withAnyData} with data
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
                  {[metrics.zeroInclusive, metrics.tolerant, metrics.exactMatch].map(m => (
                    <tr key={m.label} className={cn(
                      'border-t border-gray-03/30',
                      m.rate >= 85 ? 'bg-green-500/20' : m.rate >= 70 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                    )}>
                      <td className="pr-4 py-2 font-medium">{m.label}</td>
                      <td className="px-4 py-2 text-right font-mono">{m.success}/{m.total}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{m.rate.toFixed(1)}%</td>
                      <td className="pl-4 py-2 text-gray-02 text-xs">{m.excludes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filter pills */}
        {!isLoading && comparisonRows.length > 0 && (
          <div className="pt-4 border-t border-gray-03/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-02 uppercase tracking-wide">Filter by type:</span>
              <button onClick={showDefaultTypes} className="text-xs text-gray-02 hover:text-gray-01 underline">Reset</button>
              <button onClick={showAllTypes} className="text-xs text-gray-02 hover:text-gray-01 underline">Show all</button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {(Object.keys(discrepancyConfig) as DiscrepancyType[]).map(type => {
                const config = discrepancyConfig[type];
                const count = counts[type];
                const isActive = visibleTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    onContextMenu={(e) => { e.preventDefault(); showOnlyType(type); }}
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
                onChange={(e) => setShowMissingCompany(e.target.checked)}
                className="rounded border-gray-02/50 bg-gray-03 text-blue-500 focus:ring-blue-500/50"
              />
              <span>Include companies missing from one API ({counts.missingCompany})</span>
            </label>
          </div>
        )}
      </div>

      {/* Company table */}
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-3 text-gray-02">Loading companies...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-red-400">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Error loading data</span>
            </div>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-03/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-02 uppercase tracking-wider">Stage</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-02 uppercase tracking-wider">Prod (Truth)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-02 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-02 uppercase tracking-wider">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-03/50">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-02">
                      No data to display. Try enabling more filters above.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <CompanyTableRow
                      key={row.wikidataId}
                      row={row}
                      index={index}
                      difficultCompanyIds={difficultCompanyIds}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !error && (
          <div className="px-4 py-3 bg-gray-03/30 text-sm text-gray-02 border-t border-gray-03/50">
            Showing {filteredRows.length} of {comparisonRows.length} companies for <strong className="text-gray-01">{selectedDataPointLabel}</strong> ({selectedYear})
          </div>
        )}
      </div>
    </>
  );
}

function CompanyTableRow({
  row,
  index,
  difficultCompanyIds,
}: {
  row: CompanyRow;
  index: number;
  difficultCompanyIds: Map<string, number>;
}) {
  const config = discrepancyConfig[row.discrepancy];
  const isMissingCompany = !row.inStage || !row.inProd;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.01, 0.5) }}
      className={cn('transition-colors hover:bg-gray-03/30', config.bgColor)}
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
        {formatValue(row.stageValue)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-gray-01">
        {formatValue(row.prodValue)}
      </td>
      <td className="px-4 py-3 text-center">
        <DiscrepancyBadge row={row} />
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {row.diff !== null ? (
          <span className={cn(
            row.diff > 0 ? 'text-purple-400' : row.diff < 0 ? 'text-orange-400' : 'text-gray-02'
          )}>
            {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString('sv-SE')}
          </span>
        ) : (
          <span className="text-gray-02">—</span>
        )}
      </td>
    </motion.tr>
  );
}
