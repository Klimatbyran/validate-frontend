import type { Company } from "@/tabs/errors/types";
import type { SuspicionFinding, SuspicionSeverity } from "../types";
import { detectReportInconsistencies } from "./consistency-rules";
import { detectHistoryAnomalies } from "./history-rules";
import { buildPeriodRecords, collectObservations } from "./observations";
import { detectPeerOutliers, detectPeerShareOutliers } from "./peer-rules";

const SEVERITY_ORDER: Record<SuspicionSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface SuspicionScanResult {
  findings: SuspicionFinding[];
  /** Company + data year combinations scanned. */
  periodCount: number;
  /** Non-null production values the rules ran against. */
  observationCount: number;
  companyCount: number;
}

/**
 * Run every rule over a production company list.
 *
 * Sorted most-suspicious-first: severity, then the rule's own score. Scores
 * are only comparable within a rule, so severity has to carry the ordering
 * across rules.
 */
export function scanForSuspiciousData(
  companies: Company[],
): SuspicionScanResult {
  const records = buildPeriodRecords(companies);
  const observations = collectObservations(records);

  const findings = [
    ...detectPeerOutliers(observations),
    ...detectPeerShareOutliers(records),
    ...detectHistoryAnomalies(observations),
    ...detectReportInconsistencies(records),
  ].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });

  return {
    findings,
    periodCount: records.length,
    observationCount: observations.length,
    companyCount: companies.length,
  };
}
