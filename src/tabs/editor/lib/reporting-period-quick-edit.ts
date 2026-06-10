import { attachCompanyReportIdToPeriodPatch } from "./company-report-shells";
import type {
  GarboReportingPeriodSummary,
  ReportingPeriodWritePayload,
} from "./types";

const ALL_SCOPE3_CATEGORY_IDS = Array.from({ length: 16 }, (_, i) => i + 1);

type UpdateReportingPeriodsPayload = {
  reportingPeriods: ReportingPeriodWritePayload[];
  metadata?: { source?: string; comment?: string };
};

export type ReportingPeriodQuickEditEdited = {
  reportURL?: string; // "" means clear (null) if original existed

  // Economy
  turnoverValue?: string; // "" means clear (null) if original existed
  turnoverCurrency?: string;
  turnoverVerified?: boolean;
  employeesValue?: string;
  employeesUnit?: string;
  employeesVerified?: boolean;

  // Emissions
  scope1Total?: string;
  scope1Verified?: boolean;
  scope1And2Total?: string;
  scope1And2Verified?: boolean;
  scope2Mb?: string;
  scope2Lb?: string;
  scope2Unknown?: string;
  scope2Verified?: boolean; // applies to unit
  scope3StatedTotal?: string;
  scope3StatedTotalVerified?: boolean;
  scope3Categories?: Record<string, string>;
  scope3CategoriesVerified?: Record<string, boolean>;
  statedTotalEmissions?: string;
  statedTotalVerified?: boolean;
};

export function hasAnyQuickEditEdits(ed: ReportingPeriodQuickEditEdited) {
  return Object.keys(ed).length > 0;
}

export function quickEditScope3CategoryName(
  cat: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const key = `editor.companies.scope3Categories.${cat}`;
  const label = t(key);
  if (!label || label === key)
    return t("editor.periodEditor.categoryUnknown", { n: cat });
  return label;
}

export function scope3CategoryIdsForDisplay({
  categoryIdsFromData,
  edited,
  showAllScope3Categories,
}: {
  categoryIdsFromData: number[];
  edited: ReportingPeriodQuickEditEdited;
  showAllScope3Categories: boolean;
}): number[] {
  const editedScope3CategoryNums = new Set<number>();
  for (const k of Object.keys(edited.scope3Categories ?? {})) {
    const n = Number(k);
    if (Number.isFinite(n)) editedScope3CategoryNums.add(n);
  }
  for (const k of Object.keys(edited.scope3CategoriesVerified ?? {})) {
    const n = Number(k);
    if (Number.isFinite(n)) editedScope3CategoryNums.add(n);
  }

  const populatedScope3CategoryIds = Array.from(
    new Set<number>([...categoryIdsFromData, ...editedScope3CategoryNums]),
  ).sort((a, b) => a - b);

  return showAllScope3Categories
    ? ALL_SCOPE3_CATEGORY_IDS
    : populatedScope3CategoryIds;
}

