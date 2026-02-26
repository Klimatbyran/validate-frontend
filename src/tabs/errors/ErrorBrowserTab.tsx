import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import { LoadingSpinner } from '@/ui/loading-spinner';
import { SingleSelectDropdown } from '@/ui/single-select-dropdown';
import type { ErrorBrowserViewMode } from './types';
import { useErrorBrowserData } from './hooks/useErrorBrowserData';
import { BrowserView } from './components/BrowserView';
import { OverviewView } from './components/OverviewView';
import { HardestReportsView } from './components/HardestReportsView';

const VIEW_MODES: ErrorBrowserViewMode[] = ['browser', 'overview', 'worst'];

export function ErrorBrowserTab() {
  const { t } = useI18n();
  const [selectedYear, setSelectedYear] = React.useState(2024);
  const [selectedDataPoint, setSelectedDataPoint] = React.useState('cat-1');
  const [viewMode, setViewMode] = React.useState<ErrorBrowserViewMode>('browser');

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
      {/* Header: relative z-10 so year dropdown panel paints above view content below */}
      <div className="relative z-10 bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl text-gray-01 font-semibold">{t("errors.title")}</h2>
            <p className="text-sm text-gray-02 mt-1">
              {t("errors.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full overflow-hidden border border-gray-02/20 bg-gray-04/50 p-1">
              {VIEW_MODES.map((mode) => (
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
                  {mode === 'browser' ? t("errors.browser") : mode === 'overview' ? t("errors.overviewTab") : t("errors.hardestReports")}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-04 text-white rounded-full hover:bg-blue-04/90 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {t("common.refresh")}
            </button>
          </div>
        </div>

        {/* Year selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-02 uppercase tracking-wide">{t("errors.year")}</label>
          <SingleSelectDropdown
            options={['2025', '2024', '2023', '2022', '2021', '2020']}
            value={String(selectedYear)}
            onChange={(v) => setSelectedYear(Number(v))}
            placeholder={t("errors.year")}
            ariaLabel={t("errors.year")}
            panelMinWidth={100}
          />
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

      {viewMode === 'overview' && (
        isLoading ? (
          <div className="flex justify-center items-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
            <LoadingSpinner label={t("errors.loadingOverview")} />
          </div>
        ) : (
          <OverviewView
            allDataPointMetrics={allDataPointMetrics}
            selectedYear={selectedYear}
            onSelectDataPoint={handleOverviewSelectDataPoint}
          />
        )
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
