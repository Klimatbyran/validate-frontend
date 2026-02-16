import React from 'react';
import { XCircle, Download } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DiscrepancyType, CompanyRow, DATA_POINTS } from './types';
import { computePerformanceMetrics, exportComparisonToCsv } from './utils';
import { CompanyTableRow } from './CompanyTableRow';
import { PerformanceMetricsTable } from './PerformanceMetricsTable';
import { DiscrepancyFilterPills } from './DiscrepancyFilterPills';

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

  const metrics = React.useMemo(() => computePerformanceMetrics(comparisonRows), [comparisonRows]);

  const handleExportCsv = () => {
    exportComparisonToCsv(filteredRows, selectedDataPoint, selectedYear);
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
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-03 text-gray-01 rounded-lg hover:bg-gray-02 hover:text-white disabled:opacity-50 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {!isLoading && metrics && (
          <PerformanceMetricsTable
            totalCompanies={metrics.totalCompanies}
            withAnyData={metrics.withAnyData}
            exactMatch={metrics.exactMatch}
            tolerant={metrics.tolerant}
            zeroInclusive={metrics.zeroInclusive}
          />
        )}

        {!isLoading && comparisonRows.length > 0 && (
          <DiscrepancyFilterPills
            counts={counts}
            visibleTypes={visibleTypes}
            showMissingCompany={showMissingCompany}
            onToggleType={toggleType}
            onShowOnlyType={showOnlyType}
            onShowDefaultTypes={showDefaultTypes}
            onShowAllTypes={showAllTypes}
            onShowMissingCompanyChange={setShowMissingCompany}
          />
        )}
      </div>

      {/* Company table */}
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner label="Loading companies..." />
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
