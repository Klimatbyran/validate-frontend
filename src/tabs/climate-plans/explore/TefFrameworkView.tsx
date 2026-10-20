import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ViewModePills } from "@/ui/view-mode-pills";
import { MethodologyPanel } from "./MethodologyPanel";
import { TefDetailPanel } from "./TefDetailPanel";
import { TefFramework3dView } from "./TefFramework3dView";
import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
  TefFrameworkHeightMode,
  TefFrameworkLayout,
} from "../lib/explore-types";
import {
  buildTefFrameworkCells,
  cellMetricValue,
  collectHitsWithPlace,
  filterHitsByScope,
  groupCellsBySector,
  listScopePlaces,
  packIntoColumns,
  tefCellFill,
  type TefFrameworkMetric,
  type TefFrameworkScope,
  type TefSectorId,
} from "../lib/tef-framework";
import {
  sectorEmissionSharesForScope,
  sectorGateMatchRates,
  type SectorEmissionShare,
  type SectorGateMatchRate,
} from "../lib/tef-sector-signals";

const COLUMN_COUNTS: Record<string, number> = {
  transport: 3,
  industry: 4,
  afolu: 2,
  buildings: 3,
  energy: 3,
  waste: 2,
  other: 2,
};

export function TefFrameworkView({
  records,
  sectorEmissions,
  scope,
  onScopeChange,
  placeName,
  onPlaceNameChange,
  metric,
  onMetricChange,
  showEmissions,
  onShowEmissionsChange,
  layout,
  onLayoutChange,
  heightMode,
  onHeightModeChange,
  selectedTefId,
  onSelectTefId,
}: {
  records: ExploreMunicipalityRecord[];
  sectorEmissions: SectorYearEmissions[];
  scope: TefFrameworkScope;
  onScopeChange: (scope: TefFrameworkScope) => void;
  placeName: string | null;
  onPlaceNameChange: (name: string) => void;
  metric: TefFrameworkMetric;
  onMetricChange: (metric: TefFrameworkMetric) => void;
  showEmissions: boolean;
  onShowEmissionsChange: (value: boolean) => void;
  layout: TefFrameworkLayout;
  onLayoutChange: (layout: TefFrameworkLayout) => void;
  heightMode: TefFrameworkHeightMode;
  onHeightModeChange: (mode: TefFrameworkHeightMode) => void;
  selectedTefId: string | null;
  onSelectTefId: (id: string) => void;
}) {
  const [selectedSectorId, setSelectedSectorId] = useState<
    TefSectorId | "other" | null
  >(null);
  const places = useMemo(
    () => listScopePlaces(records, scope),
    [records, scope],
  );
  const effectivePlace =
    scope === "all"
      ? null
      : (places.find((p) => p === placeName) ?? places[0] ?? null);

  const cells = useMemo(() => {
    const allHits = collectHitsWithPlace(records);
    const scoped = filterHitsByScope(allHits, scope, effectivePlace);
    return buildTefFrameworkCells(scoped);
  }, [records, scope, effectivePlace]);

  const columns = useMemo(() => groupCellsBySector(cells), [cells]);

  const maxMetric = useMemo(() => {
    const values = cells.map((c) => cellMetricValue(c, metric));
    return Math.max(...values, metric === "strength" ? 1 : 1);
  }, [cells, metric]);

  const gateRates = useMemo(
    () => sectorGateMatchRates(records, scope, effectivePlace),
    [records, scope, effectivePlace],
  );

  const emissionShares = useMemo(
    () =>
      sectorEmissionSharesForScope(
        records,
        sectorEmissions,
        scope,
        effectivePlace,
      ),
    [records, sectorEmissions, scope, effectivePlace],
  );

  const selected = cells.find((c) => c.stableId === selectedTefId) ?? null;

  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="transition_element_matches on scored measures (stable_id, short_label, sector_path, match_confidence). Gate domain from activity_shifts.transition_element_gate_domain (pipeline). Sector emissions from Unearth / SMHI territorial series. Sector columns follow the Transition Element Framework (T-1 Transport … T-6 Waste)."
        calculation="Each cell is one TEF (stable_id). Hits = match rows in the selected scope. Strength = Σ confidence weights (high=3, mid=2, low=1) / (3 × hits). Municipalities = distinct municipalities with at least one match. Colour intensity is that metric scaled to the max cell in the current scope. Match rate on a header = gated shifts with ≥1 confirmed match in the same top domain / shifts gated to that domain. Optional emission bars = sector tonnes / sum of mapped buckets (transport→transport, industry→industry, afolu→agriculture, buildings→heating, energy→energy, waste→waste) using each place’s latest year; machinery/product/other are excluded. 3D layout: pillar height scales to emission share or relative tonnes for the same scope."
        extra="Scope mirrors the KPI map: all extracts, one region, or one municipality. Empty cells with a low match rate mean the domain appears in plans but TEF matching struggled — not that the topic is absent. Click a cell for a gist then expand places for quotes."
      />

      <div className="flex flex-wrap gap-2 items-center">
        <ViewModePills
          options={[
            { value: "grid", label: "Catalogue" },
            { value: "3d", label: "3D emissions" },
          ]}
          value={layout}
          onValueChange={onLayoutChange}
          ariaLabel="TEF framework layout"
          className="rounded-lg"
        />

        <div className="flex rounded-lg overflow-hidden border border-gray-03/40 text-sm">
          {(
            [
              ["all", "All"],
              ["region", "Region"],
              ["municipality", "Municipality"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onScopeChange(value)}
              className={cn(
                "px-3 py-2",
                scope === value
                  ? "bg-gray-03/50 text-gray-01"
                  : "text-gray-02 hover:text-gray-01",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {scope !== "all" ? (
          <select
            value={effectivePlace ?? ""}
            onChange={(e) => onPlaceNameChange(e.target.value)}
            className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
          >
            {places.length === 0 ? (
              <option value="">No places with TEF matches</option>
            ) : (
              places.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            )}
          </select>
        ) : null}

        <select
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as TefFrameworkMetric)}
          className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
        >
          <option value="hits">Colour by hit count</option>
          <option value="strength">Colour by match strength</option>
          <option value="municipalities">Colour by municipality count</option>
        </select>

        {layout === "3d" ? (
          <select
            value={heightMode}
            onChange={(e) =>
              onHeightModeChange(e.target.value as TefFrameworkHeightMode)
            }
            className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
          >
            <option value="share">Height by emission %</option>
            <option value="tonnes">Height by tonnes</option>
          </select>
        ) : (
          <label className="inline-flex items-center gap-2 text-sm text-gray-01 cursor-pointer select-none px-2 py-1.5 rounded-md border border-gray-03/40 bg-gray-04/40">
            <input
              type="checkbox"
              checked={showEmissions}
              onChange={(e) => onShowEmissionsChange(e.target.checked)}
              className="rounded border-gray-03"
            />
            Show emissions on headers
          </label>
        )}

        <span className="text-sm text-gray-02">
          {cells.length} TEFs · {cells.reduce((s, c) => s + c.hitCount, 0)} hits
          {scope !== "all" && effectivePlace ? ` · ${effectivePlace}` : ""}
        </span>
      </div>

      {cells.length === 0 && !gateRates.hasAnyGateData ? (
        <p className="text-sm text-gray-02 rounded-lg border border-gray-03/30 bg-gray-04/40 p-4">
          No TEF matches in this scope yet. Run more plans through{" "}
          <code className="font-mono text-xs">matchTransitionElements</code> or
          widen the scope.
        </p>
      ) : layout === "3d" ? (
        <TefFramework3dView
          columns={columns}
          emissionShares={emissionShares}
          gateRates={gateRates}
          heightMode={heightMode}
          metric={metric}
          maxMetric={maxMetric}
          selectedTefId={selectedTefId}
          onSelectTefId={onSelectTefId}
          selectedSectorId={selectedSectorId}
          onSelectSectorId={setSelectedSectorId}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-03/30 bg-gray-05/30 p-4">
          <div className="flex gap-3 min-w-max items-start">
            {columns.map((column) => {
              const packed = packIntoColumns(
                column.cells,
                COLUMN_COUNTS[column.sectorId] ?? 2,
              );
              const sectorId =
                column.sectorId === "other"
                  ? null
                  : (column.sectorId as TefSectorId);
              const gate = sectorId ? gateRates.bySector[sectorId] : null;
              const emissions = sectorId
                ? emissionShares.bySector[sectorId]
                : null;
              return (
                <section key={column.sectorId} className="shrink-0">
                  <SectorHeader
                    label={column.label}
                    code={column.code}
                    cellCount={column.cells.length}
                    rgb={column.rgb}
                    gate={
                      gateRates.hasAnyGateData &&
                      gate &&
                      sectorId &&
                      gate.gated > 0
                        ? gate
                        : null
                    }
                    emissions={
                      showEmissions && emissions && sectorId ? emissions : null
                    }
                    showEmissions={showEmissions}
                  />
                  {column.cells.length === 0 ? (
                    <div className="w-28 h-16 rounded-md border border-dashed border-gray-03/40 flex items-center justify-center text-[10px] text-gray-02/70">
                      no matches
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {packed.map((col, colIdx) => (
                        <div key={colIdx} className="flex flex-col gap-1">
                          {col.map((cell) => {
                            const value = cellMetricValue(cell, metric);
                            const intensity =
                              maxMetric <= 0 ? 0 : value / maxMetric;
                            const isSelected = selectedTefId === cell.stableId;
                            return (
                              <button
                                key={cell.stableId}
                                type="button"
                                title={`${cell.index ?? cell.stableId}: ${cell.title}`}
                                onClick={() => onSelectTefId(cell.stableId)}
                                className={cn(
                                  "w-14 h-14 rounded-md border text-left p-1 flex flex-col justify-between transition-transform hover:scale-[1.03]",
                                  isSelected
                                    ? "border-gray-01 ring-2 ring-gray-01/40"
                                    : "border-black/20",
                                )}
                                style={{
                                  backgroundColor: tefCellFill(
                                    column.rgb,
                                    intensity,
                                  ),
                                }}
                              >
                                <span className="text-[9px] leading-tight font-mono text-white/90 line-clamp-2">
                                  {cell.index?.replace(/^T-\d/, "") ??
                                    cell.stableId.slice(0, 8)}
                                </span>
                                <span className="text-[10px] font-semibold tabular-nums text-white">
                                  {metric === "strength"
                                    ? `${Math.round(value * 100)}%`
                                    : value}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <p className="text-xs text-gray-02 mt-3">
            Layout inspired by the{" "}
            <a
              href="https://www.transitionelements.org/3-transition-elements/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-03 hover:underline"
            >
              Transition Elements catalogue
            </a>
            . Cells are only TEFs present in our extracts — not the full
            catalogue.
            {gateRates.hasAnyGateData
              ? " Header match rates use pipeline gate domains."
              : ""}
            {showEmissions
              ? emissionShares.totalTonnes > 0
                ? " Emission bars use latest territorial sector totals in scope."
                : " No sector emissions matched this scope yet."
              : ""}
          </p>
        </div>
      )}

      {selected ? (
        <TefDetailPanel key={selected.stableId} cell={selected} />
      ) : cells.length > 0 ? (
        <p className="text-sm text-gray-02 rounded-lg border border-gray-03/30 bg-gray-04/40 p-4">
          Click a TEF cell to see which municipalities and measures matched it.
        </p>
      ) : null}
    </div>
  );
}

function SectorHeader({
  label,
  code,
  cellCount,
  rgb,
  gate,
  emissions,
  showEmissions,
}: {
  label: string;
  code: string;
  cellCount: number;
  rgb: readonly [number, number, number];
  gate: SectorGateMatchRate | null;
  emissions: SectorEmissionShare | null;
  showEmissions: boolean;
}) {
  return (
    <div
      className="text-center text-xs font-semibold uppercase tracking-wide text-gray-01 rounded-t-md px-2 py-1.5 mb-1 space-y-1 min-w-[7rem]"
      style={{
        backgroundColor: tefCellFill(rgb, 0.55),
      }}
    >
      <div>{label}</div>
      <div className="text-[10px] font-normal text-gray-01/80 normal-case tracking-normal">
        {code} · {cellCount}
      </div>
      {gate ? (
        <div className="normal-case tracking-normal space-y-0.5">
          <div
            className="text-[10px] font-medium text-gray-01/90 tabular-nums"
            title="Confirmed TEF matches among activity shifts gated to this top domain"
          >
            {gate.matched}/{gate.gated} matched
          </div>
          <div className="h-1 rounded-full bg-black/25 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                (gate.rate ?? 0) >= 0.5 ? "bg-white/90" : "bg-orange-03",
              )}
              style={{ width: `${Math.round((gate.rate ?? 0) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
      {showEmissions && emissions ? (
        <div className="normal-case tracking-normal space-y-0.5">
          <div
            className="text-[10px] font-medium text-gray-01/90 tabular-nums"
            title={`${Math.round(emissions.tonnes).toLocaleString()} t CO₂e (latest year, mapped buckets)`}
          >
            {Math.round(emissions.share * 100)}% emissions
          </div>
          <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-03"
              style={{
                width: `${Math.round(emissions.share * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
