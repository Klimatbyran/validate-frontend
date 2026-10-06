import type {
  ExploreMunicipalityRecord,
  QuantifiedGoal,
  SectorYearEmissions,
} from "./explore-types";
import { findSectorEmissions } from "./explore-alignment";

export type GoalTrackStatus =
  | "on-track"
  | "off-track"
  | "ahead"
  | "too-early"
  | "missing-emissions"
  | "not-quantified";

export interface GoalTrackRow {
  goal: QuantifiedGoal;
  status: GoalTrackStatus;
  baselineEmissions: number | null;
  latestEmissions: number | null;
  latestYear: number | null;
  expectedRemainingShare: number | null;
  actualRemainingShare: number | null;
  explanation: string;
}

function totalForYear(
  byYear: Record<string, Record<string, number>>,
  year: number,
): number | null {
  const sectors = byYear[String(year)];
  if (!sectors) return null;
  const total = Object.values(sectors).reduce((s, n) => s + n, 0);
  return total > 0 ? total : null;
}

function closestYearTotal(
  byYear: Record<string, Record<string, number>>,
  target: number,
): { year: number; total: number } | null {
  const years = Object.keys(byYear)
    .map((y) => Number.parseInt(y, 10))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
  for (const year of years) {
    const total = totalForYear(byYear, year);
    if (total != null) return { year, total };
  }
  return null;
}

/**
 * Linear interpolation between baseline and target:
 * remaining share should be 1 - p * elapsed, where p is the stated reduction
 * fraction (e.g. 0.5 for 50%) and elapsed is (latest - baseline) / (target - baseline).
 */
export function trackGoal(
  goal: QuantifiedGoal,
  emissions: SectorYearEmissions | undefined,
  nowYear: number,
): GoalTrackRow {
  if (
    goal.reductionPercent == null ||
    goal.baselineYear == null ||
    goal.targetYear == null
  ) {
    return {
      goal,
      status: "not-quantified",
      baselineEmissions: null,
      latestEmissions: null,
      latestYear: null,
      expectedRemainingShare: null,
      actualRemainingShare: null,
      explanation:
        "Needs reduction_percentage, baseline_year, and target_year. Qualitative or incomplete goals are listed but not scored.",
    };
  }

  if (!emissions) {
    return {
      goal,
      status: "missing-emissions",
      baselineEmissions: null,
      latestEmissions: null,
      latestYear: null,
      expectedRemainingShare: null,
      actualRemainingShare: null,
      explanation:
        "No territorial totals to compare against. This check uses SMHI-style sector sums, which will not match municipal-operations (scope 1+2) goals.",
    };
  }

  const baseline = closestYearTotal(emissions.byYear, goal.baselineYear);
  const latest = closestYearTotal(
    emissions.byYear,
    Math.min(nowYear, goal.targetYear),
  );
  if (!baseline || !latest) {
    return {
      goal,
      status: "missing-emissions",
      baselineEmissions: baseline?.total ?? null,
      latestEmissions: latest?.total ?? null,
      latestYear: latest?.year ?? null,
      expectedRemainingShare: null,
      actualRemainingShare: null,
      explanation:
        "Could not find a year with a territorial total near the baseline or latest year.",
    };
  }

  const span = goal.targetYear - goal.baselineYear;
  if (span <= 0) {
    return {
      goal,
      status: "not-quantified",
      baselineEmissions: baseline.total,
      latestEmissions: latest.total,
      latestYear: latest.year,
      expectedRemainingShare: null,
      actualRemainingShare: null,
      explanation: "target_year must be after baseline_year.",
    };
  }

  const elapsed = (latest.year - goal.baselineYear) / span;
  if (elapsed < 0.05) {
    return {
      goal,
      status: "too-early",
      baselineEmissions: baseline.total,
      latestEmissions: latest.total,
      latestYear: latest.year,
      expectedRemainingShare: 1,
      actualRemainingShare: latest.total / baseline.total,
      explanation: `Only ${Math.round(elapsed * 100)}% of the way from ${goal.baselineYear} to ${goal.targetYear} — too early to call.`,
    };
  }

  const reduction = goal.reductionPercent / 100;
  const expectedRemainingShare = Math.max(
    0,
    1 - reduction * Math.min(elapsed, 1),
  );
  const actualRemainingShare = latest.total / baseline.total;
  const delta = actualRemainingShare - expectedRemainingShare;

  let status: GoalTrackStatus = "on-track";
  if (delta > 0.05) status = "off-track";
  else if (delta < -0.05) status = "ahead";

  return {
    goal,
    status,
    baselineEmissions: baseline.total,
    latestEmissions: latest.total,
    latestYear: latest.year,
    expectedRemainingShare,
    actualRemainingShare,
    explanation:
      `Linear path from ${goal.reductionPercent}% reduction ${goal.baselineYear}→${goal.targetYear}. ` +
      `Compared territorial totals ${baseline.year} (${Math.round(baseline.total)}) vs ${latest.year} (${Math.round(latest.total)}). ` +
      `Expected remaining ${(expectedRemainingShare * 100).toFixed(0)}%, actual ${(actualRemainingShare * 100).toFixed(0)}%. ` +
      `Mismatch vs municipal-operations goals is expected.`,
  };
}

export function trackMunicipalityGoals(
  record: ExploreMunicipalityRecord,
  allEmissions: SectorYearEmissions[],
  nowYear: number,
): GoalTrackRow[] {
  const emissions = findSectorEmissions(allEmissions, record.name);
  return record.goals.map((goal) => trackGoal(goal, emissions, nowYear));
}
