import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScopeEmissionsData {
  scope12: Array<{
    year: number;
    scope1?: {
      total: number;
      unit: 'tCO2e' | 'tCO2';
    } | null;
    scope2?: {
      mb?: number;        // Market-based scope 2 emissions
      lb?: number;        // Location-based scope 2 emissions  
      unknown?: number;   // Unspecified scope 2 emissions
      unit: 'tCO2e' | 'tCO2';
    } | null;
  }>;
}

interface ScopeEmissionsDisplayProps {
  data: ScopeEmissionsData;
}

function formatNumber(num: number): string {
  return num.toLocaleString('sv-SE');
}

function getTrendIcon(current: number, previous: number) {
  if (current > previous) {
    return <TrendingUp className="w-4 h-4 text-pink-03" />;
  }
  if (current < previous) {
    return <TrendingDown className="w-4 h-4 text-green-03" />;
  }
  return <Minus className="w-4 h-4 text-gray-02" />;
}

function getTrendPercentage(current: number, previous: number): string {
  if (previous === 0) return '';
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}

export function ScopeEmissionsDisplay({ data }: ScopeEmissionsDisplayProps) {
  console.log('ScopeEmissionsDisplay received:', data, 'First year:', data.scope12?.[0]);
  if (!data.scope12 || !Array.isArray(data.scope12) || data.scope12.length === 0) {
    return null;
  }

  // Sort years in descending order (newest first)
  const sortedData = [...data.scope12].sort((a, b) => b.year - a.year);
  const latestYear = sortedData[0];
  const previousYear = sortedData[1];

  const hasScope1 = latestYear.scope1?.total !== undefined;
  const hasScope2 = latestYear.scope2 && (
    latestYear.scope2.mb !== undefined || 
    latestYear.scope2.lb !== undefined || 
    latestYear.scope2.unknown !== undefined
  );

  if (!hasScope1 && !hasScope2) {
    return null;
  }

  // Calculate Scope 2 total for display - use market-based if available, otherwise location-based
  const getScope2Total = (scope2Data: any) => {
    if (!scope2Data) return 0;
    // Prioritize market-based, then location-based, then unknown
    return scope2Data.mb ?? scope2Data.lb ?? scope2Data.unknown ?? 0;
  };

  // Get all available scope 2 values for detailed display
  const getScope2Details = (scope2Data: any) => {
    if (!scope2Data) return [];
    const details = [];
    if (scope2Data.mb !== undefined) details.push({ label: 'Marknadsbaserad', value: scope2Data.mb });
    if (scope2Data.lb !== undefined) details.push({ label: 'Platsbaserad', value: scope2Data.lb });
    if (scope2Data.unknown !== undefined) details.push({ label: 'Ospecificerad', value: scope2Data.unknown });
    return details;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-03/10 rounded-lg p-4 border border-green-03/20"
    >
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 rounded-full bg-green-03/20">
          <Leaf className="w-5 h-5 text-green-03" />
        </div>
        <h3 className="text-lg font-medium text-green-03">
          Växthusgasutsläpp Scope 1 & 2
        </h3>
      </div>

      {/* All years, each as a row of cards */}
      <div className="space-y-6">
        {sortedData.map((yearData, idx) => (
          <div key={yearData.year} className="mb-14">
            {/* Year label area with soft background and left alignment */}
            <div className="flex items-center mb-3 bg-green-900/30 rounded-lg px-4 py-2 w-fit">
              <span className="text-2xl font-extrabold text-white mr-3 drop-shadow-sm">{yearData.year}</span>
              {idx === 0 && (
                <span className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full ml-2 shadow">Senaste år</span>
              )}
            </div>
            {/* Responsive cards container with vertical divider on desktop */}
            <div className="flex flex-col md:flex-row md:items-stretch justify-center gap-4 md:gap-0 mt-2 relative max-w-2xl mx-auto">
              {/* Scope 1 card if present */}
              {yearData.scope1 && (
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 w-full md:flex-1 min-h-[220px] flex flex-col justify-center mr-0 md:mr-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Building2 className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-lg text-gray-900">Scope 1</span>
                  </div>
                  <div className="font-extrabold text-gray-900 text-4xl mb-1">
                    {formatNumber(yearData.scope1.total)}
                  </div>
                  <div className="text-base text-gray-700">
                    {yearData.scope1.unit || 'tCO2e'}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Direkta utsläpp
                  </div>
                </div>
              )}
              {/* Vertical divider on desktop */}
              {yearData.scope1 && yearData.scope2 && (
                <div className="hidden md:block w-0.5 bg-gray-200 mx-2 rounded-full" style={{ minHeight: 180 }} />
              )}
              {/* Scope 2 grouped card if present */}
              {yearData.scope2 && (
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 w-full md:flex-1 min-h-[220px] flex flex-col justify-center ml-0 md:ml-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-lg text-gray-900">Scope 2</span>
                  </div>
                  {/* List all available Scope 2 values */}
                  <div className="space-y-2 mt-2">
                    {yearData.scope2.mb !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-700">Marknadsbaserad</span>
                        <span className="font-extrabold text-gray-900 text-xl">{formatNumber(yearData.scope2.mb)}</span>
                      </div>
                    )}
                    {yearData.scope2.lb !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-700">Platsbaserad</span>
                        <span className="font-extrabold text-gray-900 text-xl">{formatNumber(yearData.scope2.lb)}</span>
                      </div>
                    )}
                    {yearData.scope2.unknown !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-700">Ospecificerad</span>
                        <span className="font-extrabold text-gray-900 text-xl">{formatNumber(yearData.scope2.unknown)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-base text-gray-700 mt-2">
                    {yearData.scope2.unit || 'tCO2e'}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Indirekta utsläpp (el, värme, kyla)
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Expandable raw JSON data */}
      <details className="mt-6 bg-gray-100 rounded p-4 border border-gray-200">
        <summary className="cursor-pointer font-medium text-gray-700 mb-2">Visa rådata (JSON)</summary>
        <pre className="text-xs text-gray-800 overflow-x-auto mt-2">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </motion.div>
  );
}