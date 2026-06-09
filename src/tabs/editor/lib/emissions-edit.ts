import { toNumberOrNull } from "./reporting-period-ui";
import type { GarboReportingPeriodSummary } from "./types";

export type EditedPeriodEmissions = {
  scope1Total?: string;
  scope1Verified?: boolean;
  scope1And2Total?: string;
  scope1And2Verified?: boolean;
  scope2Mb?: string;
  scope2Lb?: string;
  scope2Unknown?: string;
  scope2Verified?: boolean;
  statedTotalEmissions?: string;
  statedTotalVerified?: boolean;
  scope3StatedTotalEmissions?: string;
  scope3StatedTotalVerified?: boolean;
  scope3Categories?: Record<string, string>;
  scope3CategoriesVerified?: Record<string, boolean>;
};

type PeriodWithEmissions = GarboReportingPeriodSummary & { id: string };

type Scope3Payload = {
  statedTotalEmissions?: {
    total: number | null | undefined;
    unit: string;
    verified: boolean | undefined;
  };
  categories?: Array<{
    category: number;
    total: number | null;
    unit: string;
    verified: boolean | undefined;
  }>;
};

export function buildEmissionsPeriodPatch(
  rp: PeriodWithEmissions,
  rpEdits: EditedPeriodEmissions
): { startDate: string; endDate: string; emissions?: Record<string, unknown> } | null {
  const hasScope1 = rpEdits.scope1Total != null || rpEdits.scope1Verified != null;
  const hasScope1And2 = rpEdits.scope1And2Total != null || rpEdits.scope1And2Verified != null;
  const hasScope2 =
    rpEdits.scope2Mb != null ||
    rpEdits.scope2Lb != null ||
    rpEdits.scope2Unknown != null ||
    rpEdits.scope2Verified != null;
  const hasStatedTotal =
    rpEdits.statedTotalEmissions != null || rpEdits.statedTotalVerified != null;
  const hasScope3StatedTotal =
    rpEdits.scope3StatedTotalEmissions != null || rpEdits.scope3StatedTotalVerified != null;
  const hasScope3Categories =
    (rpEdits.scope3Categories && Object.keys(rpEdits.scope3Categories).length > 0) ||
    (rpEdits.scope3CategoriesVerified &&
      Object.keys(rpEdits.scope3CategoriesVerified).length > 0);

  if (
    !hasScope1 &&
    !hasScope1And2 &&
    !hasScope2 &&
    !hasStatedTotal &&
    !hasScope3StatedTotal &&
    !hasScope3Categories
  )
    return null;

  const emissions: Record<string, unknown> = {};

  if (hasScope1) {
    emissions.scope1 = {
      total: rpEdits.scope1Total != null ? toNumberOrNull(rpEdits.scope1Total) : undefined,
      unit: "tCO2e",
      verified: rpEdits.scope1Verified ?? undefined,
    };
  }
  if (hasScope1And2) {
    emissions.scope1And2 = {
      total:
        rpEdits.scope1And2Total != null ? toNumberOrNull(rpEdits.scope1And2Total) : undefined,
      unit: "tCO2e",
      verified: rpEdits.scope1And2Verified ?? undefined,
    };
  }
  if (hasScope2) {
    emissions.scope2 = {
      mb: rpEdits.scope2Mb != null ? toNumberOrNull(rpEdits.scope2Mb) : undefined,
      lb: rpEdits.scope2Lb != null ? toNumberOrNull(rpEdits.scope2Lb) : undefined,
      unknown: rpEdits.scope2Unknown != null ? toNumberOrNull(rpEdits.scope2Unknown) : undefined,
      unit: "tCO2e",
      verified: rpEdits.scope2Verified ?? undefined,
    };
  }
  if (hasStatedTotal) {
    emissions.statedTotalEmissions = {
      total:
        rpEdits.statedTotalEmissions != null
          ? toNumberOrNull(rpEdits.statedTotalEmissions)
          : undefined,
      unit: "tCO2e",
      verified: rpEdits.statedTotalVerified ?? undefined,
    };
  }

  let scope3Payload: Scope3Payload | undefined;

  if (hasScope3StatedTotal) {
    const hasValueEdit = rpEdits.scope3StatedTotalEmissions != null;
    const hasVerifiedEdit = rpEdits.scope3StatedTotalVerified != null;
    const originalTotal = rp.emissions?.scope3?.statedTotalEmissions?.total ?? null;

    if (!(hasVerifiedEdit && !hasValueEdit && originalTotal == null)) {
      scope3Payload = {
        ...scope3Payload,
        statedTotalEmissions: {
          total: hasValueEdit
            ? toNumberOrNull(rpEdits.scope3StatedTotalEmissions ?? "")
            : originalTotal,
          unit: "tCO2e",
          verified: hasVerifiedEdit ? rpEdits.scope3StatedTotalVerified : undefined,
        },
      };
    }
  }

  if (hasScope3Categories) {
    const catVals = rpEdits.scope3Categories ?? {};
    const catVerified = rpEdits.scope3CategoriesVerified ?? {};
    const changedIds = new Set<string>([...Object.keys(catVals), ...Object.keys(catVerified)]);

    const categories = Array.from(changedIds)
      .map((id) => {
        const category = Number(id);
        if (!Number.isFinite(category)) return null;
        const original = rp.emissions?.scope3?.categories?.find((c) => c.category === category);
        const hasVal = Object.prototype.hasOwnProperty.call(catVals, id);
        const hasVer = Object.prototype.hasOwnProperty.call(catVerified, id);

        if (!hasVal && !hasVer) return null;
        if (!hasVal && hasVer && original?.total == null) return null;

        return {
          category,
          total: hasVal ? toNumberOrNull(catVals[id] ?? "") : original?.total ?? null,
          unit: "tCO2e",
          verified: hasVer ? catVerified[id] : undefined,
        };
      })
      .filter(Boolean) as NonNullable<Scope3Payload["categories"]>;

    if (categories.length) {
      scope3Payload = { ...scope3Payload, categories };
    }
  }

  if (scope3Payload) {
    emissions.scope3 = scope3Payload;
  }

  return {
    startDate: rp.startDate,
    endDate: rp.endDate,
    emissions: Object.keys(emissions).length ? emissions : undefined,
  };
}

