/**
 * Three-prong strength snapshot for Website visuals v2.
 *
 * Maps the three overview KPIs onto 0–1 axes for a triangle diagram.
 * Axes are independent comparators — not a single “plan quality” score.
 */

import type { FocusMatchVerdict } from "./website-kpis";
import { focusMatchMapValue } from "./website-v2-kpis";

/** Soft cap: this many unique actions maps to a full volume axis. */
export const VOLUME_AXIS_FULL_AT = 20;

export type StrengthTriangleAxisId =
  | "actionDetail"
  | "biggestSource"
  | "actionsFound";

export interface StrengthTriangleAxis {
  id: StrengthTriangleAxisId;
  /** Short vertex label. */
  label: string;
  /** Human value shown under the label. */
  display: string;
  /** 0–1 strength for the polygon; null when the axis cannot be scored. */
  strength: number | null;
  /** True when the axis is volume (not quality). */
  volumeOnly?: boolean;
}

export interface StrengthTriangleModel {
  axes: [StrengthTriangleAxis, StrengthTriangleAxis, StrengthTriangleAxis];
  /** True when at least one axis has a numeric strength. */
  hasAnyStrength: boolean;
}

export function normalizeActionDetailStrength(
  score: number | null | undefined,
): number | null {
  if (score == null || Number.isNaN(score)) return null;
  return Math.min(1, Math.max(0, score / 100));
}

export function normalizeBiggestSourceStrength(
  verdict: FocusMatchVerdict,
): number | null {
  const mapped = focusMatchMapValue(verdict);
  if (mapped == null) return null;
  return mapped;
}

export function normalizeActionsFoundStrength(
  uniqueMeasureCount: number,
  fullAt = VOLUME_AXIS_FULL_AT,
): number {
  if (uniqueMeasureCount <= 0 || fullAt <= 0) return 0;
  return Math.min(1, uniqueMeasureCount / fullAt);
}

export function buildStrengthTriangleModel(input: {
  concretenessScore: number | null;
  focusVerdict: FocusMatchVerdict;
  focusShortLabel: string;
  uniqueMeasureCount: number;
}): StrengthTriangleModel {
  const actionDetail = normalizeActionDetailStrength(input.concretenessScore);
  const biggestSource = normalizeBiggestSourceStrength(input.focusVerdict);
  const actionsFound = normalizeActionsFoundStrength(input.uniqueMeasureCount);

  const axes: StrengthTriangleModel["axes"] = [
    {
      id: "actionDetail",
      label: "Action detail",
      display:
        actionDetail == null ? "—" : `${Math.round(actionDetail * 100)}/100`,
      strength: actionDetail,
    },
    {
      id: "biggestSource",
      label: "Biggest-source fit",
      display: input.focusShortLabel,
      strength: biggestSource,
    },
    {
      id: "actionsFound",
      label: "Actions found",
      display: String(input.uniqueMeasureCount),
      strength: actionsFound,
      volumeOnly: true,
    },
  ];

  return {
    axes,
    hasAnyStrength: axes.some((a) => a.strength != null),
  };
}

/** Equilateral triangle vertices: top, bottom-right, bottom-left (viewBox 0–100). */
export const TRIANGLE_VERTICES = [
  { x: 50, y: 8 },
  { x: 92, y: 88 },
  { x: 8, y: 88 },
] as const;

export function pointOnSpoke(
  vertexIndex: 0 | 1 | 2,
  strength: number,
  center = { x: 50, y: 61.333 },
): { x: number; y: number } {
  const t = Math.min(1, Math.max(0, strength));
  const vertex = TRIANGLE_VERTICES[vertexIndex];
  return {
    x: center.x + (vertex.x - center.x) * t,
    y: center.y + (vertex.y - center.y) * t,
  };
}

/** Closed polygon points for the filled strength shape. */
export function strengthPolygonPoints(
  strengths: [number | null, number | null, number | null],
): string {
  return strengths
    .map((s, i) => {
      const p = pointOnSpoke(i as 0 | 1 | 2, s ?? 0);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");
}

export function guideRingPoints(fraction: number): string {
  const f = Math.min(1, Math.max(0, fraction));
  return ([0, 1, 2] as const)
    .map((i) => {
      const p = pointOnSpoke(i, f);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");
}
