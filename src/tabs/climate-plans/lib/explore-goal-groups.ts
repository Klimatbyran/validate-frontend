import type { GoalsGroupById, QuantifiedGoal } from "./explore-types";
import type { GoalTrackRow, GoalTrackStatus } from "./explore-goals";

export interface GoalAtlasItem {
  id: string;
  municipalityId: string;
  municipalityName: string;
  parisMentioned: boolean | null;
  onePointFiveMentioned: boolean | null;
  carbonBudgetReferenced: boolean | null;
  row: GoalTrackRow;
}

export interface GoalAtlasCluster {
  key: string;
  label: string;
  /** 0–1 accent for cluster chrome (reduction intensity, urgency, etc.). */
  accent: number;
  items: GoalAtlasItem[];
}

export const REDUCTION_BANDS = [
  { key: "unquantified", label: "Unquantified" },
  { key: "lt25", label: "Under 25%" },
  { key: "25-49", label: "25–49%" },
  { key: "50-74", label: "50–74%" },
  { key: "75-99", label: "75–99%" },
  { key: "net-zero", label: "100% / net zero" },
] as const;

export type ReductionBandKey = (typeof REDUCTION_BANDS)[number]["key"];

export function reductionBandKey(
  percent: number | null,
): ReductionBandKey {
  if (percent == null) return "unquantified";
  if (percent >= 100) return "net-zero";
  if (percent >= 75) return "75-99";
  if (percent >= 50) return "50-74";
  if (percent >= 25) return "25-49";
  if (percent >= 0) return "lt25";
  return "unquantified";
}

export type DeadlineBucket = "passed" | "near" | "mid" | "far" | "unknown";

export function deadlineBucket(
  goal: QuantifiedGoal,
  nowYear: number,
): DeadlineBucket {
  if (goal.targetYear == null) return "unknown";
  const yearsLeft = goal.targetYear - nowYear;
  if (yearsLeft < 0) return "passed";
  if (yearsLeft <= 2) return "near";
  if (yearsLeft <= 10) return "mid";
  return "far";
}

const DEADLINE_META: Record<
  DeadlineBucket,
  { label: string; accent: number }
> = {
  passed: { label: "Deadline passed", accent: 1 },
  near: { label: "Within 2 years", accent: 0.85 },
  mid: { label: "3–10 years out", accent: 0.55 },
  far: { label: "Beyond 10 years", accent: 0.3 },
  unknown: { label: "No target year", accent: 0.1 },
};

/** Shared status labels for list + atlas. */
export const GOAL_STATUS_LABEL: Record<GoalTrackStatus, string> = {
  ahead: "Ahead",
  "on-track": "On track",
  "off-track": "Off track",
  "too-early": "Too early",
  "missing-emissions": "No emissions series",
  "not-quantified": "Not quantified",
};

const STATUS_ACCENT: Record<GoalTrackStatus, number> = {
  ahead: 0.9,
  "on-track": 0.7,
  "off-track": 1,
  "too-early": 0.35,
  "missing-emissions": 0.25,
  "not-quantified": 0.15,
};

function parisClusterKey(item: GoalAtlasItem): string {
  if (item.parisMentioned === true) return "paris-yes";
  if (item.parisMentioned === false) return "paris-no";
  return "paris-unknown";
}

const PARIS_META: Record<string, { label: string; accent: number }> = {
  "paris-yes": { label: "Plan mentions Paris", accent: 0.85 },
  "paris-no": { label: "Plan does not mention Paris", accent: 0.35 },
  "paris-unknown": { label: "Paris flag unknown", accent: 0.15 },
};

function scopeKey(scope: string): string {
  const trimmed = scope.trim();
  return trimmed || "unspecified";
}

function scopeLabel(scope: string): string {
  const key = scopeKey(scope);
  if (key === "unspecified") return "Scope unspecified";
  return key.replace(/_/g, " ");
}

