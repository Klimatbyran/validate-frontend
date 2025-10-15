import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Building2, Truck, CheckCircle2 } from 'lucide-react';
import { getPublicApiUrl } from '@/lib/utils';

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

function CopyJsonButton({ getText, className = '' }: { getText: () => string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50 text-gray-700 border-gray-300 ${className}`}
    >
      {copied ? 'Kopierad' : 'Kopiera'}
    </button>
  );
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


export function ScopeEmissionsDisplay({ data }: Scope12EmissionsDisplayProps) {
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

      {/* Expandable raw JSON data */}
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

// -------------------- Scope 3 --------------------

interface Scope3EmissionsData {
  scope3: Array<{
    year: number;
    // Support two shapes: flat or nested under scope3
    total?: number | null;
    unit?: 'tCO2e' | 'tCO2';
    categories?: Array<{ id?: string; name?: string; total?: number | null; unit?: string | null; category?: number }>;
    scope3?: {
      statedTotalEmissions?: { total?: number | null; unit?: string | null } | null;
      categories?: Array<{ category?: number; total?: number | null; unit?: string | null }> | null;
    } | null;
  }>;
}

interface Scope3EmissionsDisplayProps {
  data: Scope3EmissionsData;
  wikidataId?: string;
}

function Scope3CategoryRow({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-base text-gray-700">{label}</span>
      <span className="font-extrabold text-gray-900 text-xl">{value.toLocaleString('sv-SE')}</span>
    </div>
  );
}

export function Scope3EmissionsDisplay({ data, wikidataId }: Scope3EmissionsDisplayProps) {
  if (!data.scope3 || !Array.isArray(data.scope3) || data.scope3.length === 0) {
    return null;
  }

  const sorted = [...data.scope3].sort((a, b) => b.year - a.year);

  const [correct2024, setCorrect2024] = React.useState<{
    total?: number | null;
    unit?: string | null;
    categories?: Array<{ name?: string; id?: string; total?: number | null; unit?: string | null }>;
  } | null>(null);
  const [correct2024Raw, setCorrect2024Raw] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function fetchCorrect() {
      if (!wikidataId) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(getPublicApiUrl(`/api/companies/${encodeURIComponent(wikidataId)}`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const company = await res.json();
        const periods = Array.isArray(company?.reportingPeriods) ? company.reportingPeriods : [];
        const match = periods.find((p: any) => {
          const end = p?.endDate ? new Date(p.endDate) : null;
          return end && end.getFullYear() === 2024;
        });
        const s3 = match?.emissions?.scope3;
        const item = s3 ? {
          total: s3.statedTotalEmissions?.total ?? null,
          unit: s3.statedTotalEmissions?.unit ?? null,
          categories: Array.isArray(s3.categories)
            ? s3.categories.map((c: any) => {
                const name = c?.name ?? c?.categoryName ?? c?.label ?? c?.title ?? c?.category?.name ?? c?.category ?? c?.id;
                return {
                  id: c?.id,
                  name,
                  total: c?.total ?? null,
                  unit: c?.unit ?? null,
                };
              })
            : [],
        } : null;
        if (!cancelled) {
          setCorrect2024(item);
          setCorrect2024Raw(s3 ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Kunde inte hämta referensdata');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchCorrect();
    return () => { cancelled = true; };
  }, [wikidataId]);

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

  function normalizeYearEntry(y: any) {
    // Derive display fields regardless of input shape
    const total = y?.scope3?.statedTotalEmissions?.total ?? y?.total ?? null;
    const unit = y?.scope3?.statedTotalEmissions?.unit ?? y?.unit ?? null;
    const catsRaw = y?.scope3?.categories ?? y?.categories ?? [];
    const categories: Array<{ key: string; label: string; total: number | null; unit: string | null; number?: number }>
      = Array.isArray(catsRaw) ? catsRaw.map((c: any, idx: number) => {
        const number = typeof c?.category === 'number' ? c.category : undefined;
        const label = number ? categoryNames[number] || `Category ${number}` : (c?.name || c?.label || `Kategori ${idx+1}`);
        return {
          key: c?.id || (number != null ? `cat-${number}` : `idx-${idx}`),
          label,
          total: c?.total ?? null,
          unit: c?.unit ?? null,
          number,
        };
      }) : [];
    return { total, unit, categories };
  }

  function findRefMatch(category: { label: string; number?: number }) {
    if (!correct2024) return undefined;
    // Try exact by number if reference categories encode numbers in name or have id equal.
    const byNumber = category.number != null ? (correct2024.categories || []).find(c => {
      const name = (c.name || '').toString();
      const id = (c.id || '').toString();
      return name.includes(`${category.number}`) || id === `${category.number}` || id.endsWith(`-${category.number}`);
    }) : undefined;
    if (byNumber) return byNumber;
    // Fallback by label case-insensitive
    const byLabel = (correct2024.categories || []).find(c => String(c?.name ?? '').toLowerCase() === String(category.label).toLowerCase());
    return byLabel;
  }

  function inferCategoryNumberFromRef(c: { name?: any; id?: any }) {
    const source = `${String(c?.name ?? '')} ${String(c?.id ?? '')}`;
    const m = source.match(/(?:^|[^\d])(1[0-5]|[1-9])(?:[^\d]|$)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 15) return n;
    }
    return undefined;
  }

  function findOurMatchForRef(refCat: { name?: any; id?: any }) {
    const year2024 = sorted.find(y => y.year === 2024);
    if (!year2024) return undefined;
    const our = normalizeYearEntry(year2024);
    const num = inferCategoryNumberFromRef(refCat);
    if (num != null) {
      const byNum = (our.categories || []).find(c => c.number === num);
      if (byNum) return byNum;
    }
    const nameLc = String(refCat?.name ?? '').toLowerCase();
    const byLabel = (our.categories || []).find(c => c.label.toLowerCase() === nameLc);
    return byLabel;
  }

  function buildOurNumberMapForYear(year: number) {
    const y = sorted.find(e => e.year === year);
    if (!y) return {} as Record<number, { total: number | null; unit: string | null }>;
    const norm = normalizeYearEntry(y);
    const map: Record<number, { total: number | null; unit: string | null }> = {};
    for (const c of norm.categories) {
      if (typeof c.number === 'number') {
        map[c.number] = { total: c.total ?? null, unit: c.unit ?? null };
      }
    }
    return map;
  }

  function buildRefNumberMap() {
    const map: Record<number, { total: number | null; unit: string | null }> = {};
    if (!correct2024 || !Array.isArray(correct2024.categories)) return map;
    for (const c of correct2024.categories) {
      const num = inferCategoryNumberFromRef(c);
      if (num != null) {
        map[num] = { total: c.total ?? null, unit: c.unit ?? null };
      }
    }
    return map;
  }

  const referenceJson = React.useMemo(() => {
    if (!correct2024) return null;
    const categories: Array<{ category: number; total: number | null; unit: string | null }> = [];
    for (const c of correct2024.categories || []) {
      const num = inferCategoryNumberFromRef(c);
      if (typeof num === 'number') {
        categories.push({ category: num, total: c.total ?? null, unit: c.unit ?? null });
      }
    }
    categories.sort((a, b) => a.category - b.category);
    return {
      scope3: [
        {
          year: 2024,
          scope3: {
            categories,
            statedTotalEmissions: { total: correct2024.total ?? null, unit: correct2024.unit ?? null },
          },
        },
      ],
    } as const;
  }, [correct2024]);

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

      {wikidataId && (
        <div className="mb-4">
          <div className="bg-amber-100/60 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-medium text-amber-800">Referensvärden (2024) från API i prod</span>
            </div>
            {isLoading && (
              <div className="text-sm text-amber-800">Hämtar…</div>
            )}
            {!isLoading && error && (
              <div className="text-sm text-amber-800">{error}</div>
            )}
            {!isLoading && !error && correct2024 && (
              <div className="space-y-2">
                {(() => {
                  const year2024 = sorted.find(y => y.year === 2024);
                  const ourTotal = year2024 ? normalizeYearEntry(year2024).total : null;
                  const isMatch = (ourTotal ?? null) === (correct2024.total ?? null);
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-amber-900">Totalt (2024)</span>
                      <span className="text-base font-bold text-amber-900 flex items-center gap-2">
                        {typeof correct2024.total === 'number' ? correct2024.total.toLocaleString('sv-SE') : '—'}
                        {correct2024.unit ? ` ${correct2024.unit}` : ''}
                        {(ourTotal !== null || correct2024.total !== null) && (
                          isMatch ? <span className="text-green-700">✓</span> : <span className="text-red-600">✗</span>
                        )}
                      </span>
                    </div>
                  );
                })()}
                {(() => {
                  const refMap = buildRefNumberMap();
                  const ourMap = buildOurNumberMapForYear(2024);
                  const nums = Array.from({ length: 15 }, (_, i) => i + 1);
                  return (
                    <div className="mt-2 divide-y divide-amber-200">
                      {nums.map((n) => {
                        const ref = refMap[n];
                        const our = ourMap[n];
                        const label = categoryNames[n] || `Category ${n}`;
                        const match = (ref?.total ?? null) === (our?.total ?? null);
                        return (
                          <div key={n} className="flex items-center justify-between py-1.5">
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
                })()}
                {!correct2024.total && (!correct2024.categories || correct2024.categories.length === 0) && (
                  <div className="text-sm text-amber-800">Inga referensvärden hittades för 2024.</div>
                )}
                {referenceJson && (
                  <details className="mt-3 bg-white rounded border border-amber-200 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-amber-900">Reference JSON</summary>
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
        {sorted.map((y, idx) => (
          <div key={y.year} className="mb-14">
            <div className="flex items-center mb-3 bg-amber-900/20 rounded-lg px-4 py-2 w-fit">
              <span className="text-2xl font-extrabold text-amber-900 mr-3 drop-shadow-sm">{y.year}</span>
              {idx === 0 && (
                <span className="bg-amber-600 text-white text-xs font-semibold px-3 py-1 rounded-full ml-2 shadow">Senaste år</span>
              )}
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Truck className="w-5 h-5 text-amber-700" />
                <span className="font-semibold text-lg text-gray-900">Scope 3</span>
              </div>
              {(() => {
                const normalized = normalizeYearEntry(y);
                return (
                  <>
                    {typeof normalized.total === 'number' && (
                      <div className="font-extrabold text-gray-900 text-4xl mb-1">{normalized.total.toLocaleString('sv-SE')}</div>
                    )}
                    <div className="text-base text-gray-700">{normalized.unit || 'tCO2e'}</div>
                    {y.year === 2024 ? (
                      (() => {
                        const refMap = buildRefNumberMap();
                        const ourMap = buildOurNumberMapForYear(2024);
                        const nums = Array.from({ length: 15 }, (_, i) => i + 1);
                        return (
                          <div className="mt-4 divide-y divide-gray-200">
                            {nums.map((n) => {
                              const our = ourMap[n];
                              const ref = refMap[n];
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
                        );
                      })()
                    ) : (
                      normalized.categories && normalized.categories.length > 0 && (
                        <div className="mt-4 divide-y divide-gray-200">
                          {normalized.categories.map((c) => (
                            <div key={c.key} className="flex items-center justify-between py-2">
                              <span className="text-base text-gray-700">{c.label}</span>
                              <span className="font-extrabold text-gray-900 text-xl">
                                {typeof c.total === 'number' ? c.total.toLocaleString('sv-SE') : '—'}{c.unit ? ` ${c.unit}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </>
                );
              })()}
            </div>
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