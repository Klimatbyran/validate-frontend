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

const MIN_PILLAR_H = 44;
const MAX_PILLAR_H = 240;
/** Compact overview cubes — size fixed until effectiveness attribution. */
const TEF_CUBE = 44;
const TEF_CUBE_DEPTH = 16;
/** Expanded sector focus cubes — room for TEF name on the front face. */
const TEF_CUBE_EXPANDED_W = 148;
const TEF_CUBE_EXPANDED_H = 92;
const TEF_CUBE_EXPANDED_D = 22;
const PILLAR_W = 128;
const PILLAR_DEPTH = 34;
const PILLAR_W_EXPANDED = 168;

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
    return { heights, maxHeightPx };
  }, [columns, emissionShares, heightMode]);

  const pillarSvgH = columnHeights.maxHeightPx + PILLAR_DEPTH + 4;
  const expandedColumn =
    selectedSectorId == null
      ? null
      : (columns.find((c) => c.sectorId === selectedSectorId) ?? null);

  return (
    <div className="space-y-3 w-full">
      <div className="relative w-full rounded-lg border border-gray-03/30 bg-gray-05/40 px-2 py-4 sm:px-3 sm:py-5">
        {expandedColumn ? (
          <ExpandedSectorView
            column={expandedColumn}
            heightPx={
              columnHeights.heights.get(expandedColumn.sectorId) ?? MIN_PILLAR_H
            }
            pillarSvgH={pillarSvgH}
            share={
              expandedColumn.sectorId === "other"
                ? 0
                : (emissionShares.bySector[
                    expandedColumn.sectorId as TefSectorId
                  ]?.share ?? 0)
            }
            tonnes={
              expandedColumn.sectorId === "other"
                ? 0
                : (emissionShares.bySector[
                    expandedColumn.sectorId as TefSectorId
                  ]?.tonnes ?? 0)
            }
            gate={
              expandedColumn.sectorId !== "other" &&
              gateRates.hasAnyGateData &&
              (gateRates.bySector[expandedColumn.sectorId as TefSectorId]
                ?.gated ?? 0) > 0
                ? gateRates.bySector[expandedColumn.sectorId as TefSectorId]
                : null
            }
            metric={metric}
            maxMetric={maxMetric}
            selectedTefId={selectedTefId}
            onSelectTefId={onSelectTefId}
            onBack={() => onSelectSectorId(null)}
          />
        ) : (
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
                  metric={metric}
                  maxMetric={maxMetric}
                  selectedTefId={selectedTefId}
                  onSelectSector={() => onSelectSectorId(column.sectorId)}
                  onSelectTefId={onSelectTefId}
                />
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-02 mt-4 text-center max-w-4xl mx-auto">
          {expandedColumn
            ? "Expanded sector — cubes show TEF names. Click a cube for detail, or Back to all sectors."
            : `Pillars are bottom-aligned (${
                heightMode === "share"
                  ? "emission share"
                  : "tonnes vs tallest sector"
              }). Click a sector to expand it with named TEF cubes.`}
          {emissionShares.totalTonnes <= 0
            ? " No sector emissions matched this scope yet — pillars stay at minimum height."
            : ""}
        </p>
      </div>
    </div>
  );
}

function ExpandedSectorView({
  column,
  heightPx,
  pillarSvgH,
  share,
  tonnes,
  gate,
  metric,
  maxMetric,
  selectedTefId,
  onSelectTefId,
  onBack,
}: {
  column: TefFrameworkSectorColumn;
  heightPx: number;
  pillarSvgH: number;
  share: number;
  tonnes: number;
  gate: SectorGateMatchRate | null;
  metric: TefFrameworkMetric;
  maxMetric: number;
  selectedTefId: string | null;
  onSelectTefId: (id: string) => void;
  onBack: () => void;
}) {
  const hitSum = column.cells.reduce((s, c) => s + c.hitCount, 0);
  const svgW = PILLAR_W_EXPANDED + PILLAR_DEPTH;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm px-3 py-1.5 rounded-md border border-gray-03/50 text-gray-01 hover:bg-gray-03/30"
        >
          ← All sectors
        </button>
        <span className="text-sm text-gray-02">
          Showing {column.label} only · click a cube for measure detail
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 flex flex-col items-center gap-2 outline-none rounded-md px-3 py-2 hover:bg-gray-04/50"
          title="Back to all sectors"
        >
          <svg
            width={svgW}
            height={pillarSvgH}
            viewBox={`0 0 ${svgW} ${pillarSvgH}`}
            className="block overflow-visible"
            aria-hidden
          >
            <IsoBox
              x={0}
              y={pillarSvgH - heightPx - PILLAR_DEPTH * 0.42}
              w={PILLAR_W_EXPANDED}
              h={heightPx}
              d={PILLAR_DEPTH}
              rgb={column.rgb}
              intensity={0.88}
              selected
            />
          </svg>
          <div className="text-center space-y-0.5">
            <div className="text-sm font-semibold text-gray-01 uppercase tracking-wide">
              {column.label}
            </div>
            <div className="text-sm font-semibold tabular-nums text-gray-01">
              {Math.round(share * 100)}%
              <span className="text-gray-02 font-normal text-xs">
                {" "}
                · {Math.round(tonnes).toLocaleString()} t
              </span>
            </div>
            <div className="text-xs text-gray-02">
              {column.code} · {column.cells.length} TEFs · {hitSum} hits
            </div>
            {gate ? (
              <div className="text-xs text-gray-02 tabular-nums">
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
          mode="expanded"
          className="flex-1"
        />
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
  metric: TefFrameworkMetric;
  maxMetric: number;
  selectedTefId: string | null;
  onSelectSector: () => void;
  onSelectTefId: (id: string) => void;
}) {
  const svgW = PILLAR_W + PILLAR_DEPTH;

  return (
    <div className="flex flex-col items-center min-w-0 rounded-md px-0.5 py-1.5 transition-colors hover:bg-gray-04/40">
      <button
        type="button"
        onClick={onSelectSector}
        className="group flex flex-col items-center gap-1.5 outline-none w-full"
        title={`Expand ${column.label}: ${Math.round(share * 100)}% · ${Math.round(tonnes).toLocaleString()} t · ${hitSum} TEF hits`}
      >
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
            intensity={0.7}
            selected={false}
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
        mode="compact"
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
  mode,
  className,
}: {
  cells: TefFrameworkCell[];
  rgb: readonly [number, number, number];
  metric: TefFrameworkMetric;
  maxMetric: number;
  selectedTefId: string | null;
  onSelectTefId: (id: string) => void;
  mode: "compact" | "expanded";
  className?: string;
}) {
  if (cells.length === 0) {
    return (
      <div className="mt-2 w-full text-center text-[10px] text-gray-02/70 border border-dashed border-gray-03/40 rounded-md py-2">
        no matches
      </div>
    );
  }

  const expanded = mode === "expanded";
  const faceW = expanded ? TEF_CUBE_EXPANDED_W : TEF_CUBE;
  const faceH = expanded ? TEF_CUBE_EXPANDED_H : TEF_CUBE;
  const depth = expanded ? TEF_CUBE_EXPANDED_D : TEF_CUBE_DEPTH;
  const dx = depth * 0.72;
  const dy = depth * 0.42;
  const cubeSvgW = Math.ceil(faceW + dx);
  const cubeSvgH = Math.ceil(faceH + dy + 2);

  return (
    <div
      className={cn(
        "mt-2 w-full flex flex-wrap content-start",
        expanded
          ? "justify-start gap-x-3 gap-y-3"
          : "justify-center gap-x-1.5 gap-y-2",
        className,
      )}
    >
      {cells.map((cell) => {
        const value = cellMetricValue(cell, metric);
        const intensity =
          maxMetric <= 0 ? 0.45 : 0.35 + 0.55 * (value / maxMetric);
        const isSelected = selectedTefId === cell.stableId;
        const code =
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
            aria-label={`${cell.title} ${valueLabel}`}
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
                w={faceW}
                h={faceH}
                d={depth}
                rgb={rgb}
                intensity={intensity}
                selected={isSelected}
                frontLabel={expanded ? undefined : code}
                frontValue={expanded ? undefined : valueLabel}
                frontTitle={expanded ? cell.title : undefined}
                frontMeta={
                  expanded
                    ? `${cell.index ?? code} · ${valueLabel}`
                    : undefined
                }
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
  frontTitle,
  frontMeta,
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
  /** Multi-line TEF name for expanded cubes (HTML via foreignObject). */
  frontTitle?: string;
  frontMeta?: string;
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
  const labelY = y + dy + h * 0.36;
  const valueY = y + dy + h * 0.68;
  const pad = 6;

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
      {frontTitle ? (
        <foreignObject
          x={x + pad}
          y={y + dy + pad}
          width={Math.max(0, w - pad * 2)}
          height={Math.max(0, h - pad * 2)}
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              color: "#fff",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                lineHeight: 1.25,
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {frontTitle}
            </div>
            {frontMeta ? (
              <div
                style={{
                  fontSize: "10px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  opacity: 0.9,
                  marginTop: 4,
                }}
              >
                {frontMeta}
              </div>
            ) : null}
          </div>
        </foreignObject>
      ) : frontLabel || frontValue ? (
        <g
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {frontLabel ? (
            <text
              x={textX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.92)"
              fontSize={Math.max(8, Math.min(10, w * 0.2))}
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
              fontSize={Math.max(10, Math.min(13, w * 0.26))}
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
  const maxChars = faceW >= 42 ? 9 : faceW >= 36 ? 8 : 7;
  if (label.length <= maxChars) return label;
  return `${label.slice(0, maxChars - 1)}…`;
}
