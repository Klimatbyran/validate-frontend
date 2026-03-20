import type { GarboReportingPeriodSummary } from "./types";

export function getPeriodForYear(
  periods: GarboReportingPeriodSummary[] | undefined,
  year: number
): GarboReportingPeriodSummary | null {
  if (!periods?.length) return null;
  const y = String(year);
  return (
    periods.find(
      (p) =>
        p.startDate?.startsWith(y) ||
        p.endDate?.startsWith(y) ||
        (p.startDate &&
          p.endDate &&
          y >= p.startDate.slice(0, 4) &&
          y <= p.endDate.slice(0, 4))
    ) ?? null
  );
}

export function formatNumber(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString();
}

export function getScope2Total(period: GarboReportingPeriodSummary | null): number | null {
  if (!period?.emissions?.scope2) return null;
  const s2 = period.emissions.scope2;
  return (s2.mb ?? s2.lb ?? s2.unknown) ?? null;
}

