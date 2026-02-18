import React from 'react';
import { motion } from 'framer-motion';
import { Banknote, Users, CheckCircle2 } from 'lucide-react';
import { getPublicApiUrl } from '@/lib/utils';
import { CopyJsonButton } from './CopyJsonButton';

interface EconomyEntry {
  year: number;
  economy: {
    turnover?: {
      value: number | null;
      currency: string | null;
    } | null;
    employees?: {
      value: number | null;
      unit: string | null;
    } | null;
  } | null;
}

interface EconomyDisplayData {
  economy: EconomyEntry[];
}

interface EconomySectionProps {
  data: EconomyDisplayData;
  wikidataId?: string;
}

type EconomyReferenceSnapshot = {
  turnover?: { value: number | null; currency: string | null } | null;
  employees?: { value: number | null; unit: string | null } | null;
} | null;

function formatNumber(num: number | null | undefined): string {
  if (num == null) return '—';
  return num.toLocaleString('sv-SE');
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return '—';
  const formatted = value.toLocaleString('sv-SE');
  return currency ? `${formatted} ${currency}` : formatted;
}

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

function buildReferenceSnapshotFromPeriod(period: any): EconomyReferenceSnapshot {
  if (!period?.economy) return null;
  const eco = period.economy;
  return {
    turnover: eco.turnover
      ? { value: eco.turnover.value ?? null, currency: eco.turnover.currency ?? null }
      : null,
    employees: eco.employees
      ? { value: eco.employees.value ?? null, unit: eco.employees.unit ?? null }
      : null,
  };
}

interface EconomyCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

function EconomyCard({ icon, title, children, className = '' }: EconomyCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 w-full md:flex-1 min-h-[180px] flex flex-col justify-center ${className}`}>
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="font-semibold text-lg text-gray-900">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function EconomySection({ data, wikidataId }: EconomySectionProps) {
  if (!data.economy || !Array.isArray(data.economy) || data.economy.length === 0) {
    return null;
  }

  const sortedData = [...data.economy].sort((a, b) => b.year - a.year);
  const latestYear = sortedData[0];
  const years = React.useMemo(() => Array.from(new Set(sortedData.map(e => e.year))), [sortedData]);
  const yearsKey = React.useMemo(() => years.join(','), [years]);

  const [referenceByYear, setReferenceByYear] = React.useState<Record<number, EconomyReferenceSnapshot>>({});
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
        const nextMap: Record<number, EconomyReferenceSnapshot> = {};
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

  function renderRefPanel() {
    if (!wikidataId) return null;
    const latest = latestYear?.year;
    if (!latest) return null;
    const snapshot = referenceByYear[latest];
    if (!snapshot) return (
      <div className="bg-blue-700 border border-blue-800 rounded-xl p-4 mb-4">
        {isLoadingRef && <div className="text-sm text-white">Hämtar…</div>}
        {!isLoadingRef && refError && <div className="text-sm text-white">{refError}</div>}
      </div>
    );

    const ourEconomy = latestYear.economy;
    const ourTurnover = ourEconomy?.turnover?.value ?? null;
    const ourEmployees = ourEconomy?.employees?.value ?? null;
    const prodTurnover = snapshot.turnover?.value ?? null;
    const prodEmployees = snapshot.employees?.value ?? null;

    const turnoverMatch = ourTurnover != null && prodTurnover != null ? ourTurnover === prodTurnover : null;
    const employeesMatch = ourEmployees != null && prodEmployees != null ? ourEmployees === prodEmployees : null;

    if (turnoverMatch == null && employeesMatch == null) return null;

    return (
      <div className="bg-blue-700 border border-blue-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">Referensvärden ({latest}) från API i prod</span>
        </div>
        {isLoadingRef && <div className="text-sm text-white">Hämtar…</div>}
        {!isLoadingRef && refError && <div className="text-sm text-white">{refError}</div>}
        {!isLoadingRef && !refError && (
          <div className="divide-y divide-blue-500/40">
            {ourTurnover != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white">Omsättning</span>
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  {formatCurrency(prodTurnover, snapshot.turnover?.currency)}
                  {turnoverMatch != null && (turnoverMatch ? <span className="text-green-400">✓</span> : <span className="text-red-300">✗</span>)}
                </span>
              </div>
            )}
            {ourEmployees != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white">Anställda</span>
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  {formatNumber(prodEmployees)} {snapshot.employees?.unit ?? ''}
                  {employeesMatch != null && (employeesMatch ? <span className="text-green-400">✓</span> : <span className="text-red-300">✗</span>)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-03/10 rounded-lg p-4 border border-blue-03/20"
    >
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 rounded-full bg-blue-600">
          <Banknote className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-medium text-white">
          Ekonomi
        </h3>
      </div>

      {renderRefPanel()}

      <div className="space-y-6">
        {sortedData.map((entry, idx) => {
          const economy = entry.economy;
          if (!economy) return null;

          return (
            <div key={entry.year} className="mb-14">
              <div className="flex items-center mb-3 bg-blue-900/30 rounded-lg px-4 py-2 w-fit">
                <span className="text-2xl font-extrabold text-white mr-3 drop-shadow-sm">{entry.year}</span>
                {idx === 0 && (
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full ml-2 shadow">Senaste år</span>
                )}
              </div>
              <div className="flex flex-col md:flex-row md:items-stretch justify-center gap-4 md:gap-0 mt-2 relative max-w-2xl mx-auto">
                {economy.turnover && economy.turnover.value != null && (
                  <EconomyCard
                    icon={<Banknote className="w-5 h-5 text-blue-600" />}
                    title="Omsättning"
                    className="mr-0 md:mr-2"
                  >
                    <div className="font-extrabold text-gray-900 text-2xl mb-1">
                      {formatCurrency(economy.turnover.value, economy.turnover.currency)}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Nettoomsättning
                    </div>
                  </EconomyCard>
                )}
                {economy.turnover && economy.turnover.value != null && economy.employees && economy.employees.value != null && (
                  <div className="hidden md:block w-0.5 bg-gray-200 mx-2 rounded-full" style={{ minHeight: 140 }} />
                )}
                {economy.employees && economy.employees.value != null && (
                  <EconomyCard
                    icon={<Users className="w-5 h-5 text-purple-600" />}
                    title="Anställda"
                    className="ml-0 md:ml-2"
                  >
                    <div className="font-extrabold text-gray-900 text-4xl mb-1">
                      {formatNumber(economy.employees.value)}
                    </div>
                    <div className="text-base text-gray-700">
                      {economy.employees.unit || ''}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      {economy.employees.unit === 'AVG' ? 'Genomsnittligt antal' :
                       economy.employees.unit === 'FTE' ? 'Heltidsekvivalenter' :
                       economy.employees.unit === 'EOY' ? 'Vid årets slut' :
                       'Antal anställda'}
                    </div>
                  </EconomyCard>
                )}
              </div>
            </div>
          );
        })}
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
