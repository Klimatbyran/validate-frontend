import React from "react";
import { motion } from "framer-motion";
import { Truck, CheckCircle2 } from "lucide-react";
import { useCompanyReferenceByYears } from "../../lib/company-reference-api";
import {
  type Scope3EmissionsData,
  buildReferenceSnapshotFromScope3,
  SCOPE3_CATEGORY_NAMES,
  normalizeYearEntry,
  buildOurNumberMapForYear,
  buildRefNumberMap,
} from "../../lib/scope3-data";
import { CopyJsonButton } from "./CopyJsonButton";
import { JsonRawDataBlock } from "./JsonRawDataBlock";
import { YearBadge } from "./YearBadge";

interface Scope3EmissionsDisplayProps {
  data: Scope3EmissionsData;
  wikidataId?: string;
}

export function Scope3Section({ data, wikidataId }: Scope3EmissionsDisplayProps) {
  if (!data.scope3 || !Array.isArray(data.scope3) || data.scope3.length === 0) {
    return null;
  }

  const sortedScope3ByYear = React.useMemo(() => {
    return [...data.scope3].sort((a, b) => b.year - a.year);
  }, [data.scope3]);
  const years = React.useMemo(() => Array.from(new Set(sortedScope3ByYear.map(e => e.year))), [sortedScope3ByYear]);
  const latestScope3Year = years[0] as number | undefined;

  const { referenceByYear, isLoading, error } = useCompanyReferenceByYears(
    wikidataId,
    years,
    (period) => buildReferenceSnapshotFromScope3(period?.emissions?.scope3)
  );

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
        <span className="text-sm text-gray-02">Totalt ({latestScope3Year})</span>
        <span className="text-base font-bold text-gray-01 flex items-center gap-2">
          {typeof snapshot.total === 'number' ? snapshot.total.toLocaleString('sv-SE') : '—'}
          {snapshot.unit ? ` ${snapshot.unit}` : ''}
          {(ourTotal !== null || snapshot.total !== null) && (
            isMatch ? <span className="text-green-03">✓</span> : <span className="text-pink-03">✗</span>
          )}
        </span>
      </div>
    );
  }

  function renderReferenceCategoryComparisons() {
    const categoryNumbers = Array.from({ length: 15 }, (_, i) => i + 1);
    return (
      <div className="mt-2 divide-y divide-gray-03">
        {categoryNumbers.map((categoryNumber) => {
          const ref = refNumberMapLatest[categoryNumber];
          const our = ourNumberMapForLatest[categoryNumber];
          const label = SCOPE3_CATEGORY_NAMES[categoryNumber] || `Category ${categoryNumber}`;
          const match = (ref?.total ?? null) === (our?.total ?? null);
          return (
            <div key={categoryNumber} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-02">{label}</span>
              <span className="text-sm font-semibold text-gray-01 flex items-center gap-2">
                {typeof (ref?.total) === 'number' ? ref!.total!.toLocaleString('sv-SE') : '—'}{ref?.unit ? ` ${ref.unit}` : ''}
                {match ? <span className="text-green-03">✓</span> : <span className="text-pink-03">✗</span>}
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
        <YearBadge year={entry.year} isLatest={isLatest} accent="orange" />
        <div className="bg-gray-04 rounded-2xl p-8 border border-gray-03 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Truck className="w-5 h-5 text-orange-03" />
            <span className="font-semibold text-lg text-gray-01">Scope 3</span>
          </div>
          <div className="mb-6 pb-4 border-b border-gray-03">
            <div className="text-sm text-gray-02 mb-2">Totalt (statedTotalEmissions)</div>
            {normalized.total !== null && normalized.total !== undefined ? (
              <>
                <div className="font-extrabold text-gray-01 text-4xl mb-1 flex items-center gap-2">
                  {normalized.total.toLocaleString('sv-SE')}
                  {hasReferenceForYear && (() => {
                    const refSnapshot = referenceByYear[entry.year];
                    const refTotal = refSnapshot?.total ?? null;
                    const match = normalized.total === refTotal;
                    return match ? <span className="text-green-03 text-2xl">✓</span> : <span className="text-pink-03 text-2xl">✗</span>;
                  })()}
                </div>
                <div className="text-base text-gray-02">{normalized.unit || 'tCO2e'}</div>
              </>
            ) : (
              <div className="text-base text-gray-02">— {normalized.unit || 'tCO2e'}</div>
            )}
          </div>
          {hasReferenceForYear ? (
            <div className="mt-4 divide-y divide-gray-03">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => {
                const our = buildOurNumberMapForYear(entry.year, sortedScope3ByYear)[n];
                const ref = buildRefNumberMap(entry.year, referenceByYear)[n];
                const match = (our?.total ?? null) === (ref?.total ?? null);
                return (
                  <div key={n} className="flex items-center justify-between py-2">
                    <span className="text-base text-gray-02">{SCOPE3_CATEGORY_NAMES[n] || `Category ${n}`}</span>
                    <span className="font-extrabold text-gray-01 text-xl flex items-center gap-2">
                      {typeof (our?.total) === 'number' ? our!.total!.toLocaleString('sv-SE') : '—'}{our?.unit ? ` ${our.unit}` : ''}
                      {match ? <span className="text-green-03">✓</span> : <span className="text-pink-03">✗</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            normalized.categories && normalized.categories.length > 0 && (
              <div className="mt-4 divide-y divide-gray-03">
                {normalized.categories.map((category) => (
                  <div key={category.key} className="flex items-center justify-between py-2">
                    <span className="text-base text-gray-02">{category.label}</span>
                    <span className="font-extrabold text-gray-01 text-xl">
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
      className="bg-gray-04/50 rounded-lg p-4 border border-gray-03"
    >
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 rounded-full bg-orange-03/20">
          <Truck className="w-5 h-5 text-orange-03" />
        </div>
        <h3 className="text-lg font-medium text-orange-03">
          Växthusgasutsläpp Scope 3
        </h3>
      </div>

      {wikidataId && latestScope3Year && (
        <div className="mb-4">
          <div className="bg-gray-04/80 border border-gray-03 rounded-xl p-4 border-l-4 border-l-orange-03">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-orange-03" />
              <span className="text-sm font-medium text-gray-01">Referensvärden ({latestScope3Year}) från API i prod</span>
            </div>
            {isLoading && (
              <div className="text-sm text-gray-02">Hämtar…</div>
            )}
            {!isLoading && error && (
              <div className="text-sm text-gray-02">{error}</div>
            )}
            {!isLoading && !error && referenceByYear[latestScope3Year] && (
              <div className="space-y-2">
                {renderReferenceSummary()}
                {renderReferenceCategoryComparisons()}
                {!referenceByYear[latestScope3Year]?.total && (!referenceByYear[latestScope3Year]?.categories || referenceByYear[latestScope3Year]!.categories!.length === 0) && (
                  <div className="text-sm text-gray-02">Inga referensvärden hittades för {latestScope3Year}.</div>
                )}
                {referenceJson && (
                  <details className="mt-3 bg-gray-04 rounded border border-gray-03 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-orange-03">Reference JSON ({latestScope3Year})</summary>
                    <div className="flex justify-end">
                      <CopyJsonButton getText={() => JSON.stringify(referenceJson, null, 2)} />
                    </div>
                    <pre className="text-xs text-gray-02 overflow-x-auto mt-2">
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

      <JsonRawDataBlock data={data} />
    </motion.div>
  );
}
