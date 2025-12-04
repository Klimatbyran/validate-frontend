import React from 'react';
import { motion } from 'framer-motion';
import { Truck, CheckCircle2 } from 'lucide-react';
import { getPublicApiUrl } from '@/lib/utils';
import { CopyJsonButton } from './CopyJsonButton';

interface Scope3EmissionsData {
  scope3: Array<{
    year: number;
    scope3: {
      statedTotalEmissions: { total: number | null; unit: string | null };
      categories: Array<{ 
        id: string; 
        category: number; 
        total: number | null; 
        unit: string | null;
        metadata?: any;
      }>;
      calculatedTotalEmissions?: number;
      metadata?: any;
    };
  }>;
}

interface Scope3EmissionsDisplayProps {
  data: Scope3EmissionsData;
  wikidataId?: string;
}

type ReferenceCategory = { id?: string; name?: string; total?: number | null; unit?: string | null; category?: number };
type ReferenceSnapshot = { total?: number | null; unit?: string | null; categories?: ReferenceCategory[] } | null;

// Fetch a comparable reference snapshot for a single known year (REFERENCE_YEAR)
// from the production API. We keep this narrowly scoped to avoid coupling the UI
// to the server's internal shapes and to allow straightforward value comparisons.
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

function buildReferenceSnapshotFromScope3(scope3: any): ReferenceSnapshot {
  if (!scope3) return null;
  const categories: ReferenceCategory[] = Array.isArray(scope3.categories)
    ? scope3.categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        total: category.total ?? null,
        unit: category.unit ?? null,
        category: category.category,
      }))
    : [];
  return {
    total: scope3.statedTotalEmissions?.total ?? null,
    unit: scope3.statedTotalEmissions?.unit ?? null,
    categories,
  };
}

// Standard GHG Protocol Scope 3 category names (1..15)
const categoryNames: Record<number, string> = {
  1: 'Purchased goods and services',
  2: 'Capital goods',
  3: 'Fuel- and energy-related activities (not in Scope 1 or 2)',
  4: 'Upstream transportation and distribution',
  5: 'Waste generated in operations',
  6: 'Business travel',
  7: 'Employee commuting',
  8: 'Upstream leased assets',
  9: 'Downstream transportation and distribution',
  10: 'Processing of sold products',
  11: 'Use of sold products',
  12: 'End-of-life treatment of sold products',
  13: 'Downstream leased assets',
  14: 'Franchises',
  15: 'Investments',
};

type NormalizedCategory = { key: string; label: string; total: number | null; unit: string | null; number?: number };
type NormalizedYearEntry = { total: number | null; unit: string | null; categories: NormalizedCategory[] };

// Normalize the scope3 data structure into a consistent format for the UI.
function normalizeYearEntry(entry: any): NormalizedYearEntry {
  const scope3 = entry.scope3;
  const total = scope3?.statedTotalEmissions?.total ?? null;
  const unit = scope3?.statedTotalEmissions?.unit ?? null;
  const rawCategories = scope3?.categories ?? [];
  const categories: NormalizedCategory[] = Array.isArray(rawCategories)
    ? rawCategories.map((rawCategory: any) => {
        const number = rawCategory.category;
        const label = categoryNames[number] || `Category ${number}`;
        return {
          key: rawCategory.id || `cat-${number}`,
          label,
          total: rawCategory.total ?? null,
          unit: rawCategory.unit ?? null,
          number,
        };
      })
    : [];
  return { total, unit, categories };
}


// Build a quick-lookup map from category number -> { total, unit } for our local data.
// Used to render and compare against the reference snapshot efficiently.
function buildOurNumberMapForYear(year: number, sortedScope3ByYear: any[]) {
  const yearEntry = sortedScope3ByYear.find(e => e.year === year);
  if (!yearEntry) return {} as Record<number, { total: number | null; unit: string | null }>;
  const normalized = normalizeYearEntry(yearEntry);
  const map: Record<number, { total: number | null; unit: string | null }> = {};
  for (const category of normalized.categories) {
    if (typeof category.number === 'number') {
      map[category.number] = { total: category.total ?? null, unit: category.unit ?? null };
    }
  }
  return map;
}

// Build a quick-lookup map from category number -> { total, unit } for the reference data.
function buildRefNumberMap(year: number, referenceByYear: Record<number, ReferenceSnapshot>) {
  const map: Record<number, { total: number | null; unit: string | null }> = {};
  const snapshot = referenceByYear[year];
  if (!snapshot || !Array.isArray(snapshot.categories)) return map;
  for (const c of snapshot.categories) {
    if (typeof c.category === 'number') {
      map[c.category] = { total: c.total ?? null, unit: c.unit ?? null };
    }
  }
  return map;
}

