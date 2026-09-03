import type {
  DataPointObservation,
  SuspicionFinding,
  SuspicionSeverity,
} from "../types";
import type { PeriodRecord } from "./observations";
import {
  median,
  medianAbsoluteDeviation,
  robustZScore,
  safeLog10,
} from "./stats";
import { SUSPICION_CONFIG } from "./suspicion-config";
import {
  isPeriodTotalTrustworthy,
  periodTotalEmissions,
} from "./report-totals";

interface PeerEntry {
  observation: DataPointObservation;
  /** log10 of whatever quantity is being compared (raw value or share). */
  logValue: number;
  /** The untransformed quantity, for display. */
  rawValue: number;
}

interface PeerThresholds {
  minPeerCount: number;
  flagZ: number;
  mediumZ: number;
  highZ: number;
  minLogMad: number;
  minFactor: number;
}

interface PeerOutlier {
  observation: DataPointObservation;
  rawValue: number;
  z: number;
  severity: SuspicionSeverity;
  /** Peer median in the untransformed unit. */
  peerMedian: number;
  peerCount: number;
  /** How many times the peer median the value sits at (always >= 1). */
  factor: number;
  above: boolean;
}

function severityForZ(
  absZ: number,
  thresholds: PeerThresholds,
): SuspicionSeverity {
  if (absZ >= thresholds.highZ) return "high";
  if (absZ >= thresholds.mediumZ) return "medium";
  return "low";
}

/**
 * Flag entries whose modified z-score against their peer group exceeds the
 * threshold. Comparison happens in log space because emissions are
 * log-distributed: a 10× gap means the same thing at 100 t and at 100 000 t.
 *
 * Two guards keep tight peer groups honest. The MAD is floored, because a
 * cluster with almost no measured spread would otherwise score every ordinary
 * deviation as wildly suspicious; and a flagged value has to be a minimum
 * factor off the median, so a statistically unusual but practically tiny gap
 * doesn't reach a reviewer.
 */
function findPeerOutliers(
  entries: PeerEntry[],
  thresholds: PeerThresholds,
): PeerOutlier[] {
  if (entries.length < thresholds.minPeerCount) return [];

  const logValues = entries.map((entry) => entry.logValue);
  const center = median(logValues);
  if (center === null) return [];

  const mad = Math.max(
    medianAbsoluteDeviation(logValues, center),
    thresholds.minLogMad,
  );
  const peerMedian = 10 ** center;
  const outliers: PeerOutlier[] = [];

  for (const entry of entries) {
    const z = robustZScore(entry.logValue, center, mad);
    if (z === null || Math.abs(z) < thresholds.flagZ) continue;

    const factor = 10 ** Math.abs(entry.logValue - center);
    if (factor < thresholds.minFactor) continue;

    const above = entry.logValue > center;
    outliers.push({
      observation: entry.observation,
      rawValue: entry.rawValue,
      z,
      severity: severityForZ(Math.abs(z), thresholds),
      peerMedian,
      peerCount: entries.length,
      factor,
      above,
    });
  }

  return outliers;
}

/** Peers are companies reporting the same data point for the same data year. */
function groupKey(observation: DataPointObservation): string {
  return `${observation.dataPointId}:${observation.dataYear}`;
}

function groupEntries(entries: PeerEntry[]): Map<string, PeerEntry[]> {
  const groups = new Map<string, PeerEntry[]>();
  for (const entry of entries) {
    const key = groupKey(entry.observation);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  return groups;
}

/**
 * Values that sit far from what every other company reported for the same data
 * point and year.
 */
export function detectPeerOutliers(
  observations: DataPointObservation[],
): SuspicionFinding[] {
  const entries: PeerEntry[] = [];
  for (const observation of observations) {
    const logValue = safeLog10(observation.value);
    if (logValue === null) continue;
    entries.push({ observation, logValue, rawValue: observation.value });
  }

  const findings: SuspicionFinding[] = [];

  for (const group of groupEntries(entries).values()) {
    for (const outlier of findPeerOutliers(group, SUSPICION_CONFIG.peer)) {
      const { observation } = outlier;
      findings.push({
        id: `peer-outlier:${observation.key}`,
        rule: "peer-outlier",
        severity: outlier.severity,
        score: Math.abs(outlier.z),
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
        messageKey: outlier.above
          ? "suspicious.rules.peerOutlier.messageAbove"
          : "suspicious.rules.peerOutlier.messageBelow",
        messageParams: {
          factor: Math.round(outlier.factor),
          peerCount: outlier.peerCount,
        },
        comparisons: [
          {
            labelKey: "suspicious.comparison.peerMedian",
            value: outlier.peerMedian,
          },
          {
            labelKey: "suspicious.comparison.peerCount",
            value: outlier.peerCount,
          },
          {
            labelKey: "suspicious.comparison.zScore",
            value: Number(outlier.z.toFixed(1)),
          },
        ],
      });
    }
  }

  return findings;
}

/**
 * The same peer comparison, but on each value's share of its own report's
 * total emissions. Share is size-independent, so this catches a data point
 * that is the wrong *proportion* of a company's footprint even when its
 * absolute magnitude looks unremarkable for the peer group.
 */
export function detectPeerShareOutliers(
  records: PeriodRecord[],
): SuspicionFinding[] {
  const entries: PeerEntry[] = [];

  for (const record of records) {
    if (!isPeriodTotalTrustworthy(record.emissions)) continue;

    const total = periodTotalEmissions(record.emissions);
    if (total === null || total < SUSPICION_CONFIG.peerShare.minDenominator) {
      continue;
    }

    for (const observation of record.observations.values()) {
      // A total's share of itself is always 1 and tells us nothing.
      if (observation.dataPointId === "stated-total") continue;
      if (observation.value <= 0) continue;

      const share = observation.value / total;
      const logValue = safeLog10(share);
      if (logValue === null) continue;
      entries.push({ observation, logValue, rawValue: share });
    }
  }

  const findings: SuspicionFinding[] = [];

  for (const group of groupEntries(entries).values()) {
    for (const outlier of findPeerOutliers(group, SUSPICION_CONFIG.peerShare)) {
      const { observation } = outlier;
      findings.push({
        id: `peer-share-outlier:${observation.key}`,
        rule: "peer-share-outlier",
        severity: outlier.severity,
        score: Math.abs(outlier.z),
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
        messageKey: outlier.above
          ? "suspicious.rules.peerShareOutlier.messageAbove"
          : "suspicious.rules.peerShareOutlier.messageBelow",
        messageParams: {
          share: Number((outlier.rawValue * 100).toFixed(1)),
          peerShare: Number((outlier.peerMedian * 100).toFixed(1)),
          peerCount: outlier.peerCount,
        },
        comparisons: [
          {
            labelKey: "suspicious.comparison.shareOfTotal",
            value: Number((outlier.rawValue * 100).toFixed(1)),
          },
          {
            labelKey: "suspicious.comparison.peerShare",
            value: Number((outlier.peerMedian * 100).toFixed(1)),
          },
          {
            labelKey: "suspicious.comparison.peerCount",
            value: outlier.peerCount,
          },
        ],
      });
    }
  }

  return findings;
}
