import type {
  DataPointObservation,
  SuspicionComparison,
  SuspicionFinding,
  SuspicionRuleId,
  SuspicionSeverity,
} from "../types";
import type { PeriodRecord } from "./observations";
import { ratioFactor, relativeDifference } from "./stats";
import { SUSPICION_CONFIG } from "./suspicion-config";
import {
  scope1Value,
  scope2Value,
  scope3CategoryValues,
  scope3CategorySum,
  scope3StatedTotal,
  scope3Total,
  statedTotalEmissions,
} from "./report-totals";

interface FindingInput {
  rule: SuspicionRuleId;
  severity: SuspicionSeverity;
  score: number;
  messageKey: string;
  messageParams: Record<string, string | number>;
  comparisons: SuspicionComparison[];
}

function buildFinding(
  observation: DataPointObservation,
  input: FindingInput,
): SuspicionFinding {
  return {
    id: `${input.rule}:${observation.key}`,
    rule: input.rule,
    severity: input.severity,
    score: input.score,
    companyId: observation.companyId,
    companyName: observation.companyName,
    wikidataId: observation.wikidataId,
    tags: observation.tags,
    dataYear: observation.dataYear,
    reportYear: observation.reportYear,
    reportUrl: observation.reportUrl,
    dataPointId: observation.dataPointId,
    dataPointLabel: observation.dataPointLabel,
    value: observation.value,
    origin: observation.origin,
    verifiedByName: observation.verifiedByName,
    messageKey: input.messageKey,
    messageParams: input.messageParams,
    comparisons: input.comparisons,
  };
}

function severityForRelative(
  relative: number,
  flagRelative: number,
  highRelative: number,
): SuspicionSeverity | null {
  if (relative < flagRelative) return null;
  return relative >= highRelative ? "high" : "medium";
}

function asPercent(relative: number): number {
  return Number((relative * 100).toFixed(1));
}

/** Scope 3 categories that don't add up to the scope 3 total stated alongside them. */
function detectScope3SumMismatch(record: PeriodRecord): SuspicionFinding[] {
  const config = SUSPICION_CONFIG.scope3Sum;
  const stated = scope3StatedTotal(record.emissions);
  const sum = scope3CategorySum(record.emissions);
  const categoryCount = scope3CategoryValues(record.emissions).length;

  if (stated === null || sum === null) return [];
  if (categoryCount < config.minCategories) return [];
  if (Math.abs(stated - sum) < config.minAbsolute) return [];

  const relative = relativeDifference(stated, sum);
  if (relative === null) return [];

  const severity = severityForRelative(
    relative,
    config.flagRelative,
    config.highRelative,
  );
  if (!severity) return [];

  const anchor = record.observations.get("scope3-stated-total");
  if (!anchor) return [];

  return [
    buildFinding(anchor, {
      rule: "scope3-sum-mismatch",
      severity,
      score: relative * 100,
      messageKey: "suspicious.rules.scope3SumMismatch.message",
      messageParams: {
        percent: asPercent(relative),
        categoryCount,
      },
      comparisons: [
        { labelKey: "suspicious.comparison.statedScope3Total", value: stated },
        { labelKey: "suspicious.comparison.categorySum", value: sum },
        {
          labelKey: "suspicious.comparison.difference",
          value: Number((sum - stated).toFixed(2)),
        },
      ],
    }),
  ];
}

/** A single scope 3 category larger than the scope 3 total it belongs to. */
function detectCategoryExceedsTotal(record: PeriodRecord): SuspicionFinding[] {
  const stated = scope3StatedTotal(record.emissions);
  if (stated === null || stated <= 0) return [];

  const limit = stated * SUSPICION_CONFIG.categoryExceedsTotal.overshoot;
  const findings: SuspicionFinding[] = [];

  for (const category of scope3CategoryValues(record.emissions)) {
    if (category.value <= limit) continue;
    const observation = record.observations.get(category.dataPointId);
    if (!observation) continue;

    const factor = ratioFactor(category.value, stated) ?? 1;
    findings.push(
      buildFinding(observation, {
        rule: "category-exceeds-total",
        severity: "high",
        score: factor,
        messageKey: "suspicious.rules.categoryExceedsTotal.message",
        messageParams: { percent: asPercent(category.value / stated) },
        comparisons: [
          {
            labelKey: "suspicious.comparison.statedScope3Total",
            value: stated,
          },
          {
            labelKey: "suspicious.comparison.categoryValue",
            value: category.value,
          },
        ],
      }),
    );
  }

  return findings;
}

/** Scope 1 + 2 + 3 that doesn't add up to the total stated in the same report. */
function detectTotalSumMismatch(record: PeriodRecord): SuspicionFinding[] {
  const config = SUSPICION_CONFIG.totalSum;
  const stated = statedTotalEmissions(record.emissions);
  if (stated === null) return [];

  const scope1 = scope1Value(record.emissions);
  const scope2 = scope2Value(record.emissions);
  const scope3 = scope3Total(record.emissions);

  const parts = [scope1, scope2, scope3].filter(
    (part): part is number => part !== null,
  );
  // Without all three scopes the sum is expected to fall short of the total.
  if (parts.length < 3) return [];

  const sum = parts.reduce((total, part) => total + part, 0);
  if (Math.abs(stated - sum) < config.minAbsolute) return [];

  const relative = relativeDifference(stated, sum);
  if (relative === null) return [];

  const severity = severityForRelative(
    relative,
    config.flagRelative,
    config.highRelative,
  );
  if (!severity) return [];

  const anchor = record.observations.get("stated-total");
  if (!anchor) return [];

  return [
    buildFinding(anchor, {
      rule: "total-sum-mismatch",
      severity,
      score: relative * 100,
      messageKey: "suspicious.rules.totalSumMismatch.message",
      messageParams: { percent: asPercent(relative) },
      comparisons: [
        { labelKey: "suspicious.comparison.statedTotal", value: stated },
        { labelKey: "suspicious.comparison.scopeSum", value: sum },
        { labelKey: "suspicious.comparison.scope1", value: scope1 },
        { labelKey: "suspicious.comparison.scope2", value: scope2 },
        { labelKey: "suspicious.comparison.scope3", value: scope3 },
      ],
    }),
  ];
}

