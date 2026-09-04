import type {
  SuspicionFinding,
  SuspicionOrigin,
  SuspicionRuleId,
  SuspicionSeverity,
  SuspiciousCompanySummary,
} from "../types";

export interface SuspicionFilters {
  /** null = every data year. */
  dataYear: number | null;
  /** "all" keeps both AI-generated and manually validated values. */
  origin: SuspicionOrigin | "all";
  /** Empty = every severity. */
  severities: SuspicionSeverity[];
  /** Empty = every rule. */
  rules: SuspicionRuleId[];
  /** Empty = every tag. */
  tags: string[];
  search: string;
}

export const EMPTY_SUSPICION_FILTERS: SuspicionFilters = {
  dataYear: null,
  origin: "all",
  severities: [],
  rules: [],
  tags: [],
  search: "",
};

function matchesSearch(finding: SuspicionFinding, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return (
    finding.companyName.toLowerCase().includes(query) ||
    finding.dataPointLabel.toLowerCase().includes(query) ||
    (finding.wikidataId?.toLowerCase().includes(query) ?? false)
  );
}

export function filterFindings(
  findings: SuspicionFinding[],
  filters: SuspicionFilters,
): SuspicionFinding[] {
  return findings.filter((finding) => {
    if (filters.dataYear !== null && finding.dataYear !== filters.dataYear) {
      return false;
    }
    if (filters.origin !== "all" && finding.origin !== filters.origin) {
      return false;
    }
    if (
      filters.severities.length > 0 &&
      !filters.severities.includes(finding.severity)
    ) {
      return false;
    }
    if (filters.rules.length > 0 && !filters.rules.includes(finding.rule)) {
      return false;
    }
    if (
      filters.tags.length > 0 &&
      !finding.tags.some((tag) => filters.tags.includes(tag))
    ) {
      return false;
    }
    return matchesSearch(finding, filters.search);
  });
}

export interface SuspicionCounts {
  total: number;
  high: number;
  medium: number;
  low: number;
  ai: number;
  verified: number;
  companies: number;
}

export function countFindings(findings: SuspicionFinding[]): SuspicionCounts {
  const companies = new Set<string>();
  let high = 0;
  let medium = 0;
  let low = 0;
  let ai = 0;
  let verified = 0;

  for (const finding of findings) {
    companies.add(finding.companyId);
    if (finding.severity === "high") high++;
    else if (finding.severity === "medium") medium++;
    else low++;
    if (finding.origin === "ai") ai++;
    else verified++;
  }

  return {
    total: findings.length,
    high,
    medium,
    low,
    ai,
    verified,
    companies: companies.size,
  };
}

/** Roll findings up per company, worst first. */
export function summarizeByCompany(
  findings: SuspicionFinding[],
): SuspiciousCompanySummary[] {
  const summaries = new Map<
    string,
    SuspiciousCompanySummary & { years: Set<number> }
  >();

  for (const finding of findings) {
    let summary = summaries.get(finding.companyId);
    if (!summary) {
      summary = {
        companyId: finding.companyId,
        companyName: finding.companyName,
        wikidataId: finding.wikidataId,
        tags: finding.tags,
        findingCount: 0,
        highCount: 0,
        aiCount: 0,
        verifiedCount: 0,
        dataYears: [],
        topScore: 0,
        years: new Set<number>(),
      };
      summaries.set(finding.companyId, summary);
    }

    summary.findingCount++;
    if (finding.severity === "high") summary.highCount++;
    if (finding.origin === "ai") summary.aiCount++;
    else summary.verifiedCount++;
    summary.years.add(finding.dataYear);
    summary.topScore = Math.max(summary.topScore, finding.score);
  }

  return Array.from(summaries.values())
    .map(({ years, ...summary }) => ({
      ...summary,
      dataYears: Array.from(years).sort((a, b) => b - a),
    }))
    .sort((a, b) => {
      if (b.highCount !== a.highCount) return b.highCount - a.highCount;
      if (b.findingCount !== a.findingCount) {
        return b.findingCount - a.findingCount;
      }
      return a.companyName.localeCompare(b.companyName);
    });
}

export function collectFilterOptions(findings: SuspicionFinding[]): {
  dataYears: number[];
  tags: string[];
  rules: SuspicionRuleId[];
} {
  const dataYears = new Set<number>();
  const tags = new Set<string>();
  const rules = new Set<SuspicionRuleId>();

  for (const finding of findings) {
    dataYears.add(finding.dataYear);
    finding.tags.forEach((tag) => tags.add(tag));
    rules.add(finding.rule);
  }

  return {
    dataYears: Array.from(dataYears).sort((a, b) => b - a),
    tags: Array.from(tags).sort(),
    rules: Array.from(rules),
  };
}
