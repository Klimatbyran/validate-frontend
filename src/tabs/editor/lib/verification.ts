import type { GarboCompanyListItem, GarboMinimalMetadata } from "./types";

export type VerificationState = "none" | "verified" | "unverified";

export type CompanyVerificationOverview = {
  emissions: VerificationState;
  economy: VerificationState;
  industry: VerificationState;
  baseYear: VerificationState;
  hasUnverifiedEmissions: boolean;
  hasUnverifiedData: boolean;
  perYear: Array<{ year: string; emissions: VerificationState; economy: VerificationState }>;
};

function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

export function isAIGenerated(meta: GarboMinimalMetadata | null | undefined): boolean {
  if (!meta) return false;
  const verifiedBy = meta.verifiedBy;
  const noVerifier =
    !verifiedBy ||
    (typeof verifiedBy.name === "string" && verifiedBy.name.trim() === "");
  const isGarbo = meta.user?.name === "Garbo (Klimatkollen)";
  return noVerifier || isGarbo;
}

function stateFromAIGenerated(hasValue: boolean, aiGenerated: boolean): VerificationState {
  if (!hasValue) return "none";
  return aiGenerated ? "unverified" : "verified";
}

export function getCompanyVerificationOverview(
  company: GarboCompanyListItem
): CompanyVerificationOverview {
  const periods = company.reportingPeriods ?? [];

  const perYearMap = new Map<string, { emissions: VerificationState; economy: VerificationState }>();

  let emissionsAnyHasValue = false;
  let emissionsAnyUnverified = false;

  let economyAnyHasValue = false;
  let economyAnyUnverified = false;

  for (const p of periods) {
    const y = getPeriodYear(p);
    if (!y) continue;

    // --- emissions ---
    const e = p.emissions;
    const emissionsPoints: Array<{ hasValue: boolean; meta: GarboMinimalMetadata | null | undefined }> = [];

    if (e) {
      emissionsPoints.push({
        hasValue: e.scope1?.total !== null && e.scope1?.total !== undefined,
        meta: e.scope1?.metadata,
      });
      emissionsPoints.push({
        hasValue: e.scope1And2?.total !== null && e.scope1And2?.total !== undefined,
        meta: e.scope1And2?.metadata,
      });
      emissionsPoints.push({
        hasValue:
          (e.scope2?.mb !== null && e.scope2?.mb !== undefined) ||
          (e.scope2?.lb !== null && e.scope2?.lb !== undefined) ||
          (e.scope2?.unknown !== null && e.scope2?.unknown !== undefined),
        meta: e.scope2?.metadata,
      });
      emissionsPoints.push({
        hasValue:
          e.statedTotalEmissions?.total !== null &&
          e.statedTotalEmissions?.total !== undefined,
        meta: e.statedTotalEmissions?.metadata,
      });
      emissionsPoints.push({
        hasValue:
          e.scope3?.statedTotalEmissions?.total !== null &&
          e.scope3?.statedTotalEmissions?.total !== undefined,
        meta: e.scope3?.statedTotalEmissions?.metadata,
      });
      (e.scope3?.categories ?? []).forEach((c) => {
        emissionsPoints.push({
          hasValue: c.total !== null && c.total !== undefined,
          meta: c.metadata,
        });
      });
    }

    const emissionsHasValue = emissionsPoints.some((p) => p.hasValue);
    const emissionsIsUnverified = emissionsPoints.some((p) => p.hasValue && isAIGenerated(p.meta));
    const emissionsState = stateFromAIGenerated(emissionsHasValue, emissionsIsUnverified);

    // --- economy ---
    const econ = p.economy;
    const turnoverHasValue = econ?.turnover?.value !== null && econ?.turnover?.value !== undefined;
    const employeesHasValue = econ?.employees?.value !== null && econ?.employees?.value !== undefined;
    const econHasValue = turnoverHasValue || employeesHasValue;
    const econIsUnverified =
      (turnoverHasValue && isAIGenerated(econ?.turnover?.metadata)) ||
      (employeesHasValue && isAIGenerated(econ?.employees?.metadata));
    const economyState = stateFromAIGenerated(Boolean(econHasValue), econIsUnverified);

    perYearMap.set(y, { emissions: emissionsState, economy: economyState });

    if (emissionsHasValue) {
      emissionsAnyHasValue = true;
      if (emissionsIsUnverified) emissionsAnyUnverified = true;
    }
    if (econHasValue) {
      economyAnyHasValue = true;
      if (econIsUnverified) economyAnyUnverified = true;
    }
  }

  const emissions: VerificationState =
    !emissionsAnyHasValue ? "none" : emissionsAnyUnverified ? "unverified" : "verified";
  const economy: VerificationState =
    !economyAnyHasValue ? "none" : economyAnyUnverified ? "unverified" : "verified";

  const industryHasValue = Boolean(company.industry?.subIndustryCode);
  const industryMeta = (company as any).industry?.metadata as GarboMinimalMetadata | null | undefined;
  const industry = stateFromAIGenerated(industryHasValue, isAIGenerated(industryMeta));

  const baseYearObj = (company as any).baseYear as
    | { year?: number | null; metadata?: GarboMinimalMetadata | null }
    | null
    | undefined;
  const baseYearHasValue = baseYearObj?.year !== null && baseYearObj?.year !== undefined;
  const baseYear = stateFromAIGenerated(Boolean(baseYearHasValue), isAIGenerated(baseYearObj?.metadata));

  const hasUnverifiedEmissions = emissionsAnyUnverified;
  const hasUnverifiedData =
    hasUnverifiedEmissions ||
    economyAnyUnverified ||
    (industryHasValue && isAIGenerated(industryMeta)) ||
    (baseYearHasValue && isAIGenerated(baseYearObj?.metadata));

  const perYear = Array.from(perYearMap.entries())
    .map(([year, v]) => ({ year, ...v }))
    .sort((a, b) => b.year.localeCompare(a.year));

  return {
    emissions,
    economy,
    industry,
    baseYear,
    hasUnverifiedEmissions,
    hasUnverifiedData,
    perYear,
  };
}

