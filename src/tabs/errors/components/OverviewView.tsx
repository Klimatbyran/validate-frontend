import React from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { DataPointMetric } from '../types';
import { calculateOverviewAggregates, exportOverviewCsv } from '../lib';
import { DataPointBar, OverviewSection, ScopeSection, ScopeSummary } from '../overview';
import type { ErrorBrowserSummaryStats } from './SummaryView';
import { SummaryView } from './SummaryView';

interface OverviewViewProps {
  allDataPointMetrics: DataPointMetric[];
  selectedYear: number;
  onSelectDataPoint: (dataPointId: string) => void;
  stats: ErrorBrowserSummaryStats;
}

export function OverviewView({ allDataPointMetrics, selectedYear, onSelectDataPoint, stats }: OverviewViewProps) {
  const { t } = useI18n();
  if (allDataPointMetrics.length === 0) return null;

  const [view, setView] = React.useState<'graphic' | 'table'>('graphic');

  if (view === 'table') {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="inline-flex rounded-full bg-gray-03/60 p-1 border border-gray-02/15">
            <button
              onClick={() => setView('graphic')}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-02 hover:text-gray-01 hover:bg-gray-03 transition-colors"
            >
              {t("errors.overview.viewGraphic")}
            </button>
            <button
              onClick={() => setView('table')}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-02/40 text-gray-01"
            >
              {t("errors.overview.viewTable")}
            </button>
          </div>
        </div>
        <SummaryView selectedYear={selectedYear} allDataPointMetrics={allDataPointMetrics} stats={stats} />
      </div>
    );
  }

  const scope1Metrics = allDataPointMetrics.filter((dp) => dp.id.startsWith('scope1-'));
  const scope2Metrics = allDataPointMetrics.filter((dp) => dp.id.startsWith('scope2-'));
  const scope3Metrics = allDataPointMetrics.filter((dp) => dp.id.startsWith('cat-') && dp.id !== 'cat-16');
  const otherMetrics = allDataPointMetrics.filter(
    (dp) =>
      dp.id === 'cat-16' ||
      dp.id === 'scope3-stated-total' ||
      dp.id === 'scope3-calculated-total' ||
      dp.id === 'stated-total' ||
      dp.id === 'calculated-total'
  );

  const scope1Aggregates = calculateOverviewAggregates(scope1Metrics);
  const scope2Aggregates = calculateOverviewAggregates(scope2Metrics);
  const scope3Aggregates = calculateOverviewAggregates(scope3Metrics);
  const scope12Aggregates = calculateOverviewAggregates([...scope1Metrics, ...scope2Metrics]);
  const allScopesAggregates = calculateOverviewAggregates([
    ...scope1Metrics,
    ...scope2Metrics,
    ...scope3Metrics,
  ]);

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="inline-flex rounded-full bg-gray-03/60 p-1 border border-gray-02/15">
          <button
            onClick={() => setView('graphic')}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-02/40 text-gray-01"
          >
            {t("errors.overview.viewGraphic")}
          </button>
          <button
            onClick={() => setView('table')}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-02 hover:text-gray-01 hover:bg-gray-03 transition-colors"
          >
            {t("errors.overview.viewTable")}
          </button>
        </div>

        <button
          onClick={() => exportOverviewCsv(allDataPointMetrics, selectedYear)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-03 text-gray-01 rounded-lg hover:bg-gray-02 hover:text-white transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          {t("errors.overview.exportCsv")}
        </button>
      </div>

      <div className="space-y-0">
        {scope1Metrics.length > 0 && (
          <OverviewSection isFirst>
            <ScopeSection
              title={t("errors.overview.scope1Title", { year: selectedYear })}
              aggregates={scope1Aggregates}
              metrics={scope1Metrics}
              onSelectDataPoint={onSelectDataPoint}
            />
          </OverviewSection>
        )}

        {scope2Metrics.length > 0 && (
          <OverviewSection>
            <ScopeSection
              title={t("errors.overview.scope2Title", { year: selectedYear })}
              aggregates={scope2Aggregates}
              metrics={scope2Metrics}
              onSelectDataPoint={onSelectDataPoint}
            />
          </OverviewSection>
        )}

        {scope3Metrics.length > 0 && (
          <OverviewSection>
            <ScopeSection
              title={t("errors.overview.scope3Title", { year: selectedYear })}
              aggregates={scope3Aggregates}
              metrics={scope3Metrics}
              onSelectDataPoint={onSelectDataPoint}
            />
          </OverviewSection>
        )}

        {otherMetrics.length > 0 && (
          <OverviewSection>
            <h3 className="text-sm font-semibold text-gray-01 mb-3">{t("errors.overview.other")}</h3>
            <div className="space-y-2">
              {otherMetrics.map((dp) => (
                <DataPointBar key={dp.id} dp={dp} onSelect={onSelectDataPoint} />
              ))}
            </div>
          </OverviewSection>
        )}

        {allScopesAggregates.totals.withAnyData > 0 && (
          <OverviewSection>
            <ScopeSummary
              title={t("errors.overview.overallScope123", { year: selectedYear })}
              categoryCount={[...scope1Metrics, ...scope2Metrics, ...scope3Metrics].length}
              aggregates={allScopesAggregates}
            />
          </OverviewSection>
        )}

        {scope12Aggregates.totals.withAnyData > 0 && (
          <OverviewSection>
            <ScopeSummary
              title={t("errors.overview.overallScope12", { year: selectedYear })}
              categoryCount={[...scope1Metrics, ...scope2Metrics].length}
              aggregates={scope12Aggregates}
            />
          </OverviewSection>
        )}
      </div>
    </div>
  );
}
