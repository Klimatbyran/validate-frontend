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
