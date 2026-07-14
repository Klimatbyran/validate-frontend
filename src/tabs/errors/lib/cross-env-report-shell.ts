import {
  UNLINKED_REPORT_SHELL_KEY,
  resolveCompanyReportId,
} from "@/tabs/editor/lib/company-report-shells";
import { getPeriodDataYear } from "@/tabs/editor/lib/reporting-period-ui";
import type { ReportingPeriod } from "../types";
import { getPeriodReportYearFromApi } from "./emissions";

function trim(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function normalizeReportUrl(
  raw: string | null | undefined,
): string | null {
  const value = trim(raw);
  if (!value) return null;
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/$/, "") || "/";
    return `${url.protocol}//${url.host.toLowerCase()}${pathname}${url.search}`;
  } catch {
    return value.toLowerCase();
  }
}

function firstSha256(period: ReportingPeriod): string | null {
  return (
    trim(period.reportSha256) ?? trim(period.companyReport?.report?.sha256)
  );
}

function firstNormalizedUrl(period: ReportingPeriod): string | null {
  const candidates = [
    period.reportURL,
    period.companyReport?.report?.url,
    period.companyReport?.report?.sourceUrl,
    period.reportS3Url,
    period.companyReport?.report?.s3Url,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeReportUrl(candidate);
    if (normalized) return normalized;
  }
  return null;
}

/** Strong cross-env identity keys (sha256 / URL) used for company pairing. */
export function collectStrongReportIdentityKeys(
  period: ReportingPeriod,
): string[] {
  const keys: string[] = [];
  const sha256 = firstSha256(period);
  if (sha256) keys.push(`sha256:${sha256}`);
  const url = firstNormalizedUrl(period);
  if (url) keys.push(`url:${url}`);
  return keys;
}

export function collectStrongReportIdentityKeysForCompany(company: {
  reportingPeriods?: ReportingPeriod[];
}): Set<string> {
  const keys = new Set<string>();
  for (const period of company.reportingPeriods ?? []) {
    for (const key of collectStrongReportIdentityKeys(period)) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * Stable shell key for pairing the same processed report across stage and prod.
 * Environment-local companyReportId UUIDs differ per database and must not be used.
 */
export function getCrossEnvPeriodShellKey(period: ReportingPeriod): string {
  const sha256 = firstSha256(period);
  if (sha256) return `sha256:${sha256}`;

  const url = firstNormalizedUrl(period);
  if (url) return `url:${url}`;

  const reportYear = getPeriodReportYearFromApi(period);
  const dataYear = getPeriodDataYear(period);
  if (reportYear != null && dataYear) {
    return `catalog:${reportYear}:data:${dataYear}`;
  }

  const companyReportId = resolveCompanyReportId(period);
  if (companyReportId) return `local:${companyReportId}`;

  if (dataYear) return `${UNLINKED_REPORT_SHELL_KEY}:${dataYear}`;
  return UNLINKED_REPORT_SHELL_KEY;
}

export function isUnlinkedCrossEnvShellKey(shellKey: string): boolean {
  return (
    shellKey === UNLINKED_REPORT_SHELL_KEY ||
    shellKey.startsWith(`${UNLINKED_REPORT_SHELL_KEY}:`)
  );
}

export function resolveSlotCompanyReportId(
  shellKey: string,
  anchor: ReportingPeriod | null | undefined,
): string | null {
  if (isUnlinkedCrossEnvShellKey(shellKey)) return null;
  return resolveCompanyReportId(anchor ?? {}) ?? null;
}
