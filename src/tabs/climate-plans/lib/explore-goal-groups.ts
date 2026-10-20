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
  hint: string;
  /** 0–1 accent for cluster chrome (reduction intensity, urgency, etc.). */
  accent: number;
  items: GoalAtlasItem[];
}

export const REDUCTION_BANDS = [
  { key: "unquantified", label: "Unquantified", min: null, max: null },
  { key: "lt25", label: "Under 25%", min: 0, max: 25 },
  { key: "25-49", label: "25–49%", min: 25, max: 50 },
  { key: "50-74", label: "50–74%", min: 50, max: 75 },
  { key: "75-99", label: "75–99%", min: 75, max: 100 },
  { key: "net-zero", label: "100% / net zero", min: 100, max: null },
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
  { label: string; hint: string; accent: number }
> = {
  passed: {
    label: "Deadline passed",
    hint: "target_year is before this calendar year",
    accent: 1,
  },
  near: {
    label: "Within 2 years",
    hint: "target_year is this year or next",
    accent: 0.85,
  },
  mid: {
    label: "3–10 years out",
    hint: "medium-horizon targets",
    accent: 0.55,
  },
  far: {
    label: "Beyond 10 years",
    hint: "long-horizon / net-zero style dates",
    accent: 0.3,
  },
  unknown: {
    label: "No target year",
    hint: "cannot place on a timeline",
    accent: 0.1,
  },
};

const STATUS_META: Record<
  GoalTrackStatus,
  { label: string; hint: string; accent: number }
> = {
  ahead: { label: "Ahead", hint: "actual remaining well below linear path", accent: 0.9 },
  "on-track": {
    label: "On track",
    hint: "within ±5pp of linear path",
    accent: 0.7,
  },
  "off-track": {
    label: "Off track",
    hint: "actual remaining >5pp above linear path",
    accent: 1,
  },
  "too-early": {
    label: "Too early",
    hint: "<5% of the way through the goal window",
    accent: 0.35,
  },
  "missing-emissions": {
    label: "No emissions series",
    hint: "cannot score against territorial totals",
    accent: 0.25,
  },
  "not-quantified": {
    label: "Not quantified",
    hint: "missing reduction %, baseline, or target year",
    accent: 0.15,
  },
};

function parisClusterKey(item: GoalAtlasItem): string {
  if (item.parisMentioned === true) return "paris-yes";
  if (item.parisMentioned === false) return "paris-no";
  return "paris-unknown";
}

const PARIS_META: Record<
  string,
  { label: string; hint: string; accent: number }
> = {
  "paris-yes": {
    label: "Plan mentions Paris",
    hint: "framework_alignment.paris_agreement_mentioned on the municipality extract",
    accent: 0.85,
  },
  "paris-no": {
    label: "Plan does not mention Paris",
    hint: "explicit false on the extract",
    accent: 0.35,
  },
  "paris-unknown": {
    label: "Paris flag unknown",
    hint: "alignment field missing on this extract",
    accent: 0.15,
  },
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
        hint: "Buckets on reduction_percentage (100% treated as net zero)",
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
      .map((status) => {
        const meta = STATUS_META[status];
        return {
          key: status,
          label: meta.label,
          hint: meta.hint,
          accent: meta.accent,
          items: items.filter((item) => item.row.status === status),
        };
      })
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
      .map((bucket) => {
        const meta = DEADLINE_META[bucket];
        return {
          key: bucket,
          label: meta.label,
          hint: meta.hint,
          accent: meta.accent,
          items: items.filter(
            (item) => deadlineBucket(item.row.goal, nowYear) === bucket,
          ),
        };
      })
      .filter((c) => c.items.length > 0);
  }

  if (groupBy === "paris") {
    const order = ["paris-yes", "paris-no", "paris-unknown"];
    return order
      .map((key) => {
        const meta = PARIS_META[key];
        return {
          key,
          label: meta.label,
          hint: meta.hint,
          accent: meta.accent,
          items: items.filter((item) => parisClusterKey(item) === key),
        };
      })
      .filter((c) => c.items.length > 0);
  }

  // scope
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
      hint: "own_commitments.scope from the emission targets extract",
      accent: 1 - index / Math.max(all.length, 1),
      items: scopeItems,
    }));
}