/**
 * Market- and location-based scope 2 orders of magnitude apart. The two
 * methods price the same electricity differently, so they should stay within
 * the same ballpark.
 */
function detectScope2Divergence(record: PeriodRecord): SuspicionFinding[] {
  const config = SUSPICION_CONFIG.scope2;
  const mb = record.emissions?.scope2?.mb;
  const lb = record.emissions?.scope2?.lb;
  if (typeof mb !== "number" || typeof lb !== "number") return [];

  const factor = ratioFactor(mb, lb);
  if (factor === null || factor < config.flagFactor) return [];

  const observation =
    record.observations.get("scope2-mb") ??
    record.observations.get("scope2-lb");
  if (!observation) return [];

  return [
    buildFinding(observation, {
      rule: "scope2-mb-lb-divergence",
      severity: factor >= config.highFactor ? "high" : "medium",
      score: Math.log10(factor) * 10,
      messageKey: "suspicious.rules.scope2Divergence.message",
      messageParams: { factor: Math.round(factor) },
      comparisons: [
        { labelKey: "suspicious.comparison.scope2Mb", value: mb },
        { labelKey: "suspicious.comparison.scope2Lb", value: lb },
      ],
    }),
  ];
}

/**
 * The same number filed under several data points in one report - usually a
 * value copied down a table during extraction rather than a real coincidence.
 */
const DUPLICATE_CANDIDATE_SCOPES = new Set(["scope1", "scope3", "other"]);

function isDuplicateCandidate(observation: DataPointObservation): boolean {
  if (observation.dataPointId === "scope3-stated-total") return false;
  if (observation.dataPointId === "stated-total") return false;
  return DUPLICATE_CANDIDATE_SCOPES.has(observation.scope);
}

function detectDuplicateValues(record: PeriodRecord): SuspicionFinding[] {
  const byValue = new Map<number, DataPointObservation[]>();

  for (const observation of record.observations.values()) {
    if (!isDuplicateCandidate(observation)) continue;
    if (observation.value < SUSPICION_CONFIG.duplicate.minValue) continue;
    const group = byValue.get(observation.value);
    if (group) group.push(observation);
    else byValue.set(observation.value, [observation]);
  }

  const findings: SuspicionFinding[] = [];

  for (const group of byValue.values()) {
    if (group.length < 2) continue;
    for (const observation of group) {
      const others = group
        .filter((other) => other.dataPointId !== observation.dataPointId)
        .map((other) => other.dataPointLabel);

      findings.push(
        buildFinding(observation, {
          rule: "duplicate-value",
          severity: group.length >= 3 ? "high" : "medium",
          score: group.length,
          messageKey: "suspicious.rules.duplicateValue.message",
          messageParams: {
            count: group.length,
            others: others.join(", "),
          },
          comparisons: [
            {
              labelKey: "suspicious.comparison.sharedValue",
              value: observation.value,
            },
            {
              labelKey: "suspicious.comparison.dataPointCount",
              value: group.length,
            },
          ],
        }),
      );
    }
  }

  return findings;
}

/** A value that is really the report's own year, picked up as a number. */
function detectYearLikeValues(record: PeriodRecord): SuspicionFinding[] {
  const config = SUSPICION_CONFIG.yearLike;
  const findings: SuspicionFinding[] = [];

  for (const observation of record.observations.values()) {
    const { value } = observation;
    if (!Number.isInteger(value)) continue;
    if (value < config.minYear || value > config.maxYear) continue;
    if (value !== observation.dataYear && value !== observation.reportYear) {
      continue;
    }

    findings.push(
      buildFinding(observation, {
        rule: "value-looks-like-year",
        severity: "medium",
        score: 1,
        messageKey: "suspicious.rules.valueLooksLikeYear.message",
        messageParams: { year: value },
        comparisons: [
          {
            labelKey: "suspicious.comparison.dataYear",
            value: observation.dataYear,
          },
          {
            labelKey: "suspicious.comparison.reportYear",
            value: observation.reportYear,
          },
        ],
      }),
    );
  }

  return findings;
}

/** Emissions below zero, which the data model has no way to mean. */
function detectNegativeValues(record: PeriodRecord): SuspicionFinding[] {
  const findings: SuspicionFinding[] = [];

  for (const observation of record.observations.values()) {
    if (observation.value >= 0) continue;

    findings.push(
      buildFinding(observation, {
        rule: "negative-value",
        severity: "high",
        score: Math.abs(observation.value),
        messageKey: "suspicious.rules.negativeValue.message",
        messageParams: {},
        comparisons: [],
      }),
    );
  }

  return findings;
}

/** Every within-report consistency rule, for one reporting period. */
export function detectReportInconsistencies(
  records: PeriodRecord[],
): SuspicionFinding[] {
  return records.flatMap((record) => [
    ...detectScope3SumMismatch(record),
    ...detectCategoryExceedsTotal(record),
    ...detectTotalSumMismatch(record),
    ...detectScope2Divergence(record),
    ...detectDuplicateValues(record),
    ...detectYearLikeValues(record),
    ...detectNegativeValues(record),
  ]);
}
