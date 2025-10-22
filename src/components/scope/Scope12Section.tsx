import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Building2 } from 'lucide-react';

interface Scope12EmissionsData {
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

interface Scope12EmissionsDisplayProps {
  data: Scope12EmissionsData;
}

function formatNumber(num: number | null | undefined): string {
  if (num == null) return '0';
  return num.toLocaleString('sv-SE');
}

interface EmissionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

function EmissionCard({ icon, title, children, className = '' }: EmissionCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 w-full md:flex-1 min-h-[220px] flex flex-col justify-center ${className}`}>
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="font-semibold text-lg text-gray-900">{title}</span>
      </div>
      {children}
    </div>
  );
}

interface Scope2RowProps {
  label: string;
  value: number;
}

function Scope2Row({ label, value }: Scope2RowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-base text-gray-700">{label}</span>
      <span className="font-extrabold text-gray-900 text-xl">{formatNumber(value)}</span>
    </div>
  );
}

interface Scope1CardProps {
  data?: {
    total: number;
    unit: 'tCO2e' | 'tCO2';
  } | null;
}

function Scope1Card({ data }: Scope1CardProps) {
  if (!data) return null;
  
  return (
    <EmissionCard 
      icon={<Building2 className="w-5 h-5 text-orange-600" />}
      title="Scope 1"
      className="mr-0 md:mr-2"
    >
      <div className="font-extrabold text-gray-900 text-4xl mb-1">
        {formatNumber(data.total)}
      </div>
      <div className="text-base text-gray-700">
        {data.unit || 'tCO2e'}
      </div>
      <div className="text-sm text-gray-500 mt-2">
        Direkta utsläpp
      </div>
    </EmissionCard>
  );
}

interface Scope2CardProps {
  data?: {
    mb?: number;
    lb?: number;
    unknown?: number;
    unit: 'tCO2e' | 'tCO2';
  } | null;
}

function Scope2Card({ data }: Scope2CardProps) {
  if (!data) return null;
  
  return (
    <EmissionCard 
      icon={<Building2 className="w-5 h-5 text-blue-600" />}
      title="Scope 2"
      className="ml-0 md:ml-2"
    >
      <div className="space-y-2 mt-2">
        {data.mb != null && (
          <Scope2Row label="Marknadsbaserad" value={data.mb} />
        )}
        {data.lb != null && (
          <Scope2Row label="Platsbaserad" value={data.lb} />
        )}
        {data.unknown != null && (
          <Scope2Row label="Ospecificerad" value={data.unknown} />
        )}
      </div>
      <div className="text-base text-gray-700 mt-2">
        {data.unit || 'tCO2e'}
      </div>
      <div className="text-sm text-gray-500 mt-2">
        Indirekta utsläpp (el, värme, kyla)
      </div>
    </EmissionCard>
  );
}

export function Scope12Section({ data }: Scope12EmissionsDisplayProps) {
  if (!data.scope12 || !Array.isArray(data.scope12) || data.scope12.length === 0) {
    return null;
  }

  // Sort years in descending order (newest first)
  const sortedData = [...data.scope12].sort((a, b) => b.year - a.year);
  const latestYear = sortedData[0];

  const hasScope1 = latestYear.scope1?.total !== undefined;
  const hasScope2 = latestYear.scope2 && (
    latestYear.scope2.mb != null || 
    latestYear.scope2.lb != null || 
    latestYear.scope2.unknown != null
  );

  if (!hasScope1 && !hasScope2) {
    return null;
  }

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
            <div className="flex flex-col md:flex-row md:items-stretch justify-center gap-4 md:gap-0 mt-2 relative max-w-2xl mx-auto">
              <Scope1Card data={yearData.scope1} />
              {yearData.scope1 && yearData.scope2 && (
                <div className="hidden md:block w-0.5 bg-gray-200 mx-2 rounded-full" style={{ minHeight: 180 }} />
              )}
              <Scope2Card data={yearData.scope2} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
