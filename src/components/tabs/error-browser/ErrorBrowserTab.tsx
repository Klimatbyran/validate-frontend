import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, CheckCircle2, AlertTriangle, XCircle, MinusCircle, Calculator, CircleDashed } from 'lucide-react';
import { getPublicApiUrl, cn } from '@/lib/utils';

// Discrepancy types
type DiscrepancyType = 'identical' | 'hallucination' | 'missing' | 'rounding' | 'error' | 'both-null';

// Data point options
const DATA_POINTS = [
  { id: 'stated-total', label: 'Stated Total Emissions' },
  { id: 'calculated-total', label: 'Calculated Total Emissions' },
  { id: 'cat-1', label: 'Cat 1 - Purchased goods & services', category: 1 },
  { id: 'cat-2', label: 'Cat 2 - Capital goods', category: 2 },
  { id: 'cat-3', label: 'Cat 3 - Fuel & energy related', category: 3 },
  { id: 'cat-4', label: 'Cat 4 - Upstream transport', category: 4 },
  { id: 'cat-5', label: 'Cat 5 - Waste', category: 5 },
  { id: 'cat-6', label: 'Cat 6 - Business travel', category: 6 },
  { id: 'cat-7', label: 'Cat 7 - Employee commuting', category: 7 },
  { id: 'cat-8', label: 'Cat 8 - Upstream leased assets', category: 8 },
  { id: 'cat-9', label: 'Cat 9 - Downstream transport', category: 9 },
  { id: 'cat-10', label: 'Cat 10 - Processing of sold products', category: 10 },
  { id: 'cat-11', label: 'Cat 11 - Use of sold products', category: 11 },
  { id: 'cat-12', label: 'Cat 12 - End-of-life treatment', category: 12 },
  { id: 'cat-13', label: 'Cat 13 - Downstream leased assets', category: 13 },
  { id: 'cat-14', label: 'Cat 14 - Franchises', category: 14 },
  { id: 'cat-15', label: 'Cat 15 - Investments', category: 15 },
  { id: 'cat-16', label: 'Cat 16 - Other', category: 16 },
];

interface Company {
  wikidataId: string;
  name: string;
  reportingPeriods?: ReportingPeriod[];
}

interface ReportingPeriod {
  startDate: string;
  endDate: string;
  emissions?: {
    scope3?: {
      statedTotalEmissions?: number | null;
      calculatedTotalEmissions?: number | null;
      categories?: Array<{
        category: number;
        total: number | null;
      }>;
    };
  };
}

interface CompanyRow {
  wikidataId: string;
  name: string;
  stageValue: number | null;
  prodValue: number | null;
  discrepancy: DiscrepancyType;
  diff: number | null;
  inStage: boolean;
  inProd: boolean;
}

// Get API URLs based on environment
function getStageApiUrl(): string {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return '/stagekkapi/api/companies';
  }
  return 'https://stage-api.klimatkollen.se/api/companies';
}

function getProdApiUrl(): string {
  return getPublicApiUrl('/api/companies');
}

// Pick the reporting period for a given year
function pickReportingPeriodForYear(reportingPeriods: ReportingPeriod[] | undefined, year: number): ReportingPeriod | null {
  if (!reportingPeriods || reportingPeriods.length === 0) return null;

  const periodsForYear = reportingPeriods.filter(rp => {
    const endDate = new Date(rp.endDate);
    return endDate.getFullYear() === year;
  });

  if (periodsForYear.length === 0) return null;

  const fullYear = periodsForYear.find(rp => {
    const start = new Date(rp.startDate);
    const end = new Date(rp.endDate);
    return start.getMonth() === 0 && start.getDate() === 1 &&
           end.getMonth() === 11 && end.getDate() === 31;
  });

  return fullYear || periodsForYear[periodsForYear.length - 1];
}

// Get value for a specific scope 3 category
function getCategoryValue(scope3: ReportingPeriod['emissions']['scope3'] | null | undefined, categoryNum: number): number | null {
  if (!scope3?.categories) return null;
  const cat = scope3.categories.find(c => c.category === categoryNum);
  return cat?.total ?? null;
}

