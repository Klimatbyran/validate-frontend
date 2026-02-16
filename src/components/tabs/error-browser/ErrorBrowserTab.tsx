import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useErrorBrowserData } from './useErrorBrowserData';
import { BrowserView } from './BrowserView';
import { OverviewView } from './OverviewView';
import { HardestReportsView } from './HardestReportsView';

export function ErrorBrowserTab() {
  const [selectedYear, setSelectedYear] = React.useState(2024);
  const [selectedDataPoint, setSelectedDataPoint] = React.useState('cat-1');
  const [viewMode, setViewMode] = React.useState<'browser' | 'overview' | 'worst'>('browser');

  const {
    isLoading,
    error,
    fetchData,
    comparisonRows,
    allDataPointMetrics,
    worstCompanies,
    difficultCompanyIds,
    totalWithBothRPs,
  } = useErrorBrowserData(selectedYear, selectedDataPoint);

  const handleOverviewSelectDataPoint = (dataPointId: string) => {
    setSelectedDataPoint(dataPointId);
    setViewMode('browser');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl text-gray-01 font-semibold">Error Browser</h2>
            <p className="text-sm text-gray-02 mt-1">
              Compare emissions data between Stage and Prod APIs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle – match main app tabs (white/gray-01 when selected) */}
            <div className="flex rounded-full overflow-hidden border border-gray-02/20 bg-gray-04/50 p-1">
              {(['browser', 'overview', 'worst'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-full transition-all',
                    viewMode === mode
                      ? 'bg-gray-01 text-gray-05 shadow-sm'
                      : 'text-gray-02 hover:text-gray-01'
                  )}
                >
                  {mode === 'browser' ? 'Browser' : mode === 'overview' ? 'Overview' : 'Hardest Reports'}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-04 text-white rounded-full hover:bg-blue-04/90 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Year selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-02 uppercase tracking-wide">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-03 text-gray-01 rounded px-3 py-2 text-sm border border-gray-02/20 w-fit"
          >
            {[2025, 2024, 2023, 2022, 2021, 2020].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* View content */}
      {viewMode === 'browser' && (
        <BrowserView
          isLoading={isLoading}
          error={error}
          comparisonRows={comparisonRows}
          difficultCompanyIds={difficultCompanyIds}
          selectedDataPoint={selectedDataPoint}
          onDataPointChange={setSelectedDataPoint}
          selectedYear={selectedYear}
        />
      )}

      {viewMode === 'overview' && !isLoading && (
        <OverviewView
          allDataPointMetrics={allDataPointMetrics}
          selectedYear={selectedYear}
          onSelectDataPoint={handleOverviewSelectDataPoint}
        />
      )}

      {viewMode === 'worst' && (
        <HardestReportsView
          isLoading={isLoading}
          worstCompanies={worstCompanies}
          totalWithBothRPs={totalWithBothRPs}
          selectedYear={selectedYear}
        />
      )}
    </motion.div>
  );
}