export function Scope3Section({ data, wikidataId }: Scope3EmissionsDisplayProps) {
  if (!data.scope3 || !Array.isArray(data.scope3) || data.scope3.length === 0) {
    return null;
  }

  const sortedScope3ByYear = React.useMemo(() => {
    return [...data.scope3].sort((a, b) => b.year - a.year);
  }, [data.scope3]);
  const years = React.useMemo(() => Array.from(new Set(sortedScope3ByYear.map(e => e.year))), [sortedScope3ByYear]);
  const yearsKey = React.useMemo(() => years.join(','), [years]);
  const latestScope3Year = years[0] as number | undefined;

  const [referenceByYear, setReferenceByYear] = React.useState<Record<number, ReferenceSnapshot>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!wikidataId || years.length === 0) return;
    const abortController = new AbortController();
    let isMounted = true;

    async function fetchReferencesForYears(companyId: string, years: number[]) {
      try {
        console.log('[Scope3Section] start reference fetch', { companyId, years });
      } catch (_) {}
      setIsLoading(true);
      setError(null);
      try {
        const company = await fetchCompanyById(companyId, abortController.signal);
        try {
          console.log('[Scope3Section] fetched company', { companyId, hasReportingPeriods: Array.isArray((company as any)?.reportingPeriods), reportingPeriodsCount: Array.isArray((company as any)?.reportingPeriods) ? (company as any).reportingPeriods.length : 0 });
        } catch (_) {}
        const periods = getReportingPeriods(company);
        const nextMap: Record<number, ReferenceSnapshot> = {};
        for (const y of years) {
          const period = findPeriodEndingInYear(periods, y);
          const scope3 = period?.emissions?.scope3;
          try {
            console.log('[Scope3Section] year snapshot', { year: y, hasPeriod: !!period, hasScope3: !!scope3 });
          } catch (_) {}
          nextMap[y] = buildReferenceSnapshotFromScope3(scope3);
        }
        if (isMounted) {
          setReferenceByYear(nextMap);
          setIsLoading(false);
        }
      } catch (e: any) {
        if (isMounted && e?.name !== 'AbortError') {
          try {
            console.warn('[Scope3Section] reference fetch error', e);
          } catch (_) {}
          setError(e?.message || 'Kunde inte hämta referensdata');
          setIsLoading(false);
        }
      }
    }

    fetchReferencesForYears(wikidataId, years);
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [wikidataId, yearsKey]);

  // A compact, normalized representation of the fetched reference snapshot.
  // Helpful for debugging and copying exact expected values.
  const referenceJson = React.useMemo(() => {
    if (!latestScope3Year) return null;
    const snapshot = referenceByYear[latestScope3Year];
    if (!snapshot) return null;
    const categories: Array<{ category: number; total: number | null; unit: string | null }> = [];
    for (const c of snapshot.categories || []) {
      if (typeof c.category === 'number') {
        categories.push({ category: c.category, total: c.total ?? null, unit: c.unit ?? null });
      }
    }
    categories.sort((a, b) => a.category - b.category);
    return {
      scope3: [
        {
          year: latestScope3Year,
          scope3: {
            categories,
            statedTotalEmissions: { total: snapshot.total ?? null, unit: snapshot.unit ?? null },
          },
        },
      ],
    } as const;
  }, [referenceByYear, latestScope3Year]);

  const ourNumberMapForLatest = React.useMemo(() => latestScope3Year ? buildOurNumberMapForYear(latestScope3Year, sortedScope3ByYear) : {}, [sortedScope3ByYear, latestScope3Year]);
  const refNumberMapLatest = React.useMemo(() => latestScope3Year ? buildRefNumberMap(latestScope3Year, referenceByYear) : {}, [referenceByYear, latestScope3Year]);

  function renderReferenceSummary() {
    if (!latestScope3Year) return null;
    const snapshot = referenceByYear[latestScope3Year];
    if (!snapshot) return null;
    const yearEntry = sortedScope3ByYear.find(entry => entry.year === latestScope3Year);
    const ourTotal = yearEntry ? normalizeYearEntry(yearEntry).total : null;
    const isMatch = (ourTotal ?? null) === (snapshot.total ?? null);
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-amber-900">Totalt ({latestScope3Year})</span>
        <span className="text-base font-bold text-amber-900 flex items-center gap-2">
          {typeof snapshot.total === 'number' ? snapshot.total.toLocaleString('sv-SE') : '—'}
          {snapshot.unit ? ` ${snapshot.unit}` : ''}
          {(ourTotal !== null || snapshot.total !== null) && (
            isMatch ? <span className="text-green-700">✓</span> : <span className="text-red-600">✗</span>
          )}
        </span>
      </div>
    );
  }

  function renderReferenceCategoryComparisons() {
    const categoryNumbers = Array.from({ length: 15 }, (_, i) => i + 1);
    return (
      <div className="mt-2 divide-y divide-amber-200">
        {categoryNumbers.map((categoryNumber) => {
          const ref = refNumberMapLatest[categoryNumber];
          const our = ourNumberMapForLatest[categoryNumber];
          const label = categoryNames[categoryNumber] || `Category ${categoryNumber}`;
          const match = (ref?.total ?? null) === (our?.total ?? null);
          return (
            <div key={categoryNumber} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-amber-900">{label}</span>
              <span className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                {typeof (ref?.total) === 'number' ? ref!.total!.toLocaleString('sv-SE') : '—'}{ref?.unit ? ` ${ref.unit}` : ''}
                {match ? <span className="text-green-700">✓</span> : <span className="text-red-600">✗</span>}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderYearSection(entry: any, isLatest: boolean) {
    const normalized = normalizeYearEntry(entry);
    const hasReferenceForYear = Boolean(referenceByYear[entry.year]);
    return (
      <div className="mb-14">
        <div className="flex items-center mb-3 bg-amber-900/20 rounded-lg px-4 py-2 w-fit">
          <span className="text-2xl font-extrabold text-amber-900 mr-3 drop-shadow-sm">{entry.year}</span>
          {isLatest && (
            <span className="bg-amber-600 text-white text-xs font-semibold px-3 py-1 rounded-full ml-2 shadow">Senaste år</span>
          )}
        </div>
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Truck className="w-5 h-5 text-amber-700" />
            <span className="font-semibold text-lg text-gray-900">Scope 3</span>
          </div>
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Totalt (statedTotalEmissions)</div>
            {normalized.total !== null && normalized.total !== undefined ? (
              <>
                <div className="font-extrabold text-gray-900 text-4xl mb-1 flex items-center gap-2">
                  {normalized.total.toLocaleString('sv-SE')}
                  {hasReferenceForYear && (() => {
                    const refSnapshot = referenceByYear[entry.year];
                    const refTotal = refSnapshot?.total ?? null;
                    const match = normalized.total === refTotal;
                    return match ? <span className="text-green-700 text-2xl">✓</span> : <span className="text-red-600 text-2xl">✗</span>;
                  })()}
                </div>
                <div className="text-base text-gray-700">{normalized.unit || 'tCO2e'}</div>
              </>
            ) : (
              <div className="text-base text-gray-700">— {normalized.unit || 'tCO2e'}</div>
            )}
          </div>
          {hasReferenceForYear ? (
            <div className="mt-4 divide-y divide-gray-200">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => {
                const our = buildOurNumberMapForYear(entry.year, sortedScope3ByYear)[n];
                const ref = buildRefNumberMap(entry.year, referenceByYear)[n];
                const match = (our?.total ?? null) === (ref?.total ?? null);
                return (
                  <div key={n} className="flex items-center justify-between py-2">
                    <span className="text-base text-gray-700">{categoryNames[n] || `Category ${n}`}</span>
                    <span className="font-extrabold text-gray-900 text-xl flex items-center gap-2">
                      {typeof (our?.total) === 'number' ? our!.total!.toLocaleString('sv-SE') : '—'}{our?.unit ? ` ${our.unit}` : ''}
                      {match ? <span className="text-green-700">✓</span> : <span className="text-red-600">✗</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            normalized.categories && normalized.categories.length > 0 && (
              <div className="mt-4 divide-y divide-gray-200">
                {normalized.categories.map((category) => (
                  <div key={category.key} className="flex items-center justify-between py-2">
                    <span className="text-base text-gray-700">{category.label}</span>
                    <span className="font-extrabold text-gray-900 text-xl">
                      {typeof category.total === 'number' ? category.total.toLocaleString('sv-SE') : '—'}{category.unit ? ` ${category.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-50 rounded-lg p-4 border border-amber-200"
    >
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 rounded-full bg-amber-100">
          <Truck className="w-5 h-5 text-amber-700" />
        </div>
        <h3 className="text-lg font-medium text-amber-700">
          Växthusgasutsläpp Scope 3
        </h3>
      </div>

      {wikidataId && latestScope3Year && (
        <div className="mb-4">
          <div className="bg-amber-100/60 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-medium text-amber-800">Referensvärden ({latestScope3Year}) från API i prod</span>
            </div>
            {isLoading && (
              <div className="text-sm text-amber-800">Hämtar…</div>
            )}
            {!isLoading && error && (
              <div className="text-sm text-amber-800">{error}</div>
            )}
            {!isLoading && !error && referenceByYear[latestScope3Year] && (
              <div className="space-y-2">
                {renderReferenceSummary()}
                {renderReferenceCategoryComparisons()}
                {!referenceByYear[latestScope3Year]?.total && (!referenceByYear[latestScope3Year]?.categories || referenceByYear[latestScope3Year]!.categories!.length === 0) && (
                  <div className="text-sm text-amber-800">Inga referensvärden hittades för {latestScope3Year}.</div>
                )}
                {referenceJson && (
                  <details className="mt-3 bg-white rounded border border-amber-200 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-amber-900">Reference JSON ({latestScope3Year})</summary>
                    <div className="flex justify-end">
                      <CopyJsonButton getText={() => JSON.stringify(referenceJson, null, 2)} />
                    </div>
                    <pre className="text-xs text-gray-800 overflow-x-auto mt-2">
                      {JSON.stringify(referenceJson, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {sortedScope3ByYear.map((entry, index) => (
          <React.Fragment key={entry.year}>
            {renderYearSection(entry, index === 0)}
          </React.Fragment>
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
