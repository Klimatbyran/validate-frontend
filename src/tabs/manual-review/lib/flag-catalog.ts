export const MANUAL_REVIEW_FLAG_KEYS = [
  "no-reporting-periods",
  "no-emissions",
  "missing-wikidata",
  "missing-lei",
  "missing-industry",
  "untagged",
  "period-without-economy",
  "year-gap",
  "missing-latest-year",
  "few-emissions-years",
  "scope-spike-drop",
  "unit-scale-suspect",
  "stated-vs-calculated",
  "scope3-stated-vs-categories",
  "zero-or-negative-emissions",
  "shell-company",
  "reporting-quality-warning",
  "open-datapoint-notes",
] as const;

export type ManualReviewFlagKey = (typeof MANUAL_REVIEW_FLAG_KEYS)[number];

export const MANUAL_REVIEW_FLAG_GROUPS = [
  "completeness",
  "temporal",
  "anomalies",
  "identity",
  "extraction",
] as const;

export type ManualReviewFlagGroup = (typeof MANUAL_REVIEW_FLAG_GROUPS)[number];

export type ManualReviewFlagMaturity = "stable" | "experimental";

/**
 * Local mirror of API maturity for URL/typing fallbacks. Summary tiles prefer
 * `maturity` from the API response when present.
 */
export const FLAG_MATURITY: Record<
  ManualReviewFlagKey,
  ManualReviewFlagMaturity
> = {
  "no-reporting-periods": "stable",
  "no-emissions": "stable",
  "missing-wikidata": "stable",
  "missing-lei": "stable",
  "missing-industry": "stable",
  untagged: "stable",
  "period-without-economy": "stable",
  "year-gap": "stable",
  "missing-latest-year": "stable",
  "few-emissions-years": "stable",
  "scope-spike-drop": "experimental",
  "unit-scale-suspect": "experimental",
  "stated-vs-calculated": "experimental",
  "scope3-stated-vs-categories": "experimental",
  "zero-or-negative-emissions": "experimental",
  "shell-company": "stable",
  "reporting-quality-warning": "stable",
  "open-datapoint-notes": "stable",
};

export function isManualReviewFlagKey(
  value: string | null | undefined,
): value is ManualReviewFlagKey {
  return (
    typeof value === "string" &&
    (MANUAL_REVIEW_FLAG_KEYS as readonly string[]).includes(value)
  );
}

export const FLAG_GROUP_ORDER: ManualReviewFlagGroup[] = [
  "completeness",
  "temporal",
  "anomalies",
  "identity",
  "extraction",
];
