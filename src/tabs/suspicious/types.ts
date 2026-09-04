/**
 * Suspicious Data tab: types for production-data anomaly findings.
 *
 * Every rule works by comparing a production data point against *other*
 * production data - peer companies, the same company's other years, or the
 * other numbers inside the same report - so a finding always carries the
 * comparison basis that made it suspicious.
 */

/** Comparison basis a rule used, in the order they are surfaced in the UI. */
export const SUSPICION_RULES = [
  "peer-outlier",
  "peer-share-outlier",
  "unit-scale-error",
  "year-over-year-jump",
  "scope3-sum-mismatch",
  "category-exceeds-total",
  "total-sum-mismatch",
  "scope2-mb-lb-divergence",
  "duplicate-value",
  "value-looks-like-year",
  "negative-value",
] as const;

export type SuspicionRuleId = (typeof SUSPICION_RULES)[number];

/** Which body of data the rule compared against. */
export type SuspicionBasis = "peers" | "history" | "report";

export const SUSPICION_RULE_BASIS: Record<SuspicionRuleId, SuspicionBasis> = {
  "peer-outlier": "peers",
  "peer-share-outlier": "peers",
  "unit-scale-error": "history",
  "year-over-year-jump": "history",
  "scope3-sum-mismatch": "report",
  "category-exceeds-total": "report",
  "total-sum-mismatch": "report",
  "scope2-mb-lb-divergence": "report",
  "duplicate-value": "report",
  "value-looks-like-year": "report",
  "negative-value": "report",
};

export const SUSPICION_SEVERITIES = ["high", "medium", "low"] as const;
export type SuspicionSeverity = (typeof SUSPICION_SEVERITIES)[number];

/**
 * Provenance of the flagged value. Mirrors the Editor's definition
 * (`isAIGenerated`): a data point counts as manually validated only when
 * metadata carries a non-Garbo `verifiedBy`.
 */
export type SuspicionOrigin = "ai" | "verified";

export const SUSPICION_ORIGINS = ["ai", "verified"] as const;

/** Metadata as served for a single data point by the prod pipeline company list. */
export interface DataPointMetadata {
  verifiedBy?: { name: string } | null;
  user?: { name?: string | null } | null;
  source?: string | null;
  comment?: string | null;
}

/**
 * One non-null production value, flattened out of the nested company →
 * reporting period → emissions shape so rules can index it freely.
 */
export interface DataPointObservation {
  /** Stable key: company + data year + data point. */
  key: string;
  companyId: string;
  companyName: string;
  wikidataId: string | null;
  tags: string[];
  /** `ReportingPeriod.year` - the emissions data year. */
  dataYear: number;
  /** `CompanyReport.reportYear` - the PDF document year, when known. */
  reportYear: number | null;
  reportUrl: string | null;
  dataPointId: string;
  dataPointLabel: string;
  scope: string;
  value: number;
  origin: SuspicionOrigin;
  verifiedByName: string | null;
}

/** A supporting number shown next to the flagged value in the UI. */
export interface SuspicionComparison {
  labelKey: string;
  labelParams?: Record<string, string | number>;
  value: number | null;
  /** Rendered verbatim instead of `value` when set (e.g. "×1 000"). */
  display?: string;
}

export interface SuspicionFinding {
  id: string;
  rule: SuspicionRuleId;
  severity: SuspicionSeverity;
  /** Higher means more suspicious. Only comparable within a rule. */
  score: number;
  companyId: string;
  companyName: string;
  wikidataId: string | null;
  tags: string[];
  dataYear: number;
  reportYear: number | null;
  reportUrl: string | null;
  dataPointId: string;
  dataPointLabel: string;
  value: number | null;
  origin: SuspicionOrigin;
  verifiedByName: string | null;
  /** i18n key + params describing why the value was flagged. */
  messageKey: string;
  messageParams: Record<string, string | number>;
  comparisons: SuspicionComparison[];
}

export interface SuspiciousCompanySummary {
  companyId: string;
  companyName: string;
  wikidataId: string | null;
  tags: string[];
  findingCount: number;
  highCount: number;
  aiCount: number;
  verifiedCount: number;
  dataYears: number[];
  topScore: number;
}
