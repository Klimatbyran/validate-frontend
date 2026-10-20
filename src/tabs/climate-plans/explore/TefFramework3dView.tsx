import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
  TefFrameworkHeightMode,
  TefFrameworkMetric,
} from "../lib/explore-types";
import {
  cellMetricValue,
  type TefFrameworkCell,
  type TefFrameworkSectorColumn,
  type TefSectorId,
  tefCellFill,
} from "../lib/tef-framework";
import type {
  SectorEmissionShare,
  SectorGateMatchRate,
} from "../lib/tef-sector-signals";

const MIN_PILLAR_PX = 28;
const MAX_PILLAR_PX = 220;

export function TefFramework3dView({
  columns,
  emissionShares,
  gateRates,
  heightMode,
  metric,
  maxMetric,
  selectedTefId,
  onSelectTefId,
  selectedSectorId,
  onSelectSectorId,
}: {
  columns: TefFrameworkSectorColumn[];
  emissionShares: {
    bySector: Record<TefSectorId, SectorEmissionShare>;
    totalTonnes: number;
  };
  gateRates: {
    bySector: Record<TefSectorId, SectorGateMatchRate>;
    hasAnyGateData: boolean;
  };
  heightMode: TefFrameworkHeightMode;
  metric: TefFrameworkMetric;
  maxMetric: number;
  selectedTefId: string | null;
  onSelectTefId: (id: string) => void;
  selectedSectorId: TefSectorId | "other" | null;
  onSelectSectorId: (id: TefSectorId | "other" | null) => void;
}) {
  const maxTonnes = useMemo(() => {
    let max = 0;
    for (const column of columns) {
      if (column.sectorId === "other") continue;
      const tonnes =
        emissionShares.bySector[column.sectorId as TefSectorId]?.tonnes ?? 0;
      if (tonnes > max) max = tonnes;
    }
    return max;
  }, [columns, emissionShares]);

  const visibleColumns =
    selectedSectorId == null
      ? columns
      : columns.filter((c) => c.sectorId === selectedSectorId);

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-x-auto rounded-lg border border-gray-03/30 bg-gradient-to-b from-gray-05/80 to-gray-04/40 p-6"
        style={{ perspective: "900px" }}
      >
        <div
          className="flex gap-8 min-w-max items-end justify-center pt-8 pb-4 px-4"
          style={{
            transform: "rotateX(12deg) rotateZ(-2deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {columns.map((column) => {
            const sectorId =
              column.sectorId === "other"
                ? null
                : (column.sectorId as TefSectorId);
            const emissions = sectorId
              ? emissionShares.bySector[sectorId]
              : null;
            const gate =
              sectorId && gateRates.hasAnyGateData
                ? gateRates.bySector[sectorId]
                : null;
            const share = emissions?.share ?? 0;
            const tonnes = emissions?.tonnes ?? 0;
            const heightRatio =
              heightMode === "share"
                ? share
                : maxTonnes <= 0
                  ? 0
                  : tonnes / maxTonnes;
            const heightPx =
              MIN_PILLAR_PX + heightRatio * (MAX_PILLAR_PX - MIN_PILLAR_PX);
            const isSelected = selectedSectorId === column.sectorId;
            const hitSum = column.cells.reduce((s, c) => s + c.hitCount, 0);

            return (
              <button
                key={column.sectorId}
                type="button"
                onClick={() =>
                  onSelectSectorId(isSelected ? null : column.sectorId)
                }
                className={cn(
                  "group relative flex flex-col items-center gap-2 outline-none",
                  isSelected && "z-10",
                )}
                title={`${column.label}: ${Math.round(share * 100)}% · ${Math.round(tonnes).toLocaleString()} t · ${hitSum} TEF hits`}
              >
                <SectorPillar
                  label={column.label}
                  code={column.code}
                  rgb={column.rgb}
                  heightPx={heightPx}
                  share={share}
                  tonnes={tonnes}
                  hitSum={hitSum}
                  cellCount={column.cells.length}
                  gate={gate && gate.gated > 0 ? gate : null}
                  selected={isSelected}
                />
              </button>
            );
          })}
        </div>
        <div
          className="mx-auto mt-2 h-2 max-w-3xl rounded-full bg-gray-03/25"
          aria-hidden
        />
        <p className="text-xs text-gray-02 mt-3 text-center">
          Pillar height ={" "}
          {heightMode === "share"
            ? "sector share of mapped territorial emissions in scope"
            : "sector tonnes relative to the tallest sector in scope"}
          . Click a pillar to list its TEF cells below.
          {emissionShares.totalTonnes <= 0
            ? " No sector emissions matched this scope yet — pillars stay at minimum height."
            : ""}
        </p>
      </div>

      {selectedSectorId ? (
        <SectorCellStrip
          columns={visibleColumns}
          metric={metric}
          maxMetric={maxMetric}
          selectedTefId={selectedTefId}
          onSelectTefId={onSelectTefId}
        />
      ) : (
        <p className="text-sm text-gray-02 rounded-lg border border-gray-03/30 bg-gray-04/40 p-4">
          Select a sector pillar to browse the TEF cells that matched in this
          scope.
        </p>
      )}
    </div>
  );
}

