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
} from "../lib/tef-framework";
import type {
  SectorEmissionShare,
  SectorGateMatchRate,
} from "../lib/tef-sector-signals";
import { IsoBox } from "./tef-iso-box";

const MIN_VISIBLE_PILLAR_H = 8;
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
    let maxShare = 0;
    for (const column of columns) {
      if (column.sectorId === "other") continue;
      const row = emissionShares.bySector[column.sectorId as TefSectorId];
      if (!row) continue;
      if (row.tonnes > maxTonnes) maxTonnes = row.tonnes;
      if (row.share > maxShare) maxShare = row.share;
    }

    const heights = new Map<string, number>();
    let maxHeightPx = MIN_VISIBLE_PILLAR_H;
    for (const column of columns) {
      if (column.sectorId === "other") {
        heights.set(column.sectorId, MIN_VISIBLE_PILLAR_H);
        continue;
      }
      const row = emissionShares.bySector[column.sectorId as TefSectorId];
      const share = row?.share ?? 0;
      const tonnes = row?.tonnes ?? 0;
      // Both modes scale to the tallest mapped sector so heights compare.
      const heightRatio =
        heightMode === "share"
          ? maxShare <= 0
            ? 0
            : share / maxShare
          : maxTonnes <= 0
            ? 0
            : tonnes / maxTonnes;
      const heightPx = Math.max(
        MIN_VISIBLE_PILLAR_H,
        heightRatio * MAX_PILLAR_H,
      );
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

  const overviewCols =
    columns.length >= 7
      ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-7"
      : columns.length === 5
        ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
        : columns.length <= 4
          ? "grid-cols-2 md:grid-cols-4"
          : "grid-cols-2 md:grid-cols-3 xl:grid-cols-6";

  return (
    <div className="space-y-3 w-full">
      <div className="relative w-full rounded-lg border border-gray-03/30 bg-gray-05/40 px-2 py-4 sm:px-3 sm:py-5">
        {expandedColumn ? (
          <ExpandedSectorView
            column={expandedColumn}
            heightPx={
              columnHeights.heights.get(expandedColumn.sectorId) ??
              MIN_VISIBLE_PILLAR_H
            }
            pillarSvgH={pillarSvgH}
            share={
              expandedColumn.sectorId === "other"
                ? null
                : (emissionShares.bySector[
                    expandedColumn.sectorId as TefSectorId
                  ]?.share ?? 0)
            }
            tonnes={
              expandedColumn.sectorId === "other"
                ? null
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
          <div
            className={cn(
              "grid w-full gap-1.5 sm:gap-2 items-start justify-items-stretch",
              overviewCols,
            )}
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
              const heightPx =
                columnHeights.heights.get(column.sectorId) ??
                MIN_VISIBLE_PILLAR_H;
              const hitSum = column.cells.reduce((s, c) => s + c.hitCount, 0);

              return (
                <SectorColumn
                  key={column.sectorId}
                  column={column}
                  heightPx={heightPx}
                  pillarSvgH={pillarSvgH}
                  share={sectorId ? (emissions?.share ?? 0) : null}
                  tonnes={sectorId ? (emissions?.tonnes ?? 0) : null}
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
            : `Pillars are bottom-aligned and scaled to the tallest mapped sector (${
                heightMode === "share" ? "by emission share" : "by tonnes"
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
  share: number | null;
  tonnes: number | null;
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
        <div className="shrink-0 flex flex-col items-center gap-2 rounded-md px-3 py-2">
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
          <SectorMeta
            label={column.label}
            code={column.code}
            cellCount={column.cells.length}
            hitSum={hitSum}
            share={share}
            tonnes={tonnes}
            gate={gate}
            large
          />
        </div>

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
  share: number | null;
  tonnes: number | null;
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
        title={`Expand ${column.label}`}
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
        <SectorMeta
          label={column.label}
          code={column.code}
          cellCount={column.cells.length}
          hitSum={hitSum}
          share={share}
          tonnes={tonnes}
          gate={gate}
        />
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

function SectorMeta({
  label,
  code,
  cellCount,
  hitSum,
  share,
  tonnes,
  gate,
  large,
}: {
  label: string;
  code: string;
  cellCount: number;
  hitSum: number;
  share: number | null;
  tonnes: number | null;
  gate: SectorGateMatchRate | null;
  large?: boolean;
}) {
  const emissionsLabel =
    share == null || tonnes == null
      ? "emissions not mapped"
      : `${Math.round(share * 100)}% · ${Math.round(tonnes).toLocaleString()} t`;

  return (
    <div className="text-center space-y-0.5 px-0.5">
      <div
        className={cn(
          "font-semibold text-gray-01 uppercase tracking-wide leading-tight",
          large ? "text-sm" : "text-[11px]",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "font-semibold tabular-nums text-gray-01",
          large ? "text-sm" : "text-[11px]",
          share == null && "font-normal text-gray-02",
        )}
      >
        {emissionsLabel}
      </div>
      <div className={cn("text-gray-02", large ? "text-xs" : "text-[10px]")}>
        {code} · {cellCount} TEFs · {hitSum} hits
      </div>
      {gate ? (
        <div
          className={cn(
            "text-gray-02 tabular-nums",
            large ? "text-xs" : "text-[10px]",
          )}
        >
          gate {gate.matched}/{gate.gated}
        </div>
      ) : null}
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
          maxMetric <= 0 ? 0.45 : Math.max(0.2, value / maxMetric);
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
            onClick={() => onSelectTefId(cell.stableId)}
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
                  expanded ? `${cell.index ?? code} · ${valueLabel}` : undefined
                }
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