// Get value for a data point
function getDataPointValue(scope3: ReportingPeriod['emissions']['scope3'] | null | undefined, dataPointId: string): number | null {
  if (!scope3) return null;

  if (dataPointId === 'stated-total') {
    return scope3.statedTotalEmissions ?? null;
  }
  if (dataPointId === 'calculated-total') {
    return scope3.calculatedTotalEmissions ?? null;
  }

  const dataPoint = DATA_POINTS.find(dp => dp.id === dataPointId);
  if (dataPoint?.category) {
    return getCategoryValue(scope3, dataPoint.category);
  }

  return null;
}

// Classify discrepancy
function classifyDiscrepancy(
  stageValue: number | null,
  prodValue: number | null,
  roundingThreshold: number
): DiscrepancyType {
  const stageHasValue = stageValue !== null && stageValue !== undefined;
  const prodHasValue = prodValue !== null && prodValue !== undefined;

  // Both null = both-null (different from identical)
  if (!stageHasValue && !prodHasValue) return 'both-null';

  // Stage has value but prod doesn't = hallucination
  if (stageHasValue && !prodHasValue) return 'hallucination';

  // Prod has value but stage doesn't = missing
  if (!stageHasValue && prodHasValue) return 'missing';

  // Both have values - compare them
  const diff = Math.abs(stageValue! - prodValue!);
  if (diff === 0) return 'identical';
  if (diff <= roundingThreshold) return 'rounding';
  return 'error';
}

const discrepancyConfig: Record<DiscrepancyType, {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  identical: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Identical',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/20',
  },
  'both-null': {
    icon: <CircleDashed className="w-4 h-4" />,
    label: 'Both Empty',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500/20',
  },
  hallucination: {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Hallucination',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
  },
  missing: {
    icon: <MinusCircle className="w-4 h-4" />,
    label: 'Missing',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/20',
  },
  rounding: {
    icon: <Calculator className="w-4 h-4" />,
    label: 'Rounding',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/20',
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    label: 'Error',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/20',
  },
};

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('sv-SE');
}