function SectorPillar({
  label,
  code,
  rgb,
  heightPx,
  share,
  tonnes,
  hitSum,
  cellCount,
  gate,
  selected,
}: {
  label: string;
  code: string;
  rgb: readonly [number, number, number];
  heightPx: number;
  share: number;
  tonnes: number;
  hitSum: number;
  cellCount: number;
  gate: SectorGateMatchRate | null;
  selected: boolean;
}) {
  const face = tefCellFill(rgb, selected ? 0.85 : 0.65);
  const side = tefCellFill(rgb, selected ? 0.55 : 0.4);
  const top = tefCellFill(rgb, selected ? 0.95 : 0.75);

  return (
    <div className="flex flex-col items-center w-[5.5rem]">
      <div
        className={cn(
          "relative w-16 transition-transform duration-300 group-hover:-translate-y-1",
          selected && "ring-2 ring-gray-01/50 rounded-sm",
        )}
        style={{ height: heightPx, transformStyle: "preserve-3d" }}
      >
        {/* front face */}
        <div
          className="absolute inset-0 rounded-sm border border-black/20 flex flex-col justify-end p-1.5"
          style={{ backgroundColor: face }}
        >
          <span className="text-[10px] font-semibold tabular-nums text-white leading-tight">
            {Math.round(share * 100)}%
          </span>
          <span className="text-[9px] text-white/80 tabular-nums">
            {Math.round(tonnes).toLocaleString()} t
          </span>
        </div>
        {/* right face */}
        <div
          className="absolute top-0 right-0 w-3 h-full rounded-r-sm border border-black/15 origin-left"
          style={{
            backgroundColor: side,
            transform: "translateX(100%) skewY(-20deg)",
          }}
          aria-hidden
        />
        {/* top face */}
        <div
          className="absolute left-0 right-0 h-3 rounded-t-sm border border-black/10 origin-bottom"
          style={{
            backgroundColor: top,
            transform: "translateY(-100%) skewX(-20deg)",
            top: 0,
          }}
          aria-hidden
        />
      </div>
      <div className="mt-3 text-center space-y-0.5">
        <div className="text-xs font-semibold text-gray-01 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-[10px] text-gray-02">
          {code} · {cellCount} TEFs · {hitSum} hits
        </div>
        {gate ? (
          <div className="text-[10px] text-gray-02 tabular-nums">
            gate {gate.matched}/{gate.gated}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectorCellStrip({
  columns,
  metric,
  maxMetric,
  selectedTefId,
  onSelectTefId,
}: {
  columns: TefFrameworkSectorColumn[];
  metric: TefFrameworkMetric;
  maxMetric: number;
  selectedTefId: string | null;
  onSelectTefId: (id: string) => void;
}) {
  const cells: TefFrameworkCell[] = columns.flatMap((c) => c.cells);
  if (cells.length === 0) {
    return (
      <p className="text-sm text-gray-02 rounded-lg border border-dashed border-gray-03/40 p-4">
        No TEF matches in this sector for the current scope.
      </p>
    );
  }

  const column = columns[0];
  return (
    <div className="rounded-lg border border-gray-03/30 bg-gray-05/30 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-01">
          {column?.label ?? "Sector"} TEF cells
        </h3>
        <span className="text-xs text-gray-02">{cells.length} cells</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cells.map((cell) => {
          const value = cellMetricValue(cell, metric);
          const intensity = maxMetric <= 0 ? 0 : value / maxMetric;
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
                  column?.rgb ?? [107, 114, 128],
                  intensity,
                ),
              }}
            >
              <span className="text-[9px] leading-tight font-mono text-white/90 line-clamp-2">
                {cell.index?.replace(/^T-\d/, "") ?? cell.stableId.slice(0, 8)}
              </span>
              <span className="text-[10px] font-semibold tabular-nums text-white">
                {metric === "strength" ? `${Math.round(value * 100)}%` : value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
