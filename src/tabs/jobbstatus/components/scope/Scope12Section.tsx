import React from "react";
import { motion } from "framer-motion";
import { Leaf, Building2, CheckCircle2 } from "lucide-react";
import { useCompanyReferenceByYears } from "../../lib/company-reference-api";
import {
  type Scope12EmissionsData,
  buildReferenceSnapshotFromPeriod,
  formatNumber,
} from "../../lib/scope12-data";
import { JsonRawDataBlock } from "./JsonRawDataBlock";
import { YearBadge } from "./YearBadge";
import { DataCard } from "./DataCard";
import { CollapsibleSection } from "@/ui/collapsible-section";

interface Scope12EmissionsDisplayProps {
  data: Scope12EmissionsData;
  wikidataId?: string;
}

interface Scope2RowProps {
  label: string;
  value: number;
}

function Scope2Row({ label, value }: Scope2RowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-base text-gray-02">{label}</span>
      <span className="font-extrabold text-gray-01 text-xl">{formatNumber(value)}</span>
    </div>
  );
}

interface Scope1CardProps {
  data?: {
    total: number;
    unit: 'tCO2e' | 'tCO2';
  } | null;
  combinedScope1And2?: {
    total: number;
    unit: 'tCO2e' | 'tCO2';
  } | null;
  matchStatus?: 'match' | 'mismatch' | 'none';
}

function Scope1Card({ data, combinedScope1And2, matchStatus = 'none' }: Scope1CardProps) {
  const hasScope1 = !!data && typeof data.total === 'number';
  const hasCombined = !!combinedScope1And2 && typeof combinedScope1And2.total === 'number';

  if (!hasScope1 && !hasCombined) return null;

  const displayTotal = hasScope1 ? data!.total : combinedScope1And2!.total;
  const displayUnit = (hasScope1 ? data!.unit : combinedScope1And2!.unit) || 'tCO2e';
  const title = hasScope1 ? 'Scope 1' : 'Scope 1+2';
  
  return (
    <DataCard
      icon={<Building2 className="w-5 h-5 text-orange-03" />}
      title={title}
      className="mr-0 md:mr-2 min-h-[220px]"
    >
      <div className="font-extrabold text-gray-01 text-4xl mb-1">
        {formatNumber(displayTotal)}
      </div>
      <div className="text-base text-gray-02">
        {displayUnit}
      </div>
      <div className="text-sm text-gray-02 mt-2">
        Direkta utsläpp
      </div>
      {matchStatus !== 'none' && (
        <div className="text-xs mt-2">
          {matchStatus === 'match' ? (
            <span className="text-green-03">✓ Stämmer med prod</span>
          ) : (
            <span className="text-pink-03">✗ Avviker från prod</span>
          )}
        </div>
      )}
    </DataCard>
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
    <DataCard
      icon={<Building2 className="w-5 h-5 text-blue-03" />}
      title="Scope 2"
      className="ml-0 md:ml-2 min-h-[220px]"
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
      <div className="text-base text-gray-02 mt-2">
        {data.unit || 'tCO2e'}
      </div>
      <div className="text-sm text-gray-02 mt-2">
        Indirekta utsläpp (el, värme, kyla)
      </div>
    </DataCard>
  );
}

