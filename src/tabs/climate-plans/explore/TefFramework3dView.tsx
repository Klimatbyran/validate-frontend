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

const MIN_PILLAR_H = 40;
const MAX_PILLAR_H = 220;
/** Fixed TEF cube size for now — later maps to emission-reduction effectiveness. */
const TEF_CUBE = 28;
const TEF_CUBE_DEPTH = 14;
const PILLAR_W = 112;
const PILLAR_DEPTH = 32;

/**
 * Isometric boxes are drawn as SVG polygons (no CSS rotateX/skew on a parent
 * scene). Parent 3D transforms were rasterizing the whole strip and making
 * edges + type look soft/blurry.
 */
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

  return (
    <div className="space-y-3 w-full">
      <div className="relative w-full rounded-lg border border-gray-03/30 bg-gray-05/40 px-3 py-5 sm:px-5 sm:py-6">
        <div className="grid w-full gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 items-start justify-items-stretch">
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
              MIN_PILLAR_H + heightRatio * (MAX_PILLAR_H - MIN_PILLAR_H);
            const isSelected = selectedSectorId === column.sectorId;
            const hitSum = column.cells.reduce((s, c) => s + c.hitCount, 0);

            return (
              <SectorColumn
                key={column.sectorId}
                column={column}
                heightPx={heightPx}
                share={share}
                tonnes={tonnes}
                hitSum={hitSum}
                gate={gate && gate.gated > 0 ? gate : null}
                selected={isSelected}
                metric={metric}
                maxMetric={maxMetric}
                selectedTefId={selectedTefId}
                onSelectSector={() =>
                  onSelectSectorId(isSelected ? null : column.sectorId)
                }
                onSelectTefId={onSelectTefId}
              />
            );
          })}
        </div>

        <p className="text-xs text-gray-02 mt-5 text-center max-w-4xl mx-auto">
          Pillar height ={" "}
          {heightMode === "share"
            ? "sector share of mapped territorial emissions in scope"
            : "sector tonnes relative to the tallest sector in scope"}
          . Cubes under each pillar are TEFs in this scope — size is fixed for
          now; later it will scale with how much each TEF reduces emissions.
          {emissionShares.totalTonnes <= 0
            ? " No sector emissions matched this scope yet — pillars stay at minimum height."
            : ""}
        </p>
      </div>
    </div>
  );
}

function SectorColumn({
  column,
  heightPx,
  share,
  tonnes,
  hitSum,
  gate,
  selected,
  metric,
  maxMetric,
  selectedTefId,
  onSelectSector,
  onSelectTefId,
}: {
  column: TefFrameworkSectorColumn;
  heightPx: number;
  share: number;
  tonnes: number;
  hitSum: number;
  gate: SectorGateMatchRate | null;
  selected: boolean;
  metric: TefFrameworkMetric;
  maxMetric: number;
  selectedTefId: string | null;
  onSelectSector: () => void;
  onSelectTefId: (id: string) => void;
}) {
  const svgW = PILLAR_W + PILLAR_DEPTH;
  const svgH = heightPx + PILLAR_DEPTH + 4;

  return (
    <div
      className={cn(
        "flex flex-col items-center min-w-0 rounded-lg px-1 py-2 transition-colors",
        selected ? "bg-gray-03/25 ring-1 ring-gray-01/30" : "hover:bg-gray-04/40",
      )}
    >
      <button
        type="button"
        onClick={onSelectSector}
        className="group flex flex-col items-center gap-2 outline-none w-full"
        title={`${column.label}: ${Math.round(share * 100)}% · ${Math.round(tonnes).toLocaleString()} t · ${hitSum} TEF hits`}
      >
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="shrink-0 overflow-visible mx-auto"
          aria-hidden
        >
          <IsoBox
            x={0}
            y={svgH - heightPx - PILLAR_DEPTH}
            w={PILLAR_W}
            h={heightPx}
            d={PILLAR_DEPTH}
            rgb={column.rgb}
            intensity={selected ? 0.88 : 0.7}
            selected={selected}
          />
        </svg>

        <div className="text-center space-y-0.5 px-0.5">
          <div className="text-[11px] font-semibold text-gray-01 uppercase tracking-wide leading-tight">
            {column.label}
          </div>
          <div className="text-[11px] font-semibold tabular-nums text-gray-01">
            {Math.round(share * 100)}%
            <span className="text-gray-02 font-normal">
              {" "}
              · {Math.round(tonnes).toLocaleString()} t
            </span>
          </div>
          <div className="text-[10px] text-gray-02">
            {column.code} · {column.cells.length} TEFs · {hitSum} hits
          </div>
          {gate ? (
            <div className="text-[10px] text-gray-02 tabular-nums">
              gate {gate.matched}/{gate.gated}
            </div>
          ) : null}
        </div>
      </button>

      <TefCubeGrid
        cells={column.cells}
        rgb={column.rgb}
        metric={metric}
        maxMetric={maxMetric}
        selectedTefId={selectedTefId}
        onSelectTefId={onSelectTefId}
      />
    </div>
  );
}

