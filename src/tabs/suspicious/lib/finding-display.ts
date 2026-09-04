import type { ApiTarget } from "@/config/api-env";
import type {
  SuspicionBasis,
  SuspicionFinding,
  SuspicionOrigin,
  SuspicionRuleId,
  SuspicionSeverity,
} from "../types";
import { SUSPICION_RULE_BASIS } from "../types";

/** i18n path segment per rule. Kept explicit so the i18n audit can see them. */
const RULE_KEY_SEGMENT: Record<SuspicionRuleId, string> = {
  "peer-outlier": "peerOutlier",
  "peer-share-outlier": "peerShareOutlier",
  "unit-scale-error": "unitScaleError",
  "year-over-year-jump": "yearOverYearJump",
  "scope3-sum-mismatch": "scope3SumMismatch",
  "category-exceeds-total": "categoryExceedsTotal",
  "total-sum-mismatch": "totalSumMismatch",
  "scope2-mb-lb-divergence": "scope2Divergence",
  "duplicate-value": "duplicateValue",
  "value-looks-like-year": "valueLooksLikeYear",
  "negative-value": "negativeValue",
};

export function ruleLabelKey(rule: SuspicionRuleId): string {
  return `suspicious.rules.${RULE_KEY_SEGMENT[rule]}.label`;
}

export function ruleDescriptionKey(rule: SuspicionRuleId): string {
  return `suspicious.rules.${RULE_KEY_SEGMENT[rule]}.description`;
}

export function basisLabelKey(basis: SuspicionBasis): string {
  return `suspicious.basis.${basis}`;
}

export function ruleBasis(rule: SuspicionRuleId): SuspicionBasis {
  return SUSPICION_RULE_BASIS[rule];
}

export function severityLabelKey(severity: SuspicionSeverity): string {
  return `suspicious.severity.${severity}`;
}

export function originLabelKey(origin: SuspicionOrigin): string {
  return `suspicious.origin.${origin}`;
}

export function sourceLabelKey(source: ApiTarget): string {
  return `suspicious.source.${source}`;
}

/**
 * Localise the numbers inside a finding's message params. Rules stay free of
 * locale concerns by emitting raw numbers; the UI formats them on the way in.
 */
export function formatMessageParams(
  params: Record<string, string | number>,
  formatNumber: (value: number | null | undefined) => string,
): Record<string, string | number> {
  const formatted: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    formatted[key] = typeof value === "number" ? formatNumber(value) : value;
  }
  return formatted;
}

export const SEVERITY_BADGE_CLASS: Record<SuspicionSeverity, string> = {
  high: "bg-pink-03/15 text-pink-02 border-pink-03/30",
  medium: "bg-orange-03/15 text-orange-02 border-orange-03/30",
  low: "bg-blue-03/15 text-blue-02 border-blue-03/30",
};

export const ORIGIN_BADGE_CLASS: Record<SuspicionOrigin, string> = {
  ai: "bg-orange-03/10 text-orange-02 border-orange-03/25",
  verified: "bg-green-03/10 text-green-03 border-green-03/25",
};

/** Rows for the CSV export, header included. */
export function findingsToCsvRows(
  findings: SuspicionFinding[],
  labelForRule: (rule: SuspicionRuleId) => string,
): string[][] {
  const escape = (value: string | number | null): string => {
    if (value === null) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = [
    "Company",
    "WikidataId",
    "Data year",
    "Report year",
    "Data point",
    "Value",
    "Rule",
    "Severity",
    "Origin",
    "Verified by",
    "Report URL",
  ];

  const rows = findings.map((finding) =>
    [
      finding.companyName,
      finding.wikidataId,
      finding.dataYear,
      finding.reportYear,
      finding.dataPointLabel,
      finding.value,
      labelForRule(finding.rule),
      finding.severity,
      finding.origin,
      finding.verifiedByName,
      finding.reportUrl,
    ].map(escape),
  );

  return [header, ...rows];
}