export function buildReportingPeriodQuickEditPatch({
  period,
  edited,
  comment,
  source,
  originalScope3Categories,
  toNumberOrNull,
}: {
  period: GarboReportingPeriodSummary;
  edited: ReportingPeriodQuickEditEdited;
  comment: string;
  source: string;
  originalScope3Categories:
    | Array<{ category: number; total: number | null }>
    | undefined;
  toNumberOrNull: (value: string) => number | null;
}): UpdateReportingPeriodsPayload {
  const emissions: Record<string, unknown> = {};
  const economy: Record<string, unknown> = {};

  // Economy
  if (
    edited.turnoverValue != null ||
    edited.turnoverCurrency != null ||
    edited.turnoverVerified != null
  ) {
    economy.turnover = {
      value:
        edited.turnoverValue != null
          ? toNumberOrNull(edited.turnoverValue)
          : undefined,
      currency:
        edited.turnoverCurrency != null
          ? edited.turnoverCurrency.trim().toUpperCase()
          : undefined,
      verified: edited.turnoverVerified ?? undefined,
    };
  }
  if (
    edited.employeesValue != null ||
    edited.employeesUnit != null ||
    edited.employeesVerified != null
  ) {
    economy.employees = {
      value:
        edited.employeesValue != null
          ? toNumberOrNull(edited.employeesValue)
          : undefined,
      unit: edited.employeesUnit != null ? edited.employeesUnit : undefined,
      verified: edited.employeesVerified ?? undefined,
    };
  }

  // Emissions
  if (edited.scope1Total != null || edited.scope1Verified != null) {
    emissions.scope1 = {
      total:
        edited.scope1Total != null
          ? toNumberOrNull(edited.scope1Total)
          : undefined,
      unit: "tCO2e",
      verified: edited.scope1Verified ?? undefined,
    };
  }
  if (edited.scope1And2Total != null || edited.scope1And2Verified != null) {
    emissions.scope1And2 = {
      total:
        edited.scope1And2Total != null
          ? toNumberOrNull(edited.scope1And2Total)
          : undefined,
      unit: "tCO2e",
      verified: edited.scope1And2Verified ?? undefined,
    };
  }
  if (
    edited.scope2Mb != null ||
    edited.scope2Lb != null ||
    edited.scope2Unknown != null ||
    edited.scope2Verified != null
  ) {
    emissions.scope2 = {
      mb: edited.scope2Mb != null ? toNumberOrNull(edited.scope2Mb) : undefined,
      lb: edited.scope2Lb != null ? toNumberOrNull(edited.scope2Lb) : undefined,
      unknown:
        edited.scope2Unknown != null
          ? toNumberOrNull(edited.scope2Unknown)
          : undefined,
      unit: "tCO2e",
      verified: edited.scope2Verified ?? undefined,
    };
  }
  if (
    edited.scope3StatedTotal != null ||
    edited.scope3StatedTotalVerified != null
  ) {
    const hasValueEdit = edited.scope3StatedTotal != null;
    const hasVerifiedEdit = edited.scope3StatedTotalVerified != null;
    const originalTotal =
      period.emissions?.scope3?.statedTotalEmissions?.total ?? null;

    if (!(hasVerifiedEdit && !hasValueEdit && originalTotal == null)) {
      emissions.scope3 = {
        ...(emissions.scope3 ?? {}),
        statedTotalEmissions: {
          total: hasValueEdit
            ? toNumberOrNull(edited.scope3StatedTotal ?? "")
            : originalTotal,
          unit: "tCO2e",
          verified: hasVerifiedEdit
            ? edited.scope3StatedTotalVerified
            : undefined,
        },
      };
    }
  }
  if (edited.scope3Categories || edited.scope3CategoriesVerified) {
    const vals = edited.scope3Categories ?? {};
    const vers = edited.scope3CategoriesVerified ?? {};
    const ids = new Set<string>([...Object.keys(vals), ...Object.keys(vers)]);
    const cats = Array.from(ids)
      .map((id) => {
        const category = Number(id);
        if (!Number.isFinite(category)) return null;
        const hasVal = Object.prototype.hasOwnProperty.call(vals, id);
        const hasVer = Object.prototype.hasOwnProperty.call(vers, id);
        if (!hasVal && !hasVer) return null;
        const original = originalScope3Categories?.find(
          (c) => c.category === category,
        );
        if (!hasVal && hasVer && original?.total == null) return null;
        return {
          category,
          total: hasVal
            ? toNumberOrNull(vals[id] ?? "")
            : (original?.total ?? null),
          unit: "tCO2e",
          verified: hasVer ? vers[id] : undefined,
        };
      })
      .filter(Boolean);
    if (cats.length) {
      emissions.scope3 = { ...(emissions.scope3 ?? {}), categories: cats };
    }
  }
  if (
    edited.statedTotalEmissions != null ||
    edited.statedTotalVerified != null
  ) {
    emissions.statedTotalEmissions = {
      total:
        edited.statedTotalEmissions != null
          ? toNumberOrNull(edited.statedTotalEmissions)
          : undefined,
      unit: "tCO2e",
      verified: edited.statedTotalVerified ?? undefined,
    };
  }

  return {
    reportingPeriods: [
      attachCompanyReportIdToPeriodPatch(period, {
        startDate: period.startDate,
        endDate: period.endDate,
        reportURL:
          edited.reportURL !== undefined
            ? edited.reportURL.trim()
              ? edited.reportURL.trim()
              : null
            : undefined,
        economy: Object.keys(economy).length ? economy : undefined,
        emissions: Object.keys(emissions).length ? emissions : undefined,
      }),
    ],
    metadata:
      source.trim() || comment.trim()
        ? {
            source: source.trim() || undefined,
            comment: comment.trim() || undefined,
          }
        : undefined,
  };
}