function TefCubeGrid({
  cells,
  rgb,
  metric,
  maxMetric,
  selectedTefId,
  onSelectTefId,
}: {
  cells: TefFrameworkCell[];
  rgb: readonly [number, number, number];
  metric: TefFrameworkMetric;
  maxMetric: number;
  selectedTefId: string | null;
  onSelectTefId: (id: string) => void;
}) {
  if (cells.length === 0) {
    return (
      <div className="mt-3 w-full text-center text-[10px] text-gray-02/70 border border-dashed border-gray-03/40 rounded-md py-3">
        no matches
      </div>
    );
  }

  const cubeSvgW = TEF_CUBE + TEF_CUBE_DEPTH * 0.72;
  const cubeSvgH = TEF_CUBE + TEF_CUBE_DEPTH * 0.42 + 2;

  return (
    <div className="mt-3 w-full flex flex-wrap justify-center gap-x-1.5 gap-y-2 content-start">
      {cells.map((cell) => {
        const value = cellMetricValue(cell, metric);
        const intensity = maxMetric <= 0 ? 0.45 : 0.35 + 0.55 * (value / maxMetric);
        const isSelected = selectedTefId === cell.stableId;
        const short =
          cell.index?.replace(/^T-\d/, "") ?? cell.stableId.slice(0, 6);

        return (
          <button
            key={cell.stableId}
            type="button"
            title={`${cell.index ?? cell.stableId}: ${cell.title} (${metric === "strength" ? `${Math.round(value * 100)}%` : value})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTefId(cell.stableId);
            }}
            className={cn(
              "relative shrink-0 outline-none transition-transform hover:-translate-y-0.5",
              isSelected && "z-10",
            )}
            style={{ width: cubeSvgW, height: cubeSvgH }}
            aria-label={short}
          >
            <svg
              width={cubeSvgW}
              height={cubeSvgH}
              viewBox={`0 0 ${cubeSvgW} ${cubeSvgH}`}
              className="block overflow-visible"
              aria-hidden
            >
              <IsoBox
                x={0}
                y={TEF_CUBE_DEPTH * 0.42}
                w={TEF_CUBE}
                h={TEF_CUBE}
                d={TEF_CUBE_DEPTH}
                rgb={rgb}
                intensity={intensity}
                selected={isSelected}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/** Flat isometric box: left(front), right, top faces as polygons. */
function IsoBox({
  x,
  y,
  w,
  h,
  d,
  rgb,
  intensity,
  selected,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
  rgb: readonly [number, number, number];
  intensity: number;
  selected: boolean;
}) {
  // Classic 2:1 isometric: depth projects up-right by (d, -d/2) visually;
  // we use (d * 0.7, -d * 0.5) for a readable upright bar look.
  const dx = d * 0.72;
  const dy = d * 0.42;

  const front = tefCellFill(rgb, intensity);
  const side = tefCellFill(rgb, Math.max(0.15, intensity - 0.22));
  const top = tefCellFill(rgb, Math.min(1, intensity + 0.18));
  const stroke = selected ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)";
  const strokeW = selected ? 1.25 : 0.75;

  // Front face (left parallelogram-ish rectangle in iso)
  const f0 = `${x},${y + dy}`;
  const f1 = `${x + w},${y + dy}`;
  const f2 = `${x + w},${y + dy + h}`;
  const f3 = `${x},${y + dy + h}`;

  // Right face
  const r0 = `${x + w},${y + dy}`;
  const r1 = `${x + w + dx},${y}`;
  const r2 = `${x + w + dx},${y + h}`;
  const r3 = `${x + w},${y + dy + h}`;

  // Top face
  const t0 = `${x},${y + dy}`;
  const t1 = `${x + dx},${y}`;
  const t2 = `${x + w + dx},${y}`;
  const t3 = `${x + w},${y + dy}`;

  return (
    <g>
      <polygon
        points={`${t0} ${t1} ${t2} ${t3}`}
        fill={top}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinejoin="miter"
      />
      <polygon
        points={`${r0} ${r1} ${r2} ${r3}`}
        fill={side}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinejoin="miter"
      />
      <polygon
        points={`${f0} ${f1} ${f2} ${f3}`}
        fill={front}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinejoin="miter"
      />
    </g>
  );
}
