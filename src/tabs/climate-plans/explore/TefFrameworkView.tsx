import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MethodologyPanel } from "./MethodologyPanel";
import { TefDetailPanel } from "./TefDetailPanel";
import type { ExploreMunicipalityRecord } from "../lib/explore-types";
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
} from "../lib/tef-framework";

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
  scope,
  onScopeChange,
  placeName,
  onPlaceNameChange,
  metric,
  onMetricChange,
  selectedTefId,
  onSelectTefId,
}: {
  records: ExploreMunicipalityRecord[];
  scope: TefFrameworkScope;
  onScopeChange: (scope: TefFrameworkScope) => void;
  placeName: string | null;
  onPlaceNameChange: (name: string) => void;
  metric: TefFrameworkMetric;
  onMetricChange: (metric: TefFrameworkMetric) => void;
  selectedTefId: string | null;
  onSelectTefId: (id: string) => void;
}) {
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

  const selected = cells.find((c) => c.stableId === selectedTefId) ?? null;

  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="transition_element_matches on scored measures (stable_id, short_label, sector_path, match_confidence). Sector columns follow the Transition Element Framework (T-1 Transport … T-6 Waste)."
        calculation="Each cell is one TEF (stable_id). Hits = match rows in the selected scope. Strength = Σ confidence weights (high=3, mid=2, low=1) / (3 × hits). Municipalities = distinct municipalities with at least one match. Colour intensity is that metric scaled to the max cell in the current scope. Empty sector columns mean no matches yet — the full catalogue is larger than what we have extracted."
        extra="Scope mirrors the KPI map: all extracts, one region, or one municipality. Click a cell for a gist (who/what/how fill, shift↔intervention balance, confidence) then expand places for quotes."
      />

      <div className="flex flex-wrap gap-2 items-center">
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

        <span className="text-sm text-gray-02">
          {cells.length} TEFs · {cells.reduce((s, c) => s + c.hitCount, 0)} hits
          {scope !== "all" && effectivePlace ? ` · ${effectivePlace}` : ""}
        </span>
      </div>

      {cells.length === 0 ? (
        <p className="text-sm text-gray-02 rounded-lg border border-gray-03/30 bg-gray-04/40 p-4">
          No TEF matches in this scope yet. Run more plans through{" "}
          <code className="font-mono text-xs">matchTransitionElements</code> or
          widen the scope.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-03/30 bg-gray-05/30 p-4">
          <div className="flex gap-3 min-w-max items-start">
            {columns.map((column) => {
              const packed = packIntoColumns(
                column.cells,
                COLUMN_COUNTS[column.sectorId] ?? 2,
              );
              return (
                <section key={column.sectorId} className="shrink-0">
                  <div
                    className="text-center text-xs font-semibold uppercase tracking-wide text-gray-01 rounded-t-md px-2 py-1.5 mb-1"
                    style={{
                      backgroundColor: tefCellFill(column.rgb, 0.55),
                    }}
                  >
                    {column.label}
                    <span className="block text-[10px] font-normal text-gray-01/80 normal-case tracking-normal">
                      {column.code} · {column.cells.length}
                    </span>
                  </div>
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
                            const selected = selectedTefId === cell.stableId;
                            return (
                              <button
                                key={cell.stableId}
                                type="button"
                                title={`${cell.index ?? cell.stableId}: ${cell.title}`}
                                onClick={() => onSelectTefId(cell.stableId)}
                                className={cn(
                                  "w-14 h-14 rounded-md border text-left p-1 flex flex-col justify-between transition-transform hover:scale-[1.03]",
                                  selected
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