const NODE_SIZE = 36;
const NODE_GAP = 6;

/**
 * Concentric-ring positions so dense clusters don't overlap.
 * Returns cluster diameter and per-item offsets from center.
 */
export function layoutClusterNodes(
  count: number,
): { size: number; positions: { x: number; y: number }[] } {
  if (count <= 0) return { size: 120, positions: [] };
  if (count === 1) return { size: 120, positions: [{ x: 0, y: 0 }] };

  const positions: { x: number; y: number }[] = [];
  let ring = 0;
  let placed = 0;
  let maxRadius = 0;

  while (placed < count && ring < 12) {
    if (ring === 0) {
      positions.push({ x: 0, y: 0 });
      placed += 1;
      ring += 1;
      continue;
    }
    const radius = ring * (NODE_SIZE + NODE_GAP);
    const capacity = Math.max(
      6,
      Math.floor((2 * Math.PI * radius) / (NODE_SIZE + NODE_GAP)),
    );
    const onRing = Math.min(capacity, count - placed);
    for (let i = 0; i < onRing; i++) {
      const angle = (i / onRing) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    maxRadius = radius;
    placed += onRing;
    ring += 1;
  }

  const size = Math.max(140, Math.ceil(maxRadius * 2 + NODE_SIZE + 24));
  return { size: Math.min(size, 360), positions };
}

/**
 * Cluster scored goal rows for the atlas layout.
 * Empty clusters are omitted so the layout stays sparse and readable.
 */
export function clusterGoalAtlas(
  items: GoalAtlasItem[],
  groupBy: GoalsGroupById,
  nowYear: number,
): GoalAtlasCluster[] {
  if (groupBy === "reduction") {
    return REDUCTION_BANDS.map((band, index) => {
      const bandItems = items.filter(
        (item) => reductionBandKey(item.row.goal.reductionPercent) === band.key,
      );
      return {
        key: band.key,
        label: band.label,
        accent: index / Math.max(REDUCTION_BANDS.length - 1, 1),
        items: bandItems,
      };
    }).filter((c) => c.items.length > 0);
  }

  if (groupBy === "status") {
    const order: GoalTrackStatus[] = [
      "ahead",
      "on-track",
      "off-track",
      "too-early",
      "missing-emissions",
      "not-quantified",
    ];
    return order
      .map((status) => ({
        key: status,
        label: GOAL_STATUS_LABEL[status],
        accent: STATUS_ACCENT[status],
        items: items.filter((item) => item.row.status === status),
      }))
      .filter((c) => c.items.length > 0);
  }

  if (groupBy === "deadline") {
    const order: DeadlineBucket[] = [
      "passed",
      "near",
      "mid",
      "far",
      "unknown",
    ];
    return order
      .map((bucket) => ({
        key: bucket,
        label: DEADLINE_META[bucket].label,
        accent: DEADLINE_META[bucket].accent,
        items: items.filter(
          (item) => deadlineBucket(item.row.goal, nowYear) === bucket,
        ),
      }))
      .filter((c) => c.items.length > 0);
  }

  if (groupBy === "paris") {
    const order = ["paris-yes", "paris-no", "paris-unknown"];
    return order
      .map((key) => ({
        key,
        label: PARIS_META[key].label,
        accent: PARIS_META[key].accent,
        items: items.filter((item) => parisClusterKey(item) === key),
      }))
      .filter((c) => c.items.length > 0);
  }

  const byScope = new Map<string, GoalAtlasItem[]>();
  for (const item of items) {
    const key = scopeKey(item.row.goal.scope);
    const list = byScope.get(key) ?? [];
    list.push(item);
    byScope.set(key, list);
  }
  return [...byScope.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([key, scopeItems], index, all) => ({
      key,
      label: scopeLabel(key),
      accent: 1 - index / Math.max(all.length, 1),
      items: scopeItems,
    }));
}
