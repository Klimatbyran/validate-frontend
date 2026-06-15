import type { GarboRegistryReportSummary } from "./types";

export function truncateUrl(url: string, max = 56): string {
  const trimmed = url.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function registryReportHref(report: GarboRegistryReportSummary): string {
  return (
    report.sourceUrl?.trim() || report.url?.trim() || report.s3Url?.trim() || ""
  );
}

export function formatRegistryOptionLabel(
  report: GarboRegistryReportSummary,
  noYearLabel: string,
): string {
  const year = report.reportYear?.trim() || noYearLabel;
  const href = registryReportHref(report);
  return href ? `${year} · ${truncateUrl(href)}` : year;
}