export function ErrorBrowserTab() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stageCompanies, setStageCompanies] = React.useState<Company[]>([]);
  const [prodCompanies, setProdCompanies] = React.useState<Company[]>([]);
  const [selectedYear, setSelectedYear] = React.useState(2024);
  const [selectedDataPoint, setSelectedDataPoint] = React.useState('cat-1');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'browser' | 'overview'>('browser');

  // Filter by discrepancy type - which types to show (clickable pills)
  const [visibleTypes, setVisibleTypes] = React.useState<Set<DiscrepancyType>>(
    new Set(['hallucination', 'missing', 'rounding', 'error'])
  );
  const [showMissingCompany, setShowMissingCompany] = React.useState(false);

  const toggleType = (type: DiscrepancyType) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const showOnlyType = (type: DiscrepancyType) => {
    setVisibleTypes(new Set([type]));
  };

  const showAllTypes = () => {
    setVisibleTypes(new Set(['identical', 'both-null', 'hallucination', 'missing', 'rounding', 'error']));
  };

  const showDefaultTypes = () => {
    setVisibleTypes(new Set(['hallucination', 'missing', 'rounding', 'error']));
  };

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stageUrl = getStageApiUrl();
      const prodUrl = getProdApiUrl();


      const [stageResponse, prodResponse] = await Promise.all([
        fetch(stageUrl, { headers: { 'Cache-Control': 'no-cache' } }),
        fetch(prodUrl, { headers: { 'Cache-Control': 'no-cache' } }),
      ]);

      if (!stageResponse.ok) {
        throw new Error(`Failed to fetch stage data: ${stageResponse.status}`);
      }
      if (!prodResponse.ok) {
        throw new Error(`Failed to fetch prod data: ${prodResponse.status}`);
      }

      const stage: Company[] = await stageResponse.json();
      const prod: Company[] = await prodResponse.json();

      setStageCompanies(stage);
      setProdCompanies(prod);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, []);

  // Build comparison rows for selected data point
  const comparisonRows = React.useMemo((): CompanyRow[] => {
    const stageMap = new Map<string, Company>();
    stageCompanies.forEach(c => stageMap.set(c.wikidataId, c));

    const prodMap = new Map<string, Company>();
    prodCompanies.forEach(c => prodMap.set(c.wikidataId, c));

    const allIds = new Set([...stageMap.keys(), ...prodMap.keys()]);
    const rows: CompanyRow[] = [];

    for (const wikidataId of allIds) {
      const stageCompany = stageMap.get(wikidataId);
      const prodCompany = prodMap.get(wikidataId);

      const name = stageCompany?.name || prodCompany?.name || wikidataId;

      const stageRP = stageCompany ? pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear) : null;
      const prodRP = prodCompany ? pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear) : null;

      const stageValue = getDataPointValue(stageRP?.emissions?.scope3, selectedDataPoint);
      const prodValue = getDataPointValue(prodRP?.emissions?.scope3, selectedDataPoint);

      const discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);
      const diff = stageValue !== null && prodValue !== null ? stageValue - prodValue : null;

      rows.push({
        wikidataId,
        name,
        stageValue,
        prodValue,
        discrepancy,
        diff,
        inStage: !!stageCompany,
        inProd: !!prodCompany,
      });
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [stageCompanies, prodCompanies, selectedYear, selectedDataPoint]);

  // Count by discrepancy type and missing company
  const counts = React.useMemo(() => {
    const result = {
      identical: 0,
      'both-null': 0,
      hallucination: 0,
      missing: 0,
      rounding: 0,
      error: 0,
      missingCompany: 0, // company only in one API
    };
    for (const row of comparisonRows) {
      result[row.discrepancy]++;
      if (!row.inStage || !row.inProd) {
        result.missingCompany++;
      }
    }
    return result;
  }, [comparisonRows]);

  // Filter rows
  const filteredRows = React.useMemo(() => {
    let rows = comparisonRows;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.wikidataId.toLowerCase().includes(query)
      );
    }

    // Filter by discrepancy type
    rows = rows.filter(r => visibleTypes.has(r.discrepancy));

    // Filter out companies that only exist in one API
    if (!showMissingCompany) {
      rows = rows.filter(r => r.inStage && r.inProd);
    }

    return rows;
  }, [comparisonRows, searchQuery, visibleTypes, showMissingCompany]);

  // Export to CSV
  const exportToCsv = () => {
    const headers = ['Company', 'WikidataId', 'Stage', 'Prod', 'Diff', 'Status', 'In Stage', 'In Prod'];
    const csvRows = [headers.join(',')];

    for (const row of filteredRows) {
      csvRows.push([
        `"${row.name.replace(/"/g, '""')}"`,
        row.wikidataId,
        row.stageValue ?? '',
        row.prodValue ?? '',
        row.diff ?? '',
        row.discrepancy,
        row.inStage ? 'yes' : 'no',
        row.inProd ? 'yes' : 'no',
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

  // Calculate metrics for ALL data points (for overview chart)
  const allDataPointMetrics = React.useMemo(() => {
    if (stageCompanies.length === 0 || prodCompanies.length === 0) return [];

    const stageMap = new Map<string, Company>();
    stageCompanies.forEach(c => stageMap.set(c.wikidataId, c));

    const prodMap = new Map<string, Company>();
    prodCompanies.forEach(c => prodMap.set(c.wikidataId, c));

    const allIds = Array.from(new Set([...stageMap.keys(), ...prodMap.keys()]));

    return DATA_POINTS.map(dp => {
      let identical = 0;
      let rounding = 0;
      let hallucination = 0;
      let missing = 0;
      let errorCount = 0;
      let bothNull = 0;

      for (const wikidataId of allIds) {
        const stageCompany = stageMap.get(wikidataId);
        const prodCompany = prodMap.get(wikidataId);

        // Only count companies in both
        if (!stageCompany || !prodCompany) continue;

        const stageRP = pickReportingPeriodForYear(stageCompany.reportingPeriods, selectedYear);
        const prodRP = pickReportingPeriodForYear(prodCompany.reportingPeriods, selectedYear);

        const stageValue = getDataPointValue(stageRP?.emissions?.scope3, dp.id);
        const prodValue = getDataPointValue(prodRP?.emissions?.scope3, dp.id);

        const discrepancy = classifyDiscrepancy(stageValue, prodValue, 0.5);

        switch (discrepancy) {
          case 'identical': identical++; break;
          case 'rounding': rounding++; break;
          case 'hallucination': hallucination++; break;
          case 'missing': missing++; break;
          case 'error': errorCount++; break;
          case 'both-null': bothNull++; break;
        }
      }

      const withAnyData = identical + rounding + hallucination + missing + errorCount;
      const tolerantSuccess = identical + rounding;
      const tolerantRate = withAnyData > 0 ? (tolerantSuccess / withAnyData) * 100 : 0;

      return {
        id: dp.id,
        label: dp.label,
        shortLabel: dp.category ? `Cat ${dp.category}` : (dp.id === 'stated-total' ? 'Stated' : 'Calc'),
        tolerantRate,
        tolerantSuccess,
        withAnyData,
        breakdown: { identical, rounding, hallucination, missing, error: errorCount, bothNull },
      };
    });
  }, [stageCompanies, prodCompanies, selectedYear]);

  // Calculate accuracy metrics (only for companies that exist in both APIs)
  const metrics = React.useMemo(() => {
    // Only companies that exist in BOTH stage and prod
    const bothExist = comparisonRows.filter(r => r.inStage && r.inProd);

    if (bothExist.length === 0) return null;

    const identical = bothExist.filter(r => r.discrepancy === 'identical').length;
    const rounding = bothExist.filter(r => r.discrepancy === 'rounding').length;
    const bothNull = bothExist.filter(r => r.discrepancy === 'both-null').length;
    const hallucination = bothExist.filter(r => r.discrepancy === 'hallucination').length;
    const missing = bothExist.filter(r => r.discrepancy === 'missing').length;
    const errorCount = bothExist.filter(r => r.discrepancy === 'error').length;

    // Total companies in both environments
    const totalCompanies = bothExist.length;

    // Companies where EITHER prod OR stage has data (catches hallucinations + missing + errors)
    const withAnyData = identical + rounding + hallucination + missing + errorCount;

    return {
      totalCompanies,
      withAnyData,
      // Exact Match: identical / withAnyData
      exactMatch: {
        success: identical,
        total: withAnyData,
        rate: withAnyData > 0 ? (identical / withAnyData) * 100 : 0,
        label: 'Exact Match',
        excludes: 'Nothing',
      },
      // Precision-Tolerant: (identical + rounding) / withAnyData
      tolerant: {
        success: identical + rounding,
        total: withAnyData,
        rate: withAnyData > 0 ? ((identical + rounding) / withAnyData) * 100 : 0,
        label: 'Precision-Tolerant',
        excludes: 'Rounding (≤0.5)',
      },
      // Non-Hallucinated: (withAnyData - hallucination) / withAnyData
      nonHallucinated: {
        success: withAnyData - hallucination,
        total: withAnyData,
        rate: withAnyData > 0 ? ((withAnyData - hallucination) / withAnyData) * 100 : 0,
        label: 'Non-Hallucinated',
        excludes: 'Only hallucinations',
      },
      // Zero-Inclusive: (identical + rounding + bothNull) / totalCompanies
      // Gives credit when both correctly have no data
      zeroInclusive: {
        success: identical + rounding + bothNull,
        total: totalCompanies,
        rate: totalCompanies > 0 ? ((identical + rounding + bothNull) / totalCompanies) * 100 : 0,
        label: 'Zero-Inclusive',
        excludes: 'Rounding + both empty is correct',
      },
      // Breakdown for reference
      breakdown: { identical, rounding, bothNull, hallucination, missing, error: errorCount },
    };
  }, [comparisonRows]);

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
              Compare Scope 3 data between Stage and Prod APIs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-02/20">
              <button
                onClick={() => setViewMode('browser')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  viewMode === 'browser'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-03 text-gray-02 hover:text-gray-01'
                )}
              >
                Browser
              </button>
              <button
                onClick={() => setViewMode('overview')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  viewMode === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-03 text-gray-02 hover:text-gray-01'
                )}
              >
                Overview
              </button>
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportToCsv}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Year selector - always visible */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-02 uppercase tracking-wide">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-gray-03 text-gray-01 rounded px-3 py-2 text-sm border border-gray-02/20"
            >
              {[2024, 2023, 2022, 2021, 2020].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Browser-only: Data point selector and search */}
          {viewMode === 'browser' && (
            <>
              <div className="flex flex-col gap-1 flex-1 max-w-md">
                <label className="text-xs text-gray-02 uppercase tracking-wide">Data Point</label>
                <select
                  value={selectedDataPoint}
                  onChange={(e) => setSelectedDataPoint(e.target.value)}
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
            </>
          )}
        </div>

        {/* Browser view: Performance Metrics */}
        {viewMode === 'browser' && !isLoading && metrics && (
          <div className="mt-4 pt-4 border-t border-gray-03/50">
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
                  <tr className={cn(
                    'border-t border-gray-03/30',
                    metrics.zeroInclusive.rate >= 85 ? 'bg-green-500/20' : metrics.zeroInclusive.rate >= 70 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  )}>
                    <td className="pr-4 py-2 font-medium">{metrics.zeroInclusive.label}</td>
                    <td className="px-4 py-2 text-right font-mono">{metrics.zeroInclusive.success}/{metrics.zeroInclusive.total}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{metrics.zeroInclusive.rate.toFixed(1)}%</td>
                    <td className="pl-4 py-2 text-gray-02 text-xs">{metrics.zeroInclusive.excludes}</td>
                  </tr>
                  <tr className={cn(
                    'border-t border-gray-03/30',
                    metrics.tolerant.rate >= 85 ? 'bg-green-500/20' : metrics.tolerant.rate >= 70 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  )}>
                    <td className="pr-4 py-2 font-medium">{metrics.tolerant.label}</td>
                    <td className="px-4 py-2 text-right font-mono">{metrics.tolerant.success}/{metrics.tolerant.total}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{metrics.tolerant.rate.toFixed(1)}%</td>
                    <td className="pl-4 py-2 text-gray-02 text-xs">{metrics.tolerant.excludes}</td>
                  </tr>
                  <tr className={cn(
                    'border-t border-gray-03/30',
                    metrics.exactMatch.rate >= 85 ? 'bg-green-500/20' : metrics.exactMatch.rate >= 70 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  )}>
                    <td className="pr-4 py-2 font-medium">{metrics.exactMatch.label}</td>
                    <td className="px-4 py-2 text-right font-mono">{metrics.exactMatch.success}/{metrics.exactMatch.total}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{metrics.exactMatch.rate.toFixed(1)}%</td>
                    <td className="pl-4 py-2 text-gray-02 text-xs">{metrics.exactMatch.excludes}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Browser view: Filter pills */}
        {viewMode === 'browser' && !isLoading && comparisonRows.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-03/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-02 uppercase tracking-wide">Filter by type:</span>
              <button
                onClick={showDefaultTypes}
                className="text-xs text-gray-02 hover:text-gray-01 underline"
              >
                Reset
              </button>
              <button
                onClick={showAllTypes}
                className="text-xs text-gray-02 hover:text-gray-01 underline"
              >
                Show all
              </button>
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      showOnlyType(type);
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
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs font-bold',
                      isActive ? 'bg-white/10' : 'bg-white/5'
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Missing company toggle */}
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

        {/* Overview view: Bar chart */}
        {viewMode === 'overview' && !isLoading && allDataPointMetrics.length > 0 && (() => {
          // Split into Scope 3 categories (1-15) and Other (stated/calculated + cat-16)
          const scope3Metrics = allDataPointMetrics.filter(dp =>
            dp.id.startsWith('cat-') && dp.id !== 'cat-16'
          );
          const otherMetrics = allDataPointMetrics.filter(dp =>
            !dp.id.startsWith('cat-') || dp.id === 'cat-16'
          );

          // Calculate Scope 3 aggregate metrics across all categories
          const scope3Totals = scope3Metrics.reduce((acc, dp) => {
            acc.identical += dp.breakdown.identical;
            acc.rounding += dp.breakdown.rounding;
            acc.hallucination += dp.breakdown.hallucination;
            acc.missing += dp.breakdown.missing;
            acc.error += dp.breakdown.error;
            acc.bothNull += dp.breakdown.bothNull;
            acc.withAnyData += dp.withAnyData;
            acc.totalCompanies += dp.breakdown.identical + dp.breakdown.rounding + dp.breakdown.hallucination + dp.breakdown.missing + dp.breakdown.error + dp.breakdown.bothNull;
            return acc;
          }, { identical: 0, rounding: 0, hallucination: 0, missing: 0, error: 0, bothNull: 0, withAnyData: 0, totalCompanies: 0 });

          const scope3Aggregates = {
            exactMatch: scope3Totals.withAnyData > 0
              ? (scope3Totals.identical / scope3Totals.withAnyData) * 100 : 0,
            tolerant: scope3Totals.withAnyData > 0
              ? ((scope3Totals.identical + scope3Totals.rounding) / scope3Totals.withAnyData) * 100 : 0,
            nonHallucinated: scope3Totals.withAnyData > 0
              ? ((scope3Totals.withAnyData - scope3Totals.hallucination) / scope3Totals.withAnyData) * 100 : 0,
            zeroInclusive: scope3Totals.totalCompanies > 0
              ? ((scope3Totals.identical + scope3Totals.rounding + scope3Totals.bothNull) / scope3Totals.totalCompanies) * 100 : 0,
          };

          const renderBar = (dp: typeof allDataPointMetrics[0]) => {
            const rate = dp.tolerantRate;
            const barColor = rate >= 85 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-500';
            const bgColor = rate >= 85 ? 'bg-green-500/10' : rate >= 70 ? 'bg-yellow-500/10' : 'bg-red-500/10';

            return (
              <div
                key={dp.id}
                className={cn('rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity', bgColor)}
                onClick={() => {
                  setSelectedDataPoint(dp.id);
                  setViewMode('browser');
                }}
                title={`Click to view ${dp.label} in browser`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-01">{dp.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-02">{dp.tolerantSuccess}/{dp.withAnyData}</span>
                    <span className="text-sm font-bold text-gray-01">{rate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-03/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${rate}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', barColor)}
                  />
                </div>
                {dp.withAnyData > 0 && (
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-02">
                    <span className="text-green-400">{dp.breakdown.identical} identical</span>
                    <span className="text-yellow-400">{dp.breakdown.rounding} rounding</span>
                    <span className="text-purple-400">{dp.breakdown.hallucination} halluc.</span>
                    <span className="text-orange-400">{dp.breakdown.missing} missing</span>
                    <span className="text-red-400">{dp.breakdown.error} error</span>
                  </div>
                )}
              </div>
            );
          };

          return (
            <div className="mt-4 pt-4 border-t border-gray-03/50 space-y-6">
              {/* Scope 3 Categories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-01 mb-3">Scope 3 Categories ({selectedYear})</h3>

                {/* Aggregate metrics summary */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Avg Zero-Inclusive', rate: scope3Aggregates.zeroInclusive },
                    { label: 'Avg Precision-Tolerant', rate: scope3Aggregates.tolerant },
                    { label: 'Avg Exact Match', rate: scope3Aggregates.exactMatch },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className={cn(
                        'rounded-lg p-3 text-center',
                        metric.rate >= 85 ? 'bg-green-500/10' : metric.rate >= 70 ? 'bg-yellow-500/10' : 'bg-red-500/10'
                      )}
                    >
                      <div className="text-xs text-gray-02 mb-1">{metric.label}</div>
                      <div className={cn(
                        'text-lg font-bold',
                        metric.rate >= 85 ? 'text-green-400' : metric.rate >= 70 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {metric.rate.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {scope3Metrics.map(renderBar)}
                </div>
              </div>

              {/* Other metrics */}
              {otherMetrics.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-01 mb-3">Other</h3>
                  <div className="space-y-2">
                    {otherMetrics.map(renderBar)}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Browser view: Table */}
      {viewMode === 'browser' && (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-02 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-02 uppercase tracking-wider">
                    Prod (Truth)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-02 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-02 uppercase tracking-wider">
                    Diff
                  </th>
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
                  filteredRows.map((row, index) => {
                    const config = discrepancyConfig[row.discrepancy];
                    const isMissingCompany = !row.inStage || !row.inProd;
                    return (
                      <motion.tr
                        key={row.wikidataId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.01, 0.5) }}
                        className={cn('transition-colors hover:bg-gray-03/30', config.bgColor)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-01 text-sm">{row.name}</div>
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
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            config.bgColor,
                            config.textColor
                          )}>
                            {config.icon}
                            {config.label}
                          </span>
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
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with count */}
        {!isLoading && !error && (
          <div className="px-4 py-3 bg-gray-03/30 text-sm text-gray-02 border-t border-gray-03/50">
            Showing {filteredRows.length} of {comparisonRows.length} companies for <strong className="text-gray-01">{selectedDataPointLabel}</strong> ({selectedYear})
          </div>
        )}
        </div>
      )}
    </motion.div>
  );
}
