import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Building2, CheckCircle2 } from 'lucide-react';
import { getPublicApiUrl } from '@/lib/utils';
import { CopyJsonButton } from './CopyJsonButton';

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
  wikidataId?: string;
}

type Scope12ReferenceSnapshot = {
  scope1?: { total: number | null; unit: string | null } | null;
  scope2?: { mb?: number | null; lb?: number | null; unknown?: number | null; unit: string | null } | null;
} | null;

async function fetchCompanyById(companyId: string, signal: AbortSignal) {
  const response = await fetch(
    getPublicApiUrl(`/api/companies/${encodeURIComponent(companyId)}`),
    { signal }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function getReportingPeriods(company: any) {
  return Array.isArray(company?.reportingPeriods) ? company.reportingPeriods : [];
}

function findPeriodEndingInYear(periods: any[], year: number) {
  return periods.find((period: any) => {
    const endDate = period?.endDate ? new Date(period.endDate) : null;
    return endDate && endDate.getFullYear() === year;
  });
}

function buildReferenceSnapshotFromPeriod(period: any): Scope12ReferenceSnapshot {
  if (!period?.emissions) return null;
  const s1 = period.emissions.scope1;
  const s2 = period.emissions.scope2;
  return {
    scope1: s1
      ? {
          total: typeof s1.total === 'number' ? s1.total : (s1.total ?? null),
          unit: s1.unit ?? null,
        }
      : null,
    scope2: s2
      ? {
          mb: s2.mb ?? null,
          lb: s2.lb ?? null,
          unknown: s2.unknown ?? null,
          unit: s2.unit ?? null,
        }
      : null,
  };
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

export function Scope12Section({ data, wikidataId }: Scope12EmissionsDisplayProps) {
  if (!data.scope12 || !Array.isArray(data.scope12) || data.scope12.length === 0) {
    return null;
  }

  // Sort years in descending order (newest first)
  const sortedData = [...data.scope12].sort((a, b) => b.year - a.year);
  const latestYear = sortedData[0];
  const years = React.useMemo(() => Array.from(new Set(sortedData.map(e => e.year))), [sortedData]);
  const yearsKey = React.useMemo(() => years.join(','), [years]);

  const [referenceByYear, setReferenceByYear] = React.useState<Record<number, Scope12ReferenceSnapshot>>({});
  const [isLoadingRef, setIsLoadingRef] = React.useState(false);
  const [refError, setRefError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!wikidataId || years.length === 0) return;
    const abortController = new AbortController();
    let isMounted = true;
    async function fetchReferencesForYears(companyId: string, ys: number[]) {
      setIsLoadingRef(true);
      setRefError(null);
      try {
        const company = await fetchCompanyById(companyId, abortController.signal);
        const periods = getReportingPeriods(company);
        const nextMap: Record<number, Scope12ReferenceSnapshot> = {};
        for (const y of ys) {
          const period = findPeriodEndingInYear(periods, y);
          nextMap[y] = buildReferenceSnapshotFromPeriod(period);
        }
        if (isMounted) {
          setReferenceByYear(nextMap);
          setIsLoadingRef(false);
        }
      } catch (e: any) {
        if (isMounted && e?.name !== 'AbortError') {
          setRefError(e?.message || 'Kunde inte hämta referensdata');
          setIsLoadingRef(false);
        }
      }
    }
    fetchReferencesForYears(wikidataId, years);
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [wikidataId, yearsKey]);

  const hasScope1 = latestYear.scope1?.total !== undefined;
  const hasScope2 = latestYear.scope2 && (
    latestYear.scope2.mb != null || 
    latestYear.scope2.lb != null || 
    latestYear.scope2.unknown != null
  );

  if (!hasScope1 && !hasScope2) {
    return null;
  }

  function renderRefPanel() {
    if (!wikidataId) return null;
    const latest = latestYear?.year;
    if (!latest) return null;
    const snapshot = referenceByYear[latest];
    if (!snapshot) return (
      <div className="bg-green-700 border border-green-800 rounded-xl p-4 mb-4">
        {isLoadingRef && <div className="text-sm text-white">Hämtar…</div>}
        {!isLoadingRef && refError && <div className="text-sm text-white">{refError}</div>}
      </div>
    );
    const ourS1 = latestYear.scope1;
    const ourS2 = latestYear.scope2;
    const s1Match = (ourS1?.total ?? null) === (snapshot.scope1?.total ?? null);
    const s2MbMatch = (ourS2?.mb ?? null) === (snapshot.scope2?.mb ?? null);
    const s2LbMatch = (ourS2?.lb ?? null) === (snapshot.scope2?.lb ?? null);
    const s2UnknownMatch = (ourS2?.unknown ?? null) === (snapshot.scope2?.unknown ?? null);
    return (
      <div className="bg-green-700 border border-green-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">Referensvärden ({latest}) från API i prod</span>
        </div>
        {isLoadingRef && <div className="text-sm text-white">Hämtar…</div>}
        {!isLoadingRef && refError && <div className="text-sm text-white">{refError}</div>}
        {!isLoadingRef && !refError && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Scope 1 totalt</span>
              <span className="text-base font-bold text-white flex items-center gap-2">
                {typeof snapshot.scope1?.total === 'number' ? snapshot.scope1.total.toLocaleString('sv-SE') : '—'}
                {snapshot.scope1?.unit ? ` ${snapshot.scope1.unit}` : ''}
                {(ourS1?.total !== undefined || snapshot.scope1?.total != null) && (
                  s1Match ? <span className="text-green-700">✓</span> : <span className="text-red-600">✗</span>
                )}
              </span>
            </div>
            <div className="divide-y divide-green-500/40">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white">Scope 2 marknadsbaserad</span>
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  {typeof snapshot.scope2?.mb === 'number' ? snapshot.scope2.mb!.toLocaleString('sv-SE') : '—'}{snapshot.scope2?.unit ? ` ${snapshot.scope2.unit}` : ''}
                  {s2MbMatch ? <span className="text-green-400">✓</span> : <span className="text-red-300">✗</span>}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white">Scope 2 platsbaserad</span>
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  {typeof snapshot.scope2?.lb === 'number' ? snapshot.scope2.lb!.toLocaleString('sv-SE') : '—'}{snapshot.scope2?.unit ? ` ${snapshot.scope2.unit}` : ''}
                  {s2LbMatch ? <span className="text-green-400">✓</span> : <span className="text-red-300">✗</span>}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white">Scope 2 ospecificerad</span>
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  {typeof snapshot.scope2?.unknown === 'number' ? snapshot.scope2.unknown!.toLocaleString('sv-SE') : '—'}{snapshot.scope2?.unit ? ` ${snapshot.scope2.unit}` : ''}
                  {s2UnknownMatch ? <span className="text-green-400">✓</span> : <span className="text-red-300">✗</span>}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-03/10 rounded-lg p-4 border border-green-03/20"
    >
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 rounded-full bg-green-600">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-medium text-white">
          Växthusgasutsläpp Scope 1 & 2
        </h3>
      </div>

      {renderRefPanel()}

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
            {/* Inline match indicators for this year if reference exists */}
            {referenceByYear[yearData.year] && (
              <div className="mt-2 max-w-2xl mx-auto text-xs text-gray-700">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">Jämförelse:</span>
                  <span className="flex items-center gap-1">
                    <span>Scope 1</span>
                    {((yearData.scope1?.total ?? null) === (referenceByYear[yearData.year]?.scope1?.total ?? null))
                      ? <span className="text-green-700">✓</span>
                      : <span className="text-red-600">✗</span>}
                  </span>
                  {yearData.scope2?.mb != null && (
                    <span className="flex items-center gap-1">
                      <span>Scope 2 MB</span>
                      {((yearData.scope2?.mb ?? null) === (referenceByYear[yearData.year]?.scope2?.mb ?? null))
                        ? <span className="text-green-700">✓</span>
                        : <span className="text-red-600">✗</span>}
                    </span>
                  )}
                  {yearData.scope2?.lb != null && (
                    <span className="flex items-center gap-1">
                      <span>Scope 2 LB</span>
                      {((yearData.scope2?.lb ?? null) === (referenceByYear[yearData.year]?.scope2?.lb ?? null))
                        ? <span className="text-green-700">✓</span>
                        : <span className="text-red-600">✗</span>}
                    </span>
                  )}
                  {yearData.scope2?.unknown != null && (
                    <span className="flex items-center gap-1">
                      <span>Scope 2 Ospec</span>
                      {((yearData.scope2?.unknown ?? null) === (referenceByYear[yearData.year]?.scope2?.unknown ?? null))
                        ? <span className="text-green-700">✓</span>
                        : <span className="text-red-600">✗</span>}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <details className="mt-6 bg-gray-100 rounded p-4 border border-gray-200">
        <summary className="cursor-pointer font-medium text-gray-700 mb-2">Visa rådata (JSON)</summary>
        <div className="flex justify-end">
          <CopyJsonButton getText={() => JSON.stringify(data, null, 2)} />
        </div>
        <pre className="text-xs text-gray-800 overflow-x-auto mt-2">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </motion.div>
  );
}
