import { describe, expect, it } from "vitest";
import {
  clusterGoalAtlas,
  deadlineBucket,
  layoutClusterNodes,
  reductionBandKey,
  type GoalAtlasItem,
} from "./explore-goal-groups";
import type { GoalTrackRow } from "./explore-goals";
import type { QuantifiedGoal } from "./explore-types";

function goal(partial: Partial<QuantifiedGoal>): QuantifiedGoal {
  return {
    description: partial.description ?? "goal",
    reductionPercent: partial.reductionPercent ?? null,
    baselineYear: partial.baselineYear ?? null,
    targetYear: partial.targetYear ?? null,
    scope: partial.scope ?? "",
    sector: partial.sector ?? "",
    commitmentStrength: partial.commitmentStrength ?? "",
    goalType: partial.goalType ?? "",
    sourceQuote: partial.sourceQuote ?? "",
  };
}

function item(
  overrides: Partial<GoalAtlasItem> & {
    status?: GoalTrackRow["status"];
    goal?: Partial<QuantifiedGoal>;
  },
): GoalAtlasItem {
  const g = goal(overrides.goal ?? {});
  return {
    id: overrides.id ?? "1",
    municipalityId: overrides.municipalityId ?? "m1",
    municipalityName: overrides.municipalityName ?? "Nässjö",
    parisMentioned: overrides.parisMentioned ?? null,
    onePointFiveMentioned: overrides.onePointFiveMentioned ?? null,
    carbonBudgetReferenced: overrides.carbonBudgetReferenced ?? null,
    row: {
      goal: g,
      status: overrides.status ?? "not-quantified",
      baselineEmissions: null,
      latestEmissions: null,
      latestYear: null,
      expectedRemainingShare: null,
      actualRemainingShare: null,
      explanation: "",
    },
  };
}

describe("reductionBandKey", () => {
  it("buckets reduction percentages including net zero", () => {
    expect(reductionBandKey(null)).toBe("unquantified");
    expect(reductionBandKey(10)).toBe("lt25");
    expect(reductionBandKey(40)).toBe("25-49");
    expect(reductionBandKey(60)).toBe("50-74");
    expect(reductionBandKey(90)).toBe("75-99");
    expect(reductionBandKey(100)).toBe("net-zero");
  });
});

describe("deadlineBucket", () => {
  it("classifies target years relative to now", () => {
    expect(deadlineBucket(goal({ targetYear: 2020 }), 2026)).toBe("passed");
    expect(deadlineBucket(goal({ targetYear: 2026 }), 2026)).toBe("near");
    expect(deadlineBucket(goal({ targetYear: 2028 }), 2026)).toBe("near");
    expect(deadlineBucket(goal({ targetYear: 2029 }), 2026)).toBe("mid");
    expect(deadlineBucket(goal({ targetYear: 2036 }), 2026)).toBe("mid");
    expect(deadlineBucket(goal({ targetYear: 2037 }), 2026)).toBe("far");
    expect(deadlineBucket(goal({ targetYear: null }), 2026)).toBe("unknown");
  });
});

describe("layoutClusterNodes", () => {
  it("keeps dense clusters from stacking on one tiny ring", () => {
    const { positions, size } = layoutClusterNodes(10);
    expect(positions).toHaveLength(10);
    expect(size).toBeGreaterThan(140);
    const minDist = positions.slice(1).reduce((min, pos) => {
      const prev = positions[0];
      const d = Math.hypot(pos.x - prev.x, pos.y - prev.y);
      return Math.min(min, d);
    }, Infinity);
    // Center vs first ring should leave room for 36px nodes.
    expect(minDist).toBeGreaterThanOrEqual(36);
  });
});

describe("clusterGoalAtlas", () => {
  it("groups by reduction and omits empty bands", () => {
    const clusters = clusterGoalAtlas(
      [
        item({ id: "a", goal: { reductionPercent: 50 }, status: "off-track" }),
        item({ id: "b", goal: { reductionPercent: 100 }, status: "too-early" }),
        item({
          id: "c",
          goal: { reductionPercent: null },
          status: "not-quantified",
        }),
      ],
      "reduction",
      2026,
    );
    expect(clusters.map((c) => c.key)).toEqual([
      "unquantified",
      "50-74",
      "net-zero",
    ]);
    expect(clusters.find((c) => c.key === "50-74")?.items).toHaveLength(1);
  });

  it("groups by Paris plan flag", () => {
    const clusters = clusterGoalAtlas(
      [
        item({ id: "a", parisMentioned: true, goal: { reductionPercent: 50 } }),
        item({
          id: "b",
          parisMentioned: false,
          goal: { reductionPercent: 10 },
        }),
        item({ id: "c", parisMentioned: null, goal: { reductionPercent: 20 } }),
      ],
      "paris",
      2026,
    );
    expect(clusters.map((c) => c.key)).toEqual([
      "paris-yes",
      "paris-no",
      "paris-unknown",
    ]);
  });

  it("groups passed deadlines", () => {
    const clusters = clusterGoalAtlas(
      [
        item({
          id: "a",
          goal: { reductionPercent: 10, targetYear: 2025 },
          status: "off-track",
        }),
        item({
          id: "b",
          goal: { reductionPercent: 50, targetYear: 2040 },
          status: "on-track",
        }),
      ],
      "deadline",
      2026,
    );
    expect(clusters[0]?.key).toBe("passed");
    expect(clusters[0]?.items[0]?.id).toBe("a");
  });
});
