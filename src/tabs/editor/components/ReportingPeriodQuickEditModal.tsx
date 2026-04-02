import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ExternalLink, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { IconActionButton } from "@/ui/icon-action-button";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { inputClassName } from "../lib/company-edit-utils";
import { getCompany, updateReportingPeriods } from "../lib/companies-api";
import type {
  GarboCompanyDetail,
  GarboCompanyListItem,
  GarboFieldMetadata,
  GarboReportingPeriodSummary,
} from "../lib/types";
import {
  assignNullableStringKey,
  formatDateStamp,
  getPeriodYear,
  toNumberOrNull,
} from "../lib/reporting-period-ui";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { MetadataDetailsDialog } from "./MetadataDetailsDialog";

const ALL_SCOPE3_CATEGORY_IDS = Array.from({ length: 16 }, (_, i) => i + 1);

function quickEditScope3CategoryName(
  cat: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const key = `editor.companies.scope3Categories.${cat}`;
  const label = t(key);
  if (!label || label === key) return t("editor.periodEditor.categoryUnknown", { n: cat });
  return label;
}

type Edited = {
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

function hasAnyEdits(ed: Edited) {
  return Object.keys(ed).length > 0;
}

function normDateKey(iso: string) {
  return iso.slice(0, 10);
}

export function ReportingPeriodQuickEditModal({
  open,
  onOpenChange,
  company,
  year,
  periodMatch,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: GarboCompanyListItem;
  year: string;
  /** When set (e.g. after creating a period), find this exact period instead of the first with the same calendar year. */
  periodMatch?: { startDate: string; endDate: string };
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const [detailCompany, setDetailCompany] = useState<GarboCompanyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoadingDetail(true);
    getCompany(company.wikidataId, controller.signal)
      .then((c) => setDetailCompany(c))
      .catch(() => setDetailCompany(null))
      .finally(() => setLoadingDetail(false));
    return () => controller.abort();
  }, [open, company.wikidataId]);

  const period: GarboReportingPeriodSummary | null = useMemo(() => {
    const periods = detailCompany?.reportingPeriods ?? company.reportingPeriods ?? [];
    if (periodMatch) {
      const a = normDateKey(periodMatch.startDate);
      const b = normDateKey(periodMatch.endDate);
      const byDates = periods.find(
        (p) => normDateKey(p.startDate) === a && normDateKey(p.endDate) === b
      );
      if (byDates) return byDates;
    }
    const match = periods.find((p) => getPeriodYear(p) === year);
    return match ?? null;
  }, [company.reportingPeriods, detailCompany?.reportingPeriods, year, periodMatch]);

  const [edited, setEdited] = useState<Edited>({});
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAllScope3Categories, setShowAllScope3Categories] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDetailCompany(null);
    setLoadingDetail(false);
    setEdited({});
    setComment("");
    setSource("");
    setSaving(false);
    setShowAllScope3Categories(false);
  }, [open, company.wikidataId, year, periodMatch?.startDate, periodMatch?.endDate]);

  const employeeUnitOptions = useMemo(() => ["FTE", "EOY", "AVG"], []);

  const setNullableEdit = (
    key: keyof Edited,
    value: string,
    hadOriginalValue: boolean
  ) => {
    setEdited((prev) =>
      assignNullableStringKey({ ...prev }, String(key), value, hadOriginalValue) as Edited
    );
  };

  const setScope3CatVal = (category: number, value: string, hadOriginalValue: boolean) => {
    const k = String(category);
    setEdited((prev) => {
      const next = { ...prev };
      const map = { ...(next.scope3Categories ?? {}) };
      const trimmedEmpty = value.trim() === "";
      if (trimmedEmpty && !hadOriginalValue) delete map[k];
      else map[k] = trimmedEmpty ? "" : value;
      next.scope3Categories = Object.keys(map).length ? map : undefined;
      return next;
    });
  };

  const setScope3CatVerified = (category: number, verified: boolean) => {
    const k = String(category);
    setEdited((prev) => {
      const next = { ...prev };
      const map = { ...(next.scope3CategoriesVerified ?? {}) };
      map[k] = verified;
      next.scope3CategoriesVerified = map;
      return next;
    });
  };

  const resetScope3Category = (category: number) => {
    const k = String(category);
    setEdited((prev) => {
      const next = { ...prev };
      const vals = { ...(next.scope3Categories ?? {}) };
      const vers = { ...(next.scope3CategoriesVerified ?? {}) };
      delete vals[k];
      delete vers[k];
      next.scope3Categories = Object.keys(vals).length ? vals : undefined;
      next.scope3CategoriesVerified = Object.keys(vers).length ? vers : undefined;
      return next;
    });
  };

  const resetAll = () => setEdited({});

  if (!period) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("editor.reportingPeriodQuickEdit.notFoundTitle", { year })}</DialogTitle>
            <DialogDescription>
              {loadingDetail
                ? t("editor.periodEditor.loadingEllipsis")
                : t("editor.reportingPeriodQuickEdit.notFoundDescription")}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const originalTurnover = period.economy?.turnover?.value ?? null;
  const originalReportURL = period.reportURL ?? null;
  const originalTurnoverCurrency = period.economy?.turnover?.currency ?? "SEK";
  const originalTurnoverVerified = !!period.economy?.turnover?.metadata?.verifiedBy;
  const originalEmployees = period.economy?.employees?.value ?? null;
  const originalEmployeesUnit = period.economy?.employees?.unit ?? "FTE";
  const originalEmployeesVerified = !!period.economy?.employees?.metadata?.verifiedBy;

  const originalScope1 = period.emissions?.scope1?.total ?? null;
  const originalScope1Verified = !!period.emissions?.scope1?.metadata?.verifiedBy;
  const originalScope1And2 = period.emissions?.scope1And2?.total ?? null;
  const originalScope1And2Verified = !!period.emissions?.scope1And2?.metadata?.verifiedBy;
  const originalScope2Mb = period.emissions?.scope2?.mb ?? null;
  const originalScope2Lb = period.emissions?.scope2?.lb ?? null;
  const originalScope2Unknown = period.emissions?.scope2?.unknown ?? null;
  const originalScope2Verified = !!period.emissions?.scope2?.metadata?.verifiedBy;
  const originalScope3StatedTotal = period.emissions?.scope3?.statedTotalEmissions?.total ?? null;
  const originalScope3StatedTotalVerified =
    !!period.emissions?.scope3?.statedTotalEmissions?.metadata?.verifiedBy;
  const originalStatedTotal = period.emissions?.statedTotalEmissions?.total ?? null;
  const originalStatedTotalVerified = !!period.emissions?.statedTotalEmissions?.metadata?.verifiedBy;

  const scope3Categories = period.emissions?.scope3?.categories ?? [];
  const categoryIds = Array.from(new Set(scope3Categories.map((c) => c.category))).sort(
    (a, b) => a - b
  );

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
    new Set<number>([...categoryIds, ...editedScope3CategoryNums])
  ).sort((a, b) => a - b);
  const displayScope3CategoryIds = showAllScope3Categories
    ? ALL_SCOPE3_CATEGORY_IDS
    : populatedScope3CategoryIds;

  const turnoverValue = edited.turnoverValue ?? (originalTurnover != null ? String(originalTurnover) : "");
  const reportURL = edited.reportURL ?? (originalReportURL != null ? String(originalReportURL) : "");
  const turnoverCurrency =
    edited.turnoverCurrency ?? (originalTurnoverCurrency != null ? String(originalTurnoverCurrency) : "SEK");
  const turnoverVerified = edited.turnoverVerified ?? originalTurnoverVerified;
  const employeesValue = edited.employeesValue ?? (originalEmployees != null ? String(originalEmployees) : "");
  const employeesUnit = edited.employeesUnit ?? (originalEmployeesUnit != null ? String(originalEmployeesUnit) : "FTE");
  const employeesVerified = edited.employeesVerified ?? originalEmployeesVerified;

  const scope1Value = edited.scope1Total ?? (originalScope1 != null ? String(originalScope1) : "");
  const scope1Verified = edited.scope1Verified ?? originalScope1Verified;
  const scope1And2Value =
    edited.scope1And2Total ?? (originalScope1And2 != null ? String(originalScope1And2) : "");
  const scope1And2Verified = edited.scope1And2Verified ?? originalScope1And2Verified;
  const scope2MbValue = edited.scope2Mb ?? (originalScope2Mb != null ? String(originalScope2Mb) : "");
  const scope2LbValue = edited.scope2Lb ?? (originalScope2Lb != null ? String(originalScope2Lb) : "");
  const scope2UnknownValue =
    edited.scope2Unknown ?? (originalScope2Unknown != null ? String(originalScope2Unknown) : "");
  const scope2Verified = edited.scope2Verified ?? originalScope2Verified;
  const scope3StatedTotalValue =
    edited.scope3StatedTotal ?? (originalScope3StatedTotal != null ? String(originalScope3StatedTotal) : "");
  const scope3StatedTotalVerified = edited.scope3StatedTotalVerified ?? originalScope3StatedTotalVerified;
  const statedTotalValue =
    edited.statedTotalEmissions ?? (originalStatedTotal != null ? String(originalStatedTotal) : "");
  const statedTotalVerified = edited.statedTotalVerified ?? originalStatedTotalVerified;

  const scope12Label = t("editor.companies.scope1And2");

  const handleSave = async () => {
    if (!hasAnyEdits(edited) && !comment.trim() && !source.trim()) {
      onOpenChange(false);
      return;
    }

    const emissions: Record<string, unknown> = {};
    const economy: Record<string, unknown> = {};

    // Economy
    if (edited.turnoverValue != null || edited.turnoverCurrency != null || edited.turnoverVerified != null) {
      economy.turnover = {
        value: edited.turnoverValue != null ? toNumberOrNull(edited.turnoverValue) : undefined,
        currency: edited.turnoverCurrency != null ? edited.turnoverCurrency.trim().toUpperCase() : undefined,
        verified: edited.turnoverVerified ?? undefined,
      };
    }
    if (edited.employeesValue != null || edited.employeesUnit != null || edited.employeesVerified != null) {
      economy.employees = {
        value: edited.employeesValue != null ? toNumberOrNull(edited.employeesValue) : undefined,
        unit: edited.employeesUnit != null ? edited.employeesUnit : undefined,
        verified: edited.employeesVerified ?? undefined,
      };
    }

    // Emissions
    if (edited.scope1Total != null || edited.scope1Verified != null) {
      emissions.scope1 = { total: edited.scope1Total != null ? toNumberOrNull(edited.scope1Total) : undefined, unit: "tCO2e", verified: edited.scope1Verified ?? undefined };
    }
    if (edited.scope1And2Total != null || edited.scope1And2Verified != null) {
      emissions.scope1And2 = { total: edited.scope1And2Total != null ? toNumberOrNull(edited.scope1And2Total) : undefined, unit: "tCO2e", verified: edited.scope1And2Verified ?? undefined };
    }
    if (edited.scope2Mb != null || edited.scope2Lb != null || edited.scope2Unknown != null || edited.scope2Verified != null) {
      emissions.scope2 = {
        mb: edited.scope2Mb != null ? toNumberOrNull(edited.scope2Mb) : undefined,
        lb: edited.scope2Lb != null ? toNumberOrNull(edited.scope2Lb) : undefined,
        unknown: edited.scope2Unknown != null ? toNumberOrNull(edited.scope2Unknown) : undefined,
        unit: "tCO2e",
        verified: edited.scope2Verified ?? undefined,
      };
    }
    if (edited.scope3StatedTotal != null || edited.scope3StatedTotalVerified != null) {
      emissions.scope3 = {
        ...(emissions.scope3 ?? {}),
        statedTotalEmissions: {
          total: edited.scope3StatedTotal != null ? toNumberOrNull(edited.scope3StatedTotal) : undefined,
          unit: "tCO2e",
          verified: edited.scope3StatedTotalVerified ?? undefined,
        },
      };
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
          const original = scope3Categories.find((c) => c.category === category);
          if (!hasVal && hasVer && original?.total == null) return null;
          return {
            category,
            total: hasVal ? toNumberOrNull(vals[id] ?? "") : (original?.total ?? null),
            unit: "tCO2e",
            verified: hasVer ? vers[id] : undefined,
          };
        })
        .filter(Boolean);
      if (cats.length) {
        emissions.scope3 = { ...(emissions.scope3 ?? {}), categories: cats };
      }
    }
    if (edited.statedTotalEmissions != null || edited.statedTotalVerified != null) {
      emissions.statedTotalEmissions = {
        total: edited.statedTotalEmissions != null ? toNumberOrNull(edited.statedTotalEmissions) : undefined,
        unit: "tCO2e",
        verified: edited.statedTotalVerified ?? undefined,
      };
    }

    setSaving(true);
    try {
      await updateReportingPeriods(company.wikidataId, {
        reportingPeriods: [
          {
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
          },
        ],
        metadata:
          source.trim() || comment.trim()
            ? { source: source.trim() || undefined, comment: comment.trim() || undefined }
            : undefined,
      });
      toast.success(t("editor.reportingPeriodQuickEdit.updatedToast"));
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col max-h-[80vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-gray-01">
              {company.name} · {year}
            </DialogTitle>
            <DialogDescription>
              {t("editor.reportingPeriodQuickEdit.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-02">
              {t("editor.reportingPeriodQuickEdit.periodLabel")}{" "}
              {formatDateStamp(period.startDate)}{" "}
              {t("editor.reportingPeriodQuickEdit.periodRangeSeparator")}{" "}
              {formatDateStamp(period.endDate)}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetAll}
              disabled={!hasAnyEdits(edited)}
              className="min-w-0 px-3"
            >
              <Undo2 className="w-4 h-4 mr-2" />
              {t("editor.periodEditor.reset")}
            </Button>
          </div>

          <div className="shrink-0 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-05/40 px-3 py-2">
            <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide">
              {t("editor.reportingPeriodQuickEdit.reportUrlSection")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {originalReportURL && (
                <Button asChild size="sm" variant="secondary" className="min-w-0">
                  <a href={originalReportURL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t("editor.periodEditor.openReport")}
                  </a>
                </Button>
              )}
              <input
                type="text"
                value={reportURL}
                onChange={(e) => setNullableEdit("reportURL", e.target.value, originalReportURL != null)}
                className={
                  inputClassName +
                  " bg-gray-04 !w-[420px] !max-w-full placeholder:text-gray-02/70 " +
                  (edited.reportURL != null ? " border-orange-03" : "")
                }
                placeholder={t("editor.reportingPeriodQuickEdit.urlPlaceholder")}
              />
              <IconActionButton
                variant="md"
                onClick={() =>
                  setEdited((p) => {
                    const n = { ...p };
                    delete n.reportURL;
                    return n;
                  })
                }
                title={t("editor.reportingPeriodQuickEdit.resetReportUrlTitle")}
                aria-label={t("editor.reportingPeriodQuickEdit.resetReportUrlTitle")}
              >
                <Undo2 className="text-gray-02" />
              </IconActionButton>
            </div>
          </div>

          <div className="mt-4 flex-1 min-h-0 overflow-y-auto px-1 space-y-6">
            <div>
              <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide mb-2">
                {t("editor.reportingPeriodQuickEdit.economySection")}
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-1">
                    <label className="text-sm font-medium text-gray-01">
                      {t("editor.periodEditor.turnover")}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={turnoverValue}
                      onChange={(e) =>
                        setNullableEdit("turnoverValue", e.target.value, originalTurnover != null)
                      }
                      className={
                        inputClassName +
                        " bg-gray-04 !w-44 !max-w-none " +
                        (edited.turnoverValue != null ? " border-orange-03" : "")
                      }
                      step="any"
                    />
                    <input
                      type="text"
                      value={turnoverCurrency}
                      onChange={(e) =>
                        setEdited((p) => ({
                          ...p,
                          turnoverCurrency: e.target.value.toUpperCase(),
                        }))
                      }
                      className={
                        inputClassName +
                        " bg-gray-04 !w-20 !max-w-none text-center " +
                        (edited.turnoverCurrency != null ? " border-orange-03" : "")
                      }
                      placeholder={t("editor.periodEditor.currencyPlaceholder")}
                    />
                    <MetadataDetailsDialog
                      fieldLabel={t("editor.periodEditor.turnover")}
                      metadata={period.economy?.turnover?.metadata as GarboFieldMetadata | null}
                    />
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => {
                          const n = { ...p };
                          delete n.turnoverValue;
                          delete n.turnoverCurrency;
                          delete n.turnoverVerified;
                          return n;
                        })
                      }
                      title={t("editor.reportingPeriodQuickEdit.resetTurnoverTitle")}
                      aria-label={t("editor.reportingPeriodQuickEdit.resetTurnoverTitle")}
                    >
                      <Undo2 className="text-gray-02" />
                    </IconActionButton>
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => ({
                          ...p,
                          turnoverVerified: !turnoverVerified,
                        }))
                      }
                      title={t("editor.periodEditor.toggleVerifiedTitle")}
                      aria-label={t("editor.periodEditor.toggleVerifiedTitle")}
                    >
                      <BadgeCheck
                        className={turnoverVerified ? "text-green-03" : "text-gray-02"}
                      />
                    </IconActionButton>
                  </div>
                </div>

                <div>
                  <div className="mb-1">
                    <label className="text-sm font-medium text-gray-01">
                      {t("editor.periodEditor.employees")}
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      value={employeesValue}
                      onChange={(e) =>
                        setNullableEdit("employeesValue", e.target.value, originalEmployees != null)
                      }
                      className={
                        inputClassName +
                        " bg-gray-04 w-44 max-w-none " +
                        (edited.employeesValue != null ? " border-orange-03" : "")
                      }
                      step="any"
                    />
                    <SingleSelectDropdown
                      options={employeeUnitOptions}
                      value={employeesUnit}
                      onChange={(v) => setEdited((p) => ({ ...p, employeesUnit: v }))}
                      placeholder={t("editor.periodEditor.employeesUnitPlaceholder")}
                      triggerClassName={
                        "w-28 justify-between " +
                        (edited.employeesUnit != null ? "border-orange-03" : "")
                      }
                      panelMinWidth={180}
                      getOptionLabel={(v) => {
                        if (v === "FTE") return t("editor.periodEditor.unitFteLong");
                        if (v === "EOY") return t("editor.periodEditor.unitEoyLong");
                        if (v === "AVG") return t("editor.periodEditor.unitAvgLong");
                        return v;
                      }}
                    />
                    <MetadataDetailsDialog
                      fieldLabel={t("editor.periodEditor.employees")}
                      metadata={period.economy?.employees?.metadata as GarboFieldMetadata | null}
                    />
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => {
                          const n = { ...p };
                          delete n.employeesValue;
                          delete n.employeesUnit;
                          delete n.employeesVerified;
                          return n;
                        })
                      }
                      title={t("editor.reportingPeriodQuickEdit.resetEmployeesTitle")}
                      aria-label={t("editor.reportingPeriodQuickEdit.resetEmployeesTitle")}
                    >
                      <Undo2 className="text-gray-02" />
                    </IconActionButton>
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => ({
                          ...p,
                          employeesVerified: !employeesVerified,
                        }))
                      }
                      title={t("editor.periodEditor.toggleVerifiedTitle")}
                      aria-label={t("editor.periodEditor.toggleVerifiedTitle")}
                    >
                      <BadgeCheck
                        className={employeesVerified ? "text-green-03" : "text-gray-02"}
                      />
                    </IconActionButton>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide mb-2">
                {t("editor.reportingPeriodQuickEdit.emissionsSection")}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-01 mb-1">
                    {t("editor.companies.scope1")}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={scope1Value}
                      onChange={(e) =>
                        setNullableEdit("scope1Total", e.target.value, originalScope1 != null)
                      }
                      className={
                        inputClassName +
                        " bg-gray-04 !w-44 !max-w-none " +
                        (edited.scope1Total != null ? " border-orange-03" : "")
                      }
                    />
                    <MetadataDetailsDialog
                      fieldLabel={t("editor.companies.scope1")}
                      metadata={period.emissions?.scope1?.metadata as GarboFieldMetadata | null}
                    />
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => {
                          const n = { ...p };
                          delete n.scope1Total;
                          delete n.scope1Verified;
                          return n;
                        })
                      }
                      title={t("editor.reportingPeriodQuickEdit.resetScope1Title")}
                      aria-label={t("editor.reportingPeriodQuickEdit.resetScope1Title")}
                    >
                      <Undo2 className="text-gray-02" />
                    </IconActionButton>
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => ({ ...p, scope1Verified: !scope1Verified }))
                      }
                      title={t("editor.periodEditor.toggleVerifiedTitle")}
                      aria-label={t("editor.periodEditor.toggleVerifiedTitle")}
                    >
                      <BadgeCheck
                        className={scope1Verified ? "text-green-03" : "text-gray-02"}
                      />
                    </IconActionButton>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-01 mb-1">{scope12Label}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={scope1And2Value}
                      onChange={(e) =>
                        setNullableEdit(
                          "scope1And2Total",
                          e.target.value,
                          originalScope1And2 != null
                        )
                      }
                      className={
                        inputClassName +
                        " bg-gray-04 !w-44 !max-w-none " +
                        (edited.scope1And2Total != null ? " border-orange-03" : "")
                      }
                    />
                    <MetadataDetailsDialog
                      fieldLabel={scope12Label}
                      metadata={period.emissions?.scope1And2?.metadata as GarboFieldMetadata | null}
                    />
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => {
                          const n = { ...p };
                          delete n.scope1And2Total;
                          delete n.scope1And2Verified;
                          return n;
                        })
                      }
                      title={t("editor.reportingPeriodQuickEdit.resetScope1And2Title")}
                      aria-label={t("editor.reportingPeriodQuickEdit.resetScope1And2Title")}
                    >
                      <Undo2 className="text-gray-02" />
                    </IconActionButton>
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => ({
                          ...p,
                          scope1And2Verified: !scope1And2Verified,
                        }))
                      }
                      title={t("editor.periodEditor.toggleVerifiedTitle")}
                      aria-label={t("editor.periodEditor.toggleVerifiedTitle")}
                    >
                      <BadgeCheck
                        className={scope1And2Verified ? "text-green-03" : "text-gray-02"}
                      />
                    </IconActionButton>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-04 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-01">
                      {t("editor.companies.scope2")}
                    </div>
                    <div className="flex items-center gap-1">
                      <MetadataDetailsDialog
                        fieldLabel={t("editor.companies.scope2")}
                        metadata={period.emissions?.scope2?.metadata as GarboFieldMetadata | null}
                      />
                      <IconActionButton
                        variant="md"
                        onClick={() =>
                          setEdited((p) => {
                            const n = { ...p };
                            delete n.scope2Mb;
                            delete n.scope2Lb;
                            delete n.scope2Unknown;
                            delete n.scope2Verified;
                            return n;
                          })
                        }
                        title={t("editor.reportingPeriodQuickEdit.resetScope2Title")}
                        aria-label={t("editor.reportingPeriodQuickEdit.resetScope2Title")}
                      >
                        <Undo2 className="text-gray-02" />
                      </IconActionButton>
                      <IconActionButton
                        variant="md"
                        onClick={() => setEdited((p) => ({ ...p, scope2Verified: !scope2Verified }))}
                        title={t("editor.periodEditor.toggleVerifiedScope2Title")}
                        aria-label={t("editor.periodEditor.toggleVerifiedScope2Title")}
                      >
                        <BadgeCheck
                          className={scope2Verified ? "text-green-03" : "text-gray-02"}
                        />
                      </IconActionButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs text-gray-02 mb-1">
                        {t("editor.periodEditor.scope2Mb")}
                      </div>
                      <input
                        type="number"
                        value={scope2MbValue}
                        onChange={(e) =>
                          setNullableEdit("scope2Mb", e.target.value, originalScope2Mb != null)
                        }
                        className={
                          inputClassName +
                          " bg-gray-04 w-full max-w-none " +
                          (edited.scope2Mb != null ? " border-orange-03" : "")
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-02 mb-1">
                        {t("editor.periodEditor.scope2Lb")}
                      </div>
                      <input
                        type="number"
                        value={scope2LbValue}
                        onChange={(e) =>
                          setNullableEdit("scope2Lb", e.target.value, originalScope2Lb != null)
                        }
                        className={
                          inputClassName +
                          " bg-gray-04 w-full max-w-none " +
                          (edited.scope2Lb != null ? " border-orange-03" : "")
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-02 mb-1">
                        {t("editor.periodEditor.scope2Unknown")}
                      </div>
                      <input
                        type="number"
                        value={scope2UnknownValue}
                        onChange={(e) =>
                          setNullableEdit(
                            "scope2Unknown",
                            e.target.value,
                            originalScope2Unknown != null
                          )
                        }
                        className={
                          inputClassName +
                          " bg-gray-04 w-full max-w-none " +
                          (edited.scope2Unknown != null ? " border-orange-03" : "")
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-01 mb-1">
                    {t("editor.reportingPeriodQuickEdit.scope3StatedTotal")}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={scope3StatedTotalValue}
                      onChange={(e) =>
                        setNullableEdit(
                          "scope3StatedTotal",
                          e.target.value,
                          originalScope3StatedTotal != null
                        )
                      }
                      className={
                        inputClassName +
                        " bg-gray-04 !w-44 !max-w-none " +
                        (edited.scope3StatedTotal != null ? " border-orange-03" : "")
                      }
                    />
                    <MetadataDetailsDialog
                      fieldLabel={t("editor.reportingPeriodQuickEdit.scope3StatedTotal")}
                      metadata={
                        period.emissions?.scope3?.statedTotalEmissions
                          ?.metadata as GarboFieldMetadata | null
                      }
                    />
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => {
                          const n = { ...p };
                          delete n.scope3StatedTotal;
                          delete n.scope3StatedTotalVerified;
                          return n;
                        })
                      }
                      title={t("editor.reportingPeriodQuickEdit.resetScope3StatedTitle")}
                      aria-label={t("editor.reportingPeriodQuickEdit.resetScope3StatedTitle")}
                    >
                      <Undo2 className="text-gray-02" />
                    </IconActionButton>
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => ({
                          ...p,
                          scope3StatedTotalVerified: !scope3StatedTotalVerified,
                        }))
                      }
                      title={t("editor.periodEditor.toggleVerifiedTitle")}
                      aria-label={t("editor.periodEditor.toggleVerifiedTitle")}
                    >
                      <BadgeCheck
                        className={
                          scope3StatedTotalVerified ? "text-green-03" : "text-gray-02"
                        }
                      />
                    </IconActionButton>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-04 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-medium text-gray-01">
                      {t("editor.reportingPeriodQuickEdit.scope3CategoriesSection")}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-01 shrink-0">
                      <input
                        type="checkbox"
                        checked={showAllScope3Categories}
                        onChange={(e) => setShowAllScope3Categories(e.target.checked)}
                        className="rounded border-gray-03"
                      />
                      {t("editor.reportingPeriodQuickEdit.showAllScope3Categories")}
                    </label>
                  </div>
                  <div className="space-y-2">
                    {displayScope3CategoryIds.map((cat) => {
                        const original = scope3Categories.find((c) => c.category === cat);
                        const originalVal = original?.total ?? null;
                        const originalVerified = !!original?.metadata?.verifiedBy;
                        const editedVal = edited.scope3Categories?.[String(cat)];
                        const val = editedVal ?? (originalVal != null ? String(originalVal) : "");
                        const hasEditedVerified =
                          edited.scope3CategoriesVerified != null &&
                          Object.prototype.hasOwnProperty.call(
                            edited.scope3CategoriesVerified,
                            String(cat)
                          );
                        const v = hasEditedVerified
                          ? !!edited.scope3CategoriesVerified?.[String(cat)]
                          : originalVerified;
                        return (
                          <div key={cat}>
                            <div className="text-xs text-gray-02 mb-1">
                              {t("editor.periodEditor.categoryLine", {
                                n: cat,
                                name: quickEditScope3CategoryName(cat, t),
                              })}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={val}
                                onChange={(e) =>
                                  setScope3CatVal(cat, e.target.value, originalVal != null)
                                }
                                className={
                                  inputClassName +
                                  " bg-gray-04 !w-44 !max-w-none " +
                                  (editedVal != null ? " border-orange-03" : "")
                                }
                              />
                              <MetadataDetailsDialog
                                fieldLabel={t("editor.reportingPeriodQuickEdit.scope3CategoryField", {
                                  n: cat,
                                })}
                                metadata={original?.metadata as GarboFieldMetadata | null}
                              />
                              <IconActionButton
                                variant="md"
                                onClick={() => resetScope3Category(cat)}
                                title={t("editor.periodEditor.resetCategoryTitle")}
                                aria-label={t("editor.periodEditor.resetCategoryTitle")}
                              >
                                <Undo2 className="text-gray-02" />
                              </IconActionButton>
                              <IconActionButton
                                variant="md"
                                onClick={() => setScope3CatVerified(cat, !v)}
                                title={t("editor.periodEditor.toggleVerifiedTitle")}
                                aria-label={t("editor.periodEditor.toggleVerifiedTitle")}
                              >
                                <BadgeCheck
                                  className={v ? "text-green-03" : "text-gray-02"}
                                />
                              </IconActionButton>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-01 mb-1">
                    {t("editor.reportingPeriodQuickEdit.overallTotal")}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={statedTotalValue}
                      onChange={(e) =>
                        setNullableEdit(
                          "statedTotalEmissions",
                          e.target.value,
                          originalStatedTotal != null
                        )
                      }
                      className={
                        inputClassName +
                        " bg-gray-04 !w-44 !max-w-none " +
                        (edited.statedTotalEmissions != null ? " border-orange-03" : "")
                      }
                    />
                    <MetadataDetailsDialog
                      fieldLabel={t("editor.reportingPeriodQuickEdit.overallStatedTotal")}
                      metadata={
                        period.emissions?.statedTotalEmissions?.metadata as GarboFieldMetadata | null
                      }
                    />
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => {
                          const n = { ...p };
                          delete n.statedTotalEmissions;
                          delete n.statedTotalVerified;
                          return n;
                        })
                      }
                      title={t("editor.reportingPeriodQuickEdit.resetOverallStatedTitle")}
                      aria-label={t("editor.reportingPeriodQuickEdit.resetOverallStatedTitle")}
                    >
                      <Undo2 className="text-gray-02" />
                    </IconActionButton>
                    <IconActionButton
                      variant="md"
                      onClick={() =>
                        setEdited((p) => ({
                          ...p,
                          statedTotalVerified: !statedTotalVerified,
                        }))
                      }
                      title={t("editor.periodEditor.toggleVerifiedTitle")}
                      aria-label={t("editor.periodEditor.toggleVerifiedTitle")}
                    >
                      <BadgeCheck
                        className={statedTotalVerified ? "text-green-03" : "text-gray-02"}
                      />
                    </IconActionButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "shrink-0 z-10 -mx-4 sm:-mx-6 mt-3 border-t border-gray-03/60 bg-gray-04/95 px-4 sm:px-6 pt-4 pb-4 backdrop-blur-sm",
              "shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.55)]"
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-01 mb-1">
                  {t("editor.reviewerDialog.comment")}{" "}
                  <span className="text-sm font-normal text-gray-02">
                    {t("editor.reviewerDialog.optional")}
                  </span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className={cn(
                    inputClassName,
                    "bg-gray-04 min-h-[72px] resize-y !placeholder:text-gray-02"
                  )}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-01 mb-1">
                  {t("editor.reviewerDialog.source")}{" "}
                  <span className="text-sm font-normal text-gray-02">
                    {t("editor.reviewerDialog.optional")}
                  </span>
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={cn(inputClassName, "bg-gray-04 !placeholder:text-gray-02")}
                  placeholder={t("editor.reviewerDialog.sourcePlaceholder")}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? t("editor.periodEditor.saving") : t("editor.reportingPeriodQuickEdit.save")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

