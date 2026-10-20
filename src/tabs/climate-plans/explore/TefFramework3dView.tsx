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
const TEF_CUBE = 36;
const TEF_CUBE_DEPTH = 14;
const PILLAR_W = 100;
const PILLAR_DEPTH = 28;

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
  const columnHeights = useMemo(() => {
    let maxTonnes = 0;
    for (const column of columns) {
      if (column.sectorId === "other") continue;
      const tonnes =
        emissionShares.bySector[column.sectorId as TefSectorId]?.tonnes ?? 0;
      if (tonnes > maxTonnes) maxTonnes = tonnes;
    }

    const heights = new Map<string, number>();
    let maxHeightPx = MIN_PILLAR_H;
    for (const column of columns) {
      const sectorId =
        column.sectorId === "other" ? null : (column.sectorId as TefSectorId);
      const emissions = sectorId ? emissionShares.bySector[sectorId] : null;
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
      heights.set(column.sectorId, heightPx);
      if (heightPx > maxHeightPx) maxHeightPx = heightPx;
    }
    return { heights, maxHeightPx, maxTonnes };
  }, [columns, emissionShares, heightMode]);

  const pillarSvgH = columnHeights.maxHeightPx + PILLAR_DEPTH + 4;

  return (
    <div className="space-y-3 w-full">
      <div className="relative w-full rounded-lg border border-gray-03/30 bg-gray-05/40 px-2 py-4 sm:px-3 sm:py-5">
        <div className="grid w-full gap-1.5 sm:gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 items-start justify-items-stretch">
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
            const heightPx =
              columnHeights.heights.get(column.sectorId) ?? MIN_PILLAR_H;
            const isSelected = selectedSectorId === column.sectorId;
            const hitSum = column.cells.reduce((s, c) => s + c.hitCount, 0);

            return (
              <SectorColumn
                key={column.sectorId}
                column={column}
                heightPx={heightPx}
                pillarSvgH={pillarSvgH}
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

        <p className="text-xs text-gray-02 mt-4 text-center max-w-4xl mx-auto">
          Pillars are bottom-aligned so heights compare across sectors (
          {heightMode === "share"
            ? "share of mapped territorial emissions"
            : "tonnes vs tallest sector"}
          ). Cubes are TEFs in this scope — size fixed for now; later it scales
          with reduction effectiveness.
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
  pillarSvgH,
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
  pillarSvgH: number;
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

  return (
    <div
      className={cn(
        "flex flex-col items-center min-w-0 rounded-md px-0.5 py-1.5 transition-colors",
        selected ? "bg-gray-03/25 ring-1 ring-gray-01/30" : "hover:bg-gray-04/40",
      )}
    >
      <button
        type="button"
        onClick={onSelectSector}
        className="group flex flex-col items-center gap-1.5 outline-none w-full"
        title={`${column.label}: ${Math.round(share * 100)}% · ${Math.round(tonnes).toLocaleString()} t · ${hitSum} TEF hits`}
      >
        {/* Shared svg height + bottom-placed box → comparable pillar heights */}
        <svg
          width={svgW}
          height={pillarSvgH}
          viewBox={`0 0 ${svgW} ${pillarSvgH}`}
          className="shrink-0 overflow-visible mx-auto block"
          aria-hidden
        >
          <IsoBox
            x={0}
            y={pillarSvgH - heightPx - PILLAR_DEPTH * 0.42}
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
      <div className="mt-2 w-full text-center text-[10px] text-gray-02/70 border border-dashed border-gray-03/40 rounded-md py-2">
        no matches
      </div>
    );
  }

  const dx = TEF_CUBE_DEPTH * 0.72;
  const dy = TEF_CUBE_DEPTH * 0.42;
  const cubeSvgW = Math.ceil(TEF_CUBE + dx);
  const cubeSvgH = Math.ceil(TEF_CUBE + dy + 2);

  return (
    <div className="mt-2 w-full flex flex-wrap justify-center gap-x-1 gap-y-1.5 content-start">
      {cells.map((cell) => {
        const value = cellMetricValue(cell, metric);
        const intensity =
          maxMetric <= 0 ? 0.45 : 0.35 + 0.55 * (value / maxMetric);
        const isSelected = selectedTefId === cell.stableId;
        const short =
          cell.index?.replace(/^T-\d/, "") ?? cell.stableId.slice(0, 6);
        const valueLabel =
          metric === "strength" ? `${Math.round(value * 100)}%` : String(value);

        return (
          <button
            key={cell.stableId}
            type="button"
            title={`${cell.index ?? cell.stableId}: ${cell.title} (${valueLabel})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTefId(cell.stableId);
            }}
            className={cn(
              "relative shrink-0 outline-none transition-transform hover:-translate-y-0.5",
              isSelected && "z-10",
            )}
            style={{ width: cubeSvgW, height: cubeSvgH }}
            aria-label={`${short} ${valueLabel}`}
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
                y={0}
                w={TEF_CUBE}
                h={TEF_CUBE}
                d={TEF_CUBE_DEPTH}
                rgb={rgb}
                intensity={intensity}
                selected={isSelected}
                frontLabel={short}
                frontValue={valueLabel}
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
  frontLabel,
  frontValue,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
  rgb: readonly [number, number, number];
  intensity: number;
  selected: boolean;
  frontLabel?: string;
  frontValue?: string;
}) {
  const dx = d * 0.72;
  const dy = d * 0.42;

  const front = tefCellFill(rgb, intensity);
  const side = tefCellFill(rgb, Math.max(0.15, intensity - 0.22));
  const top = tefCellFill(rgb, Math.min(1, intensity + 0.18));
  const stroke = selected ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)";
  const strokeW = selected ? 1.25 : 0.75;

  const f0 = `${x},${y + dy}`;
  const f1 = `${x + w},${y + dy}`;
  const f2 = `${x + w},${y + dy + h}`;
  const f3 = `${x},${y + dy + h}`;

  const r0 = `${x + w},${y + dy}`;
  const r1 = `${x + w + dx},${y}`;
  const r2 = `${x + w + dx},${y + h}`;
  const r3 = `${x + w},${y + dy + h}`;

  const t0 = `${x},${y + dy}`;
  const t1 = `${x + dx},${y}`;
  const t2 = `${x + w + dx},${y}`;
  const t3 = `${x + w},${y + dy}`;

  const textX = x + w / 2;
  const labelY = y + dy + h * 0.38;
  const valueY = y + dy + h * 0.68;

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
      {frontLabel || frontValue ? (
        <g
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {frontLabel ? (
            <text
              x={textX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.92)"
              fontSize={Math.max(7, Math.min(9, w * 0.22))}
              fontWeight={500}
            >
              {truncateFaceLabel(frontLabel, w)}
            </text>
          ) : null}
          {frontValue ? (
            <text
              x={textX}
              y={valueY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={Math.max(9, Math.min(12, w * 0.28))}
              fontWeight={700}
            >
              {frontValue}
            </text>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}

function truncateFaceLabel(label: string, faceW: number): string {
  const maxChars = faceW >= 34 ? 8 : faceW >= 28 ? 7 : 6;
  if (label.length <= maxChars) return label;
  return `${label.slice(0, maxChars - 1)}…`;
}
