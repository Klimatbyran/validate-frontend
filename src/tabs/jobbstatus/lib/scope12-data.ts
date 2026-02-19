/**
 * Types and data helpers for Scope 1 & 2 emissions.
 * Used by Scope12Section for reference snapshot and formatting.
 */

export interface Scope12EmissionsData {
  scope12: Array<{
    year: number;
    scope1?: {
      total: number;
      unit: "tCO2e" | "tCO2";
    } | null;
    scope2?: {
      mb?: number;
      lb?: number;
      unknown?: number;
      unit: "tCO2e" | "tCO2";
    } | null;
    scope1And2?: {
      total: number;
      unit: "tCO2e" | "tCO2";
    } | null;
  }>;
}

export type Scope12ReferenceSnapshot = {
  scope1?: { total: number | null; unit: string | null } | null;
  scope2?: {
    mb?: number | null;
    lb?: number | null;
    unknown?: number | null;
    unit: string | null;
  } | null;
  scope1And2?: { total: number | null; unit: string | null } | null;
} | null;

export function buildReferenceSnapshotFromPeriod(
  period: any
): Scope12ReferenceSnapshot {
  if (!period?.emissions) return null;
  const s1 = period.emissions.scope1;
  const s2 = period.emissions.scope2;
  const s12 = (period.emissions as any).scope1And2;
  return {
    scope1: s1
      ? {
          total: typeof s1.total === "number" ? s1.total : (s1.total ?? null),
          unit: s1.unit ?? null,
        }
      : null,
    scope2: s2
      ? {
          mb: s2.mb ?? null,
          lb: s2.lb ?? null,
          unknown: s2.unknown ?? null,
          unit: s2.unit ?? null,
        }
      : null,
    scope1And2: s12
      ? {
          total:
            typeof s12.total === "number" ? s12.total : (s12.total ?? null),
          unit: s12.unit ?? null,
        }
      : null,
  };
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null) return "0";
  return num.toLocaleString("sv-SE");
}