export function Scope12Section({ data, wikidataId }: Scope12EmissionsDisplayProps) {
  if (!data.scope12 || !Array.isArray(data.scope12) || data.scope12.length === 0) {
    return null;
  }

  // Sort years in descending order (newest first)
  const sortedData = [...data.scope12].sort((a, b) => b.year - a.year);
  const latestYear = sortedData[0];
  const years = React.useMemo(
    () => Array.from(new Set(sortedData.map((e) => e.year))),
    [sortedData]
  );

  const { referenceByYear, isLoading: isLoadingRef, error: refError } =
    useCompanyReferenceByYears(
      wikidataId,
      years,
      buildReferenceSnapshotFromPeriod
    );

  const hasScope1 =
    latestYear.scope1?.total !== undefined ||
    latestYear.scope1And2?.total !== undefined;
  const hasCombinedScope1And2 = latestYear.scope1And2?.total !== undefined;
  const hasScope2 = latestYear.scope2 && (
    latestYear.scope2.mb != null || 
    latestYear.scope2.lb != null || 
    latestYear.scope2.unknown != null
  );

  if (!hasScope1 && !hasScope2 && !hasCombinedScope1And2) {
    return null;
  }

  function renderRefPanel() {
    if (!wikidataId) return null;
    const latest = latestYear?.year;
    if (!latest) return null;
    const snapshot = referenceByYear[latest];
    if (!snapshot) return (
      <div className="bg-gray-04/80 border border-gray-03 rounded-xl p-4 mb-4 border-l-4 border-l-green-03">
        {isLoadingRef && <div className="text-sm text-gray-02">Hämtar…</div>}
        {!isLoadingRef && refError && <div className="text-sm text-gray-02">{refError}</div>}
      </div>
    );
    const ourS1 = latestYear.scope1;
    const ourS2 = latestYear.scope2;
    const ourCombined = latestYear.scope1And2;
    const s1Match = (ourS1?.total ?? null) === (snapshot.scope1?.total ?? null);
    const s2MbMatch = (ourS2?.mb ?? null) === (snapshot.scope2?.mb ?? null);
    const s2LbMatch = (ourS2?.lb ?? null) === (snapshot.scope2?.lb ?? null);
    const s2UnknownMatch =
      (ourS2?.unknown ?? null) === (snapshot.scope2?.unknown ?? null);

    const snapshotCombined = snapshot.scope1And2;
    const hasSnapshotCombined =
      snapshotCombined && typeof snapshotCombined.total === "number";
    // If we have our own combined value but prod has null/undefined,
    // treat that as a clear mismatch rather than "no data"
    const combinedMatch =
      ourCombined?.total != null
        ? hasSnapshotCombined
          ? ourCombined.total === snapshotCombined.total
          : false
        : null;
    return (
      <div className="bg-gray-04/80 border border-gray-03 rounded-xl p-4 mb-4 border-l-4 border-l-green-03">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-03" />
          <span className="text-sm font-medium text-gray-01">Referensvärden ({latest}) från API i prod</span>
        </div>
        {isLoadingRef && <div className="text-sm text-gray-02">Hämtar…</div>}
        {!isLoadingRef && refError && <div className="text-sm text-gray-02">{refError}</div>}
        {!isLoadingRef && !refError && (
          <div className="divide-y divide-gray-03">
            {ourS1 && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-02">Scope 1 totalt</span>
                <span className="text-base font-bold text-gray-01 flex items-center gap-2">
                  {snapshot.scope1?.total?.toLocaleString('sv-SE') ?? '—'} {snapshot.scope1?.unit ?? ''}
                  {s1Match ? <span className="text-green-03">✓</span> : <span className="text-pink-03">✗</span>}
                </span>
              </div>
            )}
            {ourS2?.mb != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-02">Scope 2 marknadsbaserad</span>
                <span className="text-sm font-semibold text-gray-01 flex items-center gap-2">
                  {snapshot.scope2?.mb?.toLocaleString('sv-SE') ?? '—'} {snapshot.scope2?.unit ?? ''}
                  {s2MbMatch ? <span className="text-green-03">✓</span> : <span className="text-pink-03">✗</span>}
                </span>
              </div>
            )}
            {ourS2?.lb != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-02">Scope 2 platsbaserad</span>
                <span className="text-sm font-semibold text-gray-01 flex items-center gap-2">
                  {snapshot.scope2?.lb?.toLocaleString('sv-SE') ?? '—'} {snapshot.scope2?.unit ?? ''}
                  {s2LbMatch ? <span className="text-green-03">✓</span> : <span className="text-pink-03">✗</span>}
                </span>
              </div>
            )}
            {ourS2?.unknown != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-02">Scope 2 ospecificerad</span>
                <span className="text-sm font-semibold text-gray-01 flex items-center gap-2">
                  {snapshot.scope2?.unknown?.toLocaleString('sv-SE') ?? '—'} {snapshot.scope2?.unit ?? ''}
                  {s2UnknownMatch ? <span className="text-green-03">✓</span> : <span className="text-pink-03">✗</span>}
                </span>
              </div>
            )}
            {ourCombined && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-02">Scope 1+2 totalt</span>
                <span className="text-sm font-semibold text-gray-01 flex items-center gap-2">
                  {snapshotCombined?.total?.toLocaleString('sv-SE') ?? '—'} {snapshotCombined?.unit ?? ''}
                  {combinedMatch != null && (combinedMatch ? <span className="text-green-03">✓</span> : <span className="text-pink-03">✗</span>)}
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
      className="bg-gray-04/50 rounded-lg border border-gray-03"
    >
      <CollapsibleSection
        defaultOpen
        title="Växthusgasutsläpp Scope 1 & 2"
        icon={<Leaf className="w-5 h-5 text-green-03" />}
        accentIconBg="bg-green-03/20"
        accentTextColor="text-green-03"
      >
        {renderRefPanel()}

        <div className="space-y-6">
          {sortedData.map((yearData, idx) => (
            <div key={yearData.year} className="mb-14">
              <YearBadge year={yearData.year} isLatest={idx === 0} accent="green" />
              <div className="flex flex-col md:flex-row md:items-stretch justify-center gap-4 md:gap-0 mt-2 relative max-w-2xl mx-auto">
                {(() => {
                  const snapshot = referenceByYear[yearData.year];
                  let matchStatus: 'match' | 'mismatch' | 'none' = 'none';

                  if (snapshot) {
                    if (yearData.scope1 && typeof yearData.scope1.total === 'number') {
                      const our = yearData.scope1.total ?? null;
                      const prod = snapshot.scope1?.total ?? null;
                      if (our != null && prod != null) {
                        matchStatus = our === prod ? 'match' : 'mismatch';
                      }
                    } else if (yearData.scope1And2 && typeof yearData.scope1And2.total === 'number') {
                      const prodCombined = snapshot.scope1And2;
                      if (prodCombined && typeof prodCombined.total === "number") {
                        matchStatus =
                          yearData.scope1And2.total === prodCombined.total
                            ? "match"
                            : "mismatch";
                      } else {
                        matchStatus = "mismatch";
                      }
                    }
                  }

                  return (
                    <Scope1Card
                      data={yearData.scope1}
                      combinedScope1And2={yearData.scope1And2}
                      matchStatus={matchStatus}
                    />
                  );
                })()}
                {yearData.scope1 && yearData.scope2 && (
                  <div className="hidden md:block w-0.5 bg-gray-03 mx-2 rounded-full" style={{ minHeight: 180 }} />
                )}
                <Scope2Card data={yearData.scope2} />
              </div>
            </div>
          ))}
        </div>

        <JsonRawDataBlock data={data} />
      </CollapsibleSection>
    </motion.div>
  );
}
