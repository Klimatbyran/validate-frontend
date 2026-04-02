import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ExternalLink, Loader2, BadgeCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import type { GarboCompanyDetail } from "../lib/types";
import { updateReportingPeriods } from "../lib/companies-api";
import { inputClassName } from "../lib/company-edit-utils";
import { MetadataDetailsDialog } from "./MetadataDetailsDialog";
import { ReviewerMetadataDialog } from "./ReviewerMetadataDialog";

type EditedPeriodEmissions = {
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

function toNumberOrNull(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatDateStamp(isoLike?: string | null) {
  if (!isoLike) return "—";
  return isoLike.slice(0, 10);
}

function formatPeriodDateRange(startDate?: string, endDate?: string): string {
  return `${formatDateStamp(startDate)} – ${formatDateStamp(endDate)}`;
}

/** Row label like `1. Purchased goods and services` (GHG Scope 3 category). */
function scope3CategoryRowLabel(categoryId: number, t: (key: string) => string): string {
  const key = `editor.companies.scope3Categories.${categoryId}`;
  const name = t(key);
  const missing = !name || name === key;
  const title = missing ? `Category ${categoryId}` : name;
  return `${categoryId}. ${title}`;
}

function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

function Scope2TopBracket() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 36 36"
      className="shrink-0 text-gray-02"
      aria-hidden
    >
      <rect x="18" y="18" width="2" height="18" fill="currentColor" />
      <rect x="10" y="18" width="10" height="2" fill="currentColor" />
    </svg>
  );
}

function Scope2BottomBracket() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 36 36"
      className="shrink-0 text-gray-02"
      aria-hidden
    >
      <rect x="18" y="0" width="2" height="18" fill="currentColor" />
      <rect x="10" y="18" width="10" height="2" fill="currentColor" />
    </svg>
  );
}

function EmissionsEditRow({
  name,
  headerName,
  noHover,
  children,
}: {
  name: ReactNode;
  headerName?: boolean;
  noHover?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex ps-4 rounded-s-lg items-stretch min-w-max ${
        noHover ? "" : "hover:bg-gray-04/50"
      }`}
    >
      <div
        className={`shrink-0 w-60 py-2 pr-2 flex flex-col justify-center ${
          headerName
            ? "text-sm font-semibold text-gray-01"
            : "text-sm font-medium ps-2 text-gray-01"
        }`}
      >
        {name}
      </div>
      <div className="flex shrink-0">{children}</div>
    </div>
  );
}

/** Fixed width per period so vertical borders align across reporting + emissions sections. */
const emissionsPeriodColBox =
  "box-border w-80 min-w-80 max-w-80 shrink-0 ms-2 border-r border-gray-03";

const emissionsFieldCellClass = `${emissionsPeriodColBox} flex items-center gap-1 py-2 min-h-[44px] min-w-0`;

const emissionsPeriodHeaderCellClass = `${emissionsPeriodColBox} flex py-2 items-center justify-end gap-2 min-h-9 min-w-0`;

const emissionsPeriodEmptyCellClass = `${emissionsPeriodColBox} py-2 min-h-[36px] min-w-0`;

export function EmissionsDataTab({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const scope1And2Label = t("editor.companies.scope1And2");
  const scope1And2Display =
    scope1And2Label && !scope1And2Label.includes(".") ? scope1And2Label : "Scope 1+2";

  const periods = useMemo(
    () => (company.reportingPeriods ?? []).filter((rp) => rp.startDate && rp.endDate),
    [company.reportingPeriods]
  );

  const [edited, setEdited] = useState<Record<string, EditedPeriodEmissions>>({});
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showAllYears, setShowAllYears] = useState(true);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    setEdited({});
    setComment("");
    setSource("");
    setSaving(false);
    setSaveDialogOpen(false);
    setShowAllYears(true);
    setSelectedYears([]);
    setSortOrder("desc");
  }, [company.wikidataId]);

  const sortedPeriods = useMemo(() => {
    const key = (p: { endDate?: string; startDate?: string }) =>
      p.endDate ?? p.startDate ?? "";
    const sorted = [...periods].sort((a, b) => key(b).localeCompare(key(a)));
    return sortOrder === "desc" ? sorted : sorted.slice().reverse();
  }, [periods, sortOrder]);

  const years = useMemo(() => {
    const set = new Set<string>();
    sortedPeriods.forEach((p) => {
      const y = getPeriodYear(p);
      if (y) set.add(y);
    });
    const arr = Array.from(set).sort((a, b) => b.localeCompare(a));
    return sortOrder === "desc" ? arr : arr.slice().reverse();
  }, [sortedPeriods, sortOrder]);

  const visiblePeriods = useMemo(() => {
    const base = sortedPeriods;
    if (showAllYears) return base;
    if (!selectedYears.length) return base;
    return base.filter((p) => {
      const y = getPeriodYear(p);
      return y ? selectedYears.includes(y) : false;
    });
  }, [sortedPeriods, selectedYears, showAllYears]);

  const setEditedField = (rpId: string, patch: Partial<EditedPeriodEmissions>) => {
    setEdited((prev) => {
      const current = prev[rpId] ?? {};
      const nextForRp: EditedPeriodEmissions = { ...current, ...patch };
      const hasAny = Object.keys(nextForRp).length > 0;
      if (!hasAny) return prev;
      return { ...prev, [rpId]: nextForRp };
    });
  };

  const setNullableStringEdit = (
    rpId: string,
    key: keyof EditedPeriodEmissions,
    value: string,
    hadOriginalValue: boolean
  ) => {
    setEdited((prev) => {
      const current = prev[rpId] ?? {};
      const nextForRp: EditedPeriodEmissions = { ...current };
      const trimmedEmpty = value.trim() === "";
      if (trimmedEmpty && !hadOriginalValue) {
        delete (nextForRp as any)[key];
      } else {
        (nextForRp as any)[key] = trimmedEmpty ? "" : value;
      }
      const hasAny = Object.keys(nextForRp).length > 0;
      if (!hasAny) {
        const next = { ...prev };
        delete next[rpId];
        return next;
      }
      return { ...prev, [rpId]: nextForRp };
    });
  };

  const setScope3CategoryValue = (
    rpId: string,
    category: number,
    value: string,
    hadOriginalValue: boolean
  ) => {
    const key = String(category);
    setEdited((prev) => {
      const current = prev[rpId] ?? {};
      const nextForRp: EditedPeriodEmissions = { ...current };
      const nextCats = { ...(current.scope3Categories ?? {}) };
      if (value.trim() === "" && !hadOriginalValue) {
        delete nextCats[key];
      } else {
        nextCats[key] = value.trim() === "" ? "" : value;
      }
      nextForRp.scope3Categories = Object.keys(nextCats).length ? nextCats : undefined;

      const hasAny = Object.keys(nextForRp).some((k) => (nextForRp as any)[k] != null);
      if (!hasAny) {
        const next = { ...prev };
        delete next[rpId];
        return next;
      }
      return { ...prev, [rpId]: nextForRp };
    });
  };

  const setScope3CategoryVerified = (rpId: string, category: number, verified: boolean) => {
    const key = String(category);
    setEdited((prev) => {
      const current = prev[rpId] ?? {};
      const next = { ...(current.scope3CategoriesVerified ?? {}), [key]: verified };
      return { ...prev, [rpId]: { ...current, scope3CategoriesVerified: next } };
    });
  };

  const resetPeriod = (rpId: string) => {
    setEdited((prev) => {
      const next = { ...prev };
      delete next[rpId];
      return next;
    });
  };

  const resetAll = () => setEdited({});

  const clearEditedKeys = (rpId: string, keys: Array<keyof EditedPeriodEmissions>) => {
    setEdited((prev) => {
      const current = prev[rpId];
      if (!current) return prev;
      const nextForRp: EditedPeriodEmissions = { ...current };
      keys.forEach((k) => {
        delete (nextForRp as any)[k];
      });
      const hasAny = Object.keys(nextForRp).length > 0;
      return hasAny ? { ...prev, [rpId]: nextForRp } : (() => {
        const next = { ...prev };
        delete next[rpId];
        return next;
      })();
    });
  };

  const visibleColumns = useMemo(() => {
    return visiblePeriods.map((rp) => {
      const dateRangeLabel = formatPeriodDateRange(rp.startDate, rp.endDate);
      const year = getPeriodYear(rp);
      return { rp, dateRangeLabel, year: year ?? "" };
    });
  }, [visiblePeriods]);

  const scope3CategoryIds = useMemo(() => {
    const set = new Set<number>();
    visiblePeriods.forEach((rp) => {
      rp.emissions?.scope3?.categories?.forEach((c) => {
        if (typeof c.category === "number") set.add(c.category);
      });
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [visiblePeriods]);

  const VerifyButton = ({
    checked,
    onClick,
    ariaLabel,
  }: {
    checked: boolean;
    onClick: () => void;
    ariaLabel: string;
  }) => (
    <button
      type="button"
      className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-03/40"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <BadgeCheck className={"w-4 h-4 " + (checked ? "text-green-03" : "text-gray-02")} />
    </button>
  );

  const UndoFieldButton = ({
    disabled,
    onClick,
    ariaLabel,
  }: {
    disabled: boolean;
    onClick: () => void;
    ariaLabel: string;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        "shrink-0 h-8 w-8 rounded-full flex items-center justify-center " +
        (disabled ? "opacity-30 cursor-default" : "hover:bg-gray-03/40")
      }
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Undo2 className="w-4 h-4 text-gray-02" />
    </button>
  );

  const handleSave = async (meta?: { comment?: string; source?: string }) => {
    const payloadPeriods = visiblePeriods
      .map((rp) => {
        const rpEdits = edited[rp.id];
        if (!rpEdits) return null;

        const hasScope1 = rpEdits.scope1Total != null || rpEdits.scope1Verified != null;
        const hasScope1And2 =
          rpEdits.scope1And2Total != null || rpEdits.scope1And2Verified != null;
        const hasScope2 =
          rpEdits.scope2Mb != null ||
          rpEdits.scope2Lb != null ||
          rpEdits.scope2Unknown != null ||
          rpEdits.scope2Verified != null;
        const hasStatedTotal =
          rpEdits.statedTotalEmissions != null || rpEdits.statedTotalVerified != null;
        const hasScope3StatedTotal =
          rpEdits.scope3StatedTotalEmissions != null ||
          rpEdits.scope3StatedTotalVerified != null;
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
            total:
              rpEdits.scope1Total != null ? toNumberOrNull(rpEdits.scope1Total) : undefined,
            unit: "tCO2e",
            verified: rpEdits.scope1Verified ?? undefined,
          };
        }
        if (hasScope1And2) {
          emissions.scope1And2 = {
            total:
              rpEdits.scope1And2Total != null
                ? toNumberOrNull(rpEdits.scope1And2Total)
                : undefined,
            unit: "tCO2e",
            verified: rpEdits.scope1And2Verified ?? undefined,
          };
        }
        if (hasScope2) {
          emissions.scope2 = {
            mb: rpEdits.scope2Mb != null ? toNumberOrNull(rpEdits.scope2Mb) : undefined,
            lb: rpEdits.scope2Lb != null ? toNumberOrNull(rpEdits.scope2Lb) : undefined,
            unknown:
              rpEdits.scope2Unknown != null ? toNumberOrNull(rpEdits.scope2Unknown) : undefined,
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
        if (hasScope3StatedTotal) {
          emissions.scope3 = {
            ...(emissions.scope3 as any),
            statedTotalEmissions: {
              total:
                rpEdits.scope3StatedTotalEmissions != null
                  ? toNumberOrNull(rpEdits.scope3StatedTotalEmissions)
                  : undefined,
              unit: "tCO2e",
              verified: rpEdits.scope3StatedTotalVerified ?? undefined,
            },
          };
        }

        if (hasScope3Categories) {
          const catVals = rpEdits.scope3Categories ?? {};
          const catVerified = rpEdits.scope3CategoriesVerified ?? {};
          const changedIds = new Set<string>([
            ...Object.keys(catVals),
            ...Object.keys(catVerified),
          ]);

          const categories = Array.from(changedIds)
            .map((id) => {
              const category = Number(id);
              if (!Number.isFinite(category)) return null;
              const original = rp.emissions?.scope3?.categories?.find(
                (c) => c.category === category
              );
              const hasVal = Object.prototype.hasOwnProperty.call(catVals, id);
              const hasVer = Object.prototype.hasOwnProperty.call(catVerified, id);

              if (!hasVal && !hasVer) return null;
              if (!hasVal && hasVer && original?.total == null) return null;

              return {
                category,
                total: hasVal ? toNumberOrNull(catVals[id] ?? "") : (original?.total ?? null),
                unit: "tCO2e",
                verified: hasVer ? catVerified[id] : undefined,
              };
            })
            .filter(Boolean);

          if (categories.length) {
            emissions.scope3 = {
              ...(emissions.scope3 as any),
              categories,
            };
          }
        }

        return {
          startDate: rp.startDate,
          endDate: rp.endDate,
          emissions: Object.keys(emissions).length ? emissions : undefined,
        };
      })
      .filter(Boolean) as Array<{
      startDate: string;
      endDate: string;
      emissions?: Record<string, unknown>;
    }>;

    if (!payloadPeriods.length) {
      toast.message("Nothing to save.");
      return;
    }

    setSaving(true);
    try {
      await updateReportingPeriods(company.wikidataId, {
        reportingPeriods: payloadPeriods,
        metadata:
          meta?.source?.trim() || meta?.comment?.trim()
            ? { source: meta.source?.trim() || undefined, comment: meta.comment?.trim() || undefined }
            : undefined,
      });
      toast.success(t("editor.tagOptions.updated"));
      setEdited({});
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const numInputClass =
    inputClassName +
    " w-[150px] shrink-0 !max-w-none text-right tabular-nums bg-gray-04";

  return (
    <section className="rounded-lg bg-gray-05 p-4 w-full min-w-0 max-w-full">
      <div className="border-b border-gray-03/60 pb-6 mb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-01 tracking-tight">
              {t("editor.singleCompanyView.tabs.emissionsData")}
            </h2>
            <p className="text-xs text-gray-02 mt-2 leading-relaxed">
              {t("editor.singleCompanyView.emissionsDataHint")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 shrink-0 lg:pt-0.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
              className="min-w-0 max-w-none px-3 text-xs h-8"
            >
              {sortOrder === "desc" ? "Newest → Oldest" : "Oldest → Newest"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetAll}
              disabled={Object.keys(edited).length === 0}
              className="min-w-0 max-w-none px-3 text-xs h-8"
              title="Reset all changes"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1.5" />
              Reset all
            </Button>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-01">
              <input
                type="checkbox"
                checked={showAllYears}
                onChange={(e) => setShowAllYears(e.target.checked)}
                className="rounded border-gray-03"
              />
              Show all years
            </label>
            {years.length > 0 && (
              <MultiSelectDropdown
                options={years}
                selectedIds={showAllYears ? [] : selectedYears}
                onChange={(ids) => {
                  setSelectedYears(ids);
                  if (ids.length > 0) setShowAllYears(false);
                }}
                triggerLabel="Years"
                emptyLabel="All years"
                triggerClassName="min-w-[130px] !h-8 !text-xs px-3"
              />
            )}
          </div>
        </div>
      </div>

      {visiblePeriods.length ? (
        <div className="w-full min-w-0 overflow-x-auto overflow-y-visible">
          <div className="min-w-max pb-2">
            <p className="text-[11px] font-semibold text-gray-02 mb-3 px-2 uppercase tracking-wider">
              {t("editor.singleCompanyView.sections.reportingPeriods")}
            </p>

            <div className="mb-8">
              <EmissionsEditRow name="Reporting period" headerName noHover>
                {visibleColumns.map(({ rp, dateRangeLabel, year }) => (
                  <div key={rp.id} className={emissionsPeriodHeaderCellClass}>
                    <div className="text-right min-w-0 flex-1">
                      {year ? (
                        <>
                          <div className="text-sm font-semibold text-gray-01">{year}</div>
                          <div className="text-[11px] text-gray-02 mt-0.5 leading-tight break-words">
                            {dateRangeLabel}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-gray-01">{dateRangeLabel}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => resetPeriod(rp.id)}
                      disabled={!edited[rp.id]}
                      className={
                        "shrink-0 h-8 w-8 rounded-full inline-flex items-center justify-center " +
                        (!edited[rp.id] ? "opacity-30 cursor-default" : "hover:bg-gray-03/40")
                      }
                      title="Reset this year"
                      aria-label="Reset this year"
                    >
                      <Undo2 className="w-4 h-4 text-gray-02" />
                    </button>
                  </div>
                ))}
              </EmissionsEditRow>

              <EmissionsEditRow name={t("editor.companies.reportUrl")}>
                {visibleColumns.map(({ rp }) => {
                  const url = (rp.reportURL ?? "").trim();
                  return (
                    <div
                      key={rp.id}
                      className={
                        emissionsFieldCellClass + " justify-center sm:justify-start"
                      }
                    >
                      {url ? (
                        <Button
                          asChild
                          variant="secondary"
                          size="sm"
                          className="min-w-0 max-w-none shrink-0 px-3 text-xs h-8"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Open
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-02">—</span>
                      )}
                    </div>
                  );
                })}
              </EmissionsEditRow>
            </div>

            <p className="text-[11px] font-semibold text-gray-02 mb-3 px-2 uppercase tracking-wider">
              {t("editor.singleCompanyView.sections.emissions")}
            </p>

            <div className="mb-8">
              <EmissionsEditRow name="Overall stated total" headerName>
                {visibleColumns.map(({ rp, year }) => {
                  const rpEdits = edited[rp.id] ?? {};
                  const original = rp.emissions?.statedTotalEmissions?.total ?? null;
                  const originalVerified =
                    !!rp.emissions?.statedTotalEmissions?.metadata?.verifiedBy;
                  const value =
                    rpEdits.statedTotalEmissions ?? (original != null ? String(original) : "");
                  const dirty = rpEdits.statedTotalEmissions != null;
                  const dirtyVerified = rpEdits.statedTotalVerified != null;
                  const verified = rpEdits.statedTotalVerified ?? originalVerified;
                  const undoDisabled = !(dirty || dirtyVerified);
                  return (
                    <div key={rp.id} className={emissionsFieldCellClass}>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setNullableStringEdit(
                            rp.id,
                            "statedTotalEmissions",
                            e.target.value,
                            original != null
                          )
                        }
                        className={
                          numInputClass +
                          " placeholder:text-gray-02/70" +
                          (dirty ? " border-orange-03" : "")
                        }
                        step="any"
                      />
                      <MetadataDetailsDialog
                        fieldLabel={`Overall stated total (${year || ""})`}
                        metadata={rp.emissions?.statedTotalEmissions?.metadata as any}
                      />
                      <VerifyButton
                        checked={verified}
                        onClick={() =>
                          setEditedField(rp.id, { statedTotalVerified: !verified })
                        }
                        ariaLabel={t("editor.fieldEdit.markVerified")}
                      />
                      <UndoFieldButton
                        disabled={undoDisabled}
                        onClick={() =>
                          clearEditedKeys(rp.id, ["statedTotalEmissions", "statedTotalVerified"])
                        }
                        ariaLabel="Undo overall stated total"
                      />
                    </div>
                  );
                })}
              </EmissionsEditRow>

              <EmissionsEditRow name={t("editor.companies.scope1") ?? "Scope 1"} headerName>
                {visibleColumns.map(({ rp, year }) => {
                  const rpEdits = edited[rp.id] ?? {};
                  const original = rp.emissions?.scope1?.total ?? null;
                  const originalVerified = !!rp.emissions?.scope1?.metadata?.verifiedBy;
                  const value = rpEdits.scope1Total ?? (original != null ? String(original) : "");
                  const dirty = rpEdits.scope1Total != null;
                  const dirtyVerified = rpEdits.scope1Verified != null;
                  const verified = rpEdits.scope1Verified ?? originalVerified;
                  const undoDisabled = !(dirty || dirtyVerified);
                  return (
                    <div key={rp.id} className={emissionsFieldCellClass}>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setNullableStringEdit(
                            rp.id,
                            "scope1Total",
                            e.target.value,
                            original != null
                          )
                        }
                        className={
                          numInputClass +
                          " placeholder:text-gray-02/70" +
                          (dirty ? " border-orange-03" : "")
                        }
                        step="any"
                      />
                      <MetadataDetailsDialog
                        fieldLabel={`${t("editor.companies.scope1") ?? "Scope 1"} (${year || ""})`}
                        metadata={rp.emissions?.scope1?.metadata as any}
                      />
                      <VerifyButton
                        checked={verified}
                        onClick={() => setEditedField(rp.id, { scope1Verified: !verified })}
                        ariaLabel={t("editor.fieldEdit.markVerified")}
                      />
                      <UndoFieldButton
                        disabled={undoDisabled}
                        onClick={() => clearEditedKeys(rp.id, ["scope1Total", "scope1Verified"])}
                        ariaLabel="Undo Scope 1"
                      />
                    </div>
                  );
                })}
              </EmissionsEditRow>

              <EmissionsEditRow name={scope1And2Display} headerName>
                {visibleColumns.map(({ rp, year }) => {
                  const rpEdits = edited[rp.id] ?? {};
                  const original = rp.emissions?.scope1And2?.total ?? null;
                  const originalVerified = !!rp.emissions?.scope1And2?.metadata?.verifiedBy;
                  const value =
                    rpEdits.scope1And2Total ?? (original != null ? String(original) : "");
                  const dirty = rpEdits.scope1And2Total != null;
                  const dirtyVerified = rpEdits.scope1And2Verified != null;
                  const verified = rpEdits.scope1And2Verified ?? originalVerified;
                  const undoDisabled = !(dirty || dirtyVerified);
                  return (
                    <div key={rp.id} className={emissionsFieldCellClass}>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setNullableStringEdit(
                            rp.id,
                            "scope1And2Total",
                            e.target.value,
                            original != null
                          )
                        }
                        className={
                          numInputClass +
                          " placeholder:text-gray-02/70" +
                          (dirty ? " border-orange-03" : "")
                        }
                        step="any"
                      />
                      <MetadataDetailsDialog
                        fieldLabel={`${scope1And2Display} (${year || ""})`}
                        metadata={rp.emissions?.scope1And2?.metadata as any}
                      />
                      <VerifyButton
                        checked={verified}
                        onClick={() =>
                          setEditedField(rp.id, { scope1And2Verified: !verified })
                        }
                        ariaLabel={t("editor.fieldEdit.markVerified")}
                      />
                      <UndoFieldButton
                        disabled={undoDisabled}
                        onClick={() =>
                          clearEditedKeys(rp.id, ["scope1And2Total", "scope1And2Verified"])
                        }
                        ariaLabel="Undo Scope 1+2"
                      />
                    </div>
                  );
                })}
              </EmissionsEditRow>

              <EmissionsEditRow
                name={
                  <span>
                    <span className="block">{t("editor.companies.scope2") ?? "Scope 2"}</span>
                    <span className="block text-xs font-normal text-gray-02 mt-1 font-sans">
                      Verified as a unit (MB/LB/Unknown).
                    </span>
                  </span>
                }
                headerName
                noHover
              >
                {visibleColumns.map(({ rp, year }) => {
                  const rpEdits = edited[rp.id] ?? {};
                  const originalVerified = !!rp.emissions?.scope2?.metadata?.verifiedBy;
                  const verified = rpEdits.scope2Verified ?? originalVerified;
                  const dirty =
                    rpEdits.scope2Mb != null ||
                    rpEdits.scope2Lb != null ||
                    rpEdits.scope2Unknown != null;
                  const dirtyVerified = rpEdits.scope2Verified != null;
                  const undoDisabled = !(dirty || dirtyVerified);
                  return (
                    <div key={rp.id} className={emissionsFieldCellClass}>
                      <MetadataDetailsDialog
                        fieldLabel={`${t("editor.companies.scope2") ?? "Scope 2"} (${year || ""})`}
                        metadata={rp.emissions?.scope2?.metadata as any}
                      />
                      <VerifyButton
                        checked={verified}
                        onClick={() => setEditedField(rp.id, { scope2Verified: !verified })}
                        ariaLabel={t("editor.fieldEdit.markVerified")}
                      />
                      <UndoFieldButton
                        disabled={undoDisabled}
                        onClick={() =>
                          clearEditedKeys(rp.id, [
                            "scope2Mb",
                            "scope2Lb",
                            "scope2Unknown",
                            "scope2Verified",
                          ])
                        }
                        ariaLabel="Undo Scope 2"
                      />
                    </div>
                  );
                })}
              </EmissionsEditRow>

              <EmissionsEditRow name={<span className="ps-2 font-medium">MB</span>}>
                {visibleColumns.map(({ rp }) => {
                  const rpEdits = edited[rp.id] ?? {};
                  const original = rp.emissions?.scope2?.mb ?? null;
                  const value = rpEdits.scope2Mb ?? (original != null ? String(original) : "");
                  const dirty =
                    rpEdits.scope2Mb != null ||
                    rpEdits.scope2Lb != null ||
                    rpEdits.scope2Unknown != null;
                  return (
                    <div key={rp.id} className={emissionsFieldCellClass}>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setNullableStringEdit(rp.id, "scope2Mb", e.target.value, original != null)
                        }
                        className={
                          numInputClass +
                          " placeholder:text-gray-02/70" +
                          (dirty ? " border-orange-03" : "")
                        }
                        step="any"
                      />
                      <Scope2TopBracket />
                    </div>
                  );
                })}
              </EmissionsEditRow>

              <EmissionsEditRow name={<span className="ps-2 font-medium">LB</span>}>
                {visibleColumns.map(({ rp }) => {
                  const rpEdits = edited[rp.id] ?? {};
                  const original = rp.emissions?.scope2?.lb ?? null;
                  const value = rpEdits.scope2Lb ?? (original != null ? String(original) : "");
                  const dirty =
                    rpEdits.scope2Mb != null ||
                    rpEdits.scope2Lb != null ||
                    rpEdits.scope2Unknown != null;
                  return (
                    <div key={rp.id} className={emissionsFieldCellClass}>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setNullableStringEdit(rp.id, "scope2Lb", e.target.value, original != null)
                        }
                        className={
                          numInputClass +
                          " placeholder:text-gray-02/70" +
                          (dirty ? " border-orange-03" : "")
                        }
                        step="any"
                      />
                    </div>
                  );
                })}
              </EmissionsEditRow>

              <EmissionsEditRow name={<span className="ps-2 font-medium">Unknown</span>}>
                {visibleColumns.map(({ rp }) => {
                  const rpEdits = edited[rp.id] ?? {};
                  const original = rp.emissions?.scope2?.unknown ?? null;
                  const value =
                    rpEdits.scope2Unknown ?? (original != null ? String(original) : "");
                  const dirty =
                    rpEdits.scope2Mb != null ||
                    rpEdits.scope2Lb != null ||
                    rpEdits.scope2Unknown != null;
                  return (
                    <div key={rp.id} className={emissionsFieldCellClass}>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setNullableStringEdit(
                            rp.id,
                            "scope2Unknown",
                            e.target.value,
                            original != null
                          )
                        }
                        className={
                          numInputClass +
                          " placeholder:text-gray-02/70" +
                          (dirty ? " border-orange-03" : "")
                        }
                        step="any"
                      />
                      <Scope2BottomBracket />
                    </div>
                  );
                })}
              </EmissionsEditRow>

              <EmissionsEditRow name="Scope 3" headerName noHover>
                {visibleColumns.map(({ rp }) => (
                  <div key={rp.id} className={emissionsPeriodEmptyCellClass} />
                ))}
              </EmissionsEditRow>

              <EmissionsEditRow name={<span className="ps-2">Stated total</span>}>
                {visibleColumns.map(({ rp, year }) => {
                  const rpEdits = edited[rp.id] ?? {};
                  const original = rp.emissions?.scope3?.statedTotalEmissions?.total ?? null;
                  const originalVerified =
                    !!rp.emissions?.scope3?.statedTotalEmissions?.metadata?.verifiedBy;
                  const value =
                    rpEdits.scope3StatedTotalEmissions ??
                    (original != null ? String(original) : "");
                  const dirty = rpEdits.scope3StatedTotalEmissions != null;
                  const dirtyVerified = rpEdits.scope3StatedTotalVerified != null;
                  const verified = rpEdits.scope3StatedTotalVerified ?? originalVerified;
                  const undoDisabled = !(dirty || dirtyVerified);
                  return (
                    <div key={rp.id} className={emissionsFieldCellClass}>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setNullableStringEdit(
                            rp.id,
                            "scope3StatedTotalEmissions",
                            e.target.value,
                            original != null
                          )
                        }
                        className={
                          numInputClass +
                          " placeholder:text-gray-02/70" +
                          (dirty ? " border-orange-03" : "")
                        }
                        step="any"
                      />
                      <MetadataDetailsDialog
                        fieldLabel={`Scope 3 stated total (${year || ""})`}
                        metadata={rp.emissions?.scope3?.statedTotalEmissions?.metadata as any}
                      />
                      <VerifyButton
                        checked={verified}
                        onClick={() =>
                          setEditedField(rp.id, {
                            scope3StatedTotalVerified: !verified,
                          })
                        }
                        ariaLabel={t("editor.fieldEdit.markVerified")}
                      />
                      <UndoFieldButton
                        disabled={undoDisabled}
                        onClick={() =>
                          clearEditedKeys(rp.id, [
                            "scope3StatedTotalEmissions",
                            "scope3StatedTotalVerified",
                          ])
                        }
                        ariaLabel="Undo Scope 3 stated total"
                      />
                    </div>
                  );
                })}
              </EmissionsEditRow>

              {scope3CategoryIds.map((category) => (
                <EmissionsEditRow
                  key={category}
                  name={
                    <span className="ps-2 leading-snug">
                      {scope3CategoryRowLabel(category, t)}
                    </span>
                  }
                >
                  {visibleColumns.map(({ rp, year }) => {
                    const rpEdits = edited[rp.id] ?? {};
                    const originalCat = rp.emissions?.scope3?.categories?.find(
                      (c) => c.category === category
                    );
                    const originalVal = originalCat?.total ?? null;
                    const originalVerified = !!originalCat?.metadata?.verifiedBy;

                    const editedVal = rpEdits.scope3Categories?.[String(category)];
                    const value = editedVal ?? (originalVal != null ? String(originalVal) : "");
                    const dirty = editedVal != null;

                    const hasEditedVerified =
                      rpEdits.scope3CategoriesVerified != null &&
                      Object.prototype.hasOwnProperty.call(
                        rpEdits.scope3CategoriesVerified,
                        String(category)
                      );
                    const editedVerified = rpEdits.scope3CategoriesVerified?.[String(category)];
                    const verified = hasEditedVerified ? !!editedVerified : originalVerified;

                    const undoDisabled = !(dirty || hasEditedVerified);

                    return (
                      <div key={rp.id} className={emissionsFieldCellClass}>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) =>
                            setScope3CategoryValue(
                              rp.id,
                              category,
                              e.target.value,
                              originalVal != null
                            )
                          }
                          className={
                            numInputClass +
                            " placeholder:text-gray-02/70" +
                            (dirty ? " border-orange-03" : "")
                          }
                          step="any"
                        />
                        <MetadataDetailsDialog
                          fieldLabel={`${scope3CategoryRowLabel(category, t)} (${year || ""})`}
                          metadata={originalCat?.metadata as any}
                        />
                        <VerifyButton
                          checked={verified}
                          onClick={() =>
                            setScope3CategoryVerified(rp.id, category, !verified)
                          }
                          ariaLabel={t("editor.fieldEdit.markVerified")}
                        />
                        <UndoFieldButton
                          disabled={undoDisabled}
                          onClick={() => {
                            setEdited((prev) => {
                              const current = prev[rp.id];
                              if (!current) return prev;
                              const nextForRp: EditedPeriodEmissions = { ...current };
                              if (nextForRp.scope3Categories) {
                                const nextCats = { ...nextForRp.scope3Categories };
                                delete nextCats[String(category)];
                                nextForRp.scope3Categories =
                                  Object.keys(nextCats).length ? nextCats : undefined;
                              }
                              if (nextForRp.scope3CategoriesVerified) {
                                const nextV = { ...nextForRp.scope3CategoriesVerified };
                                delete nextV[String(category)];
                                nextForRp.scope3CategoriesVerified =
                                  Object.keys(nextV).length ? nextV : undefined;
                              }
                              const hasAny = Object.keys(nextForRp).length > 0;
                              if (!hasAny) {
                                const next = { ...prev };
                                delete next[rp.id];
                                return next;
                              }
                              return { ...prev, [rp.id]: nextForRp };
                            });
                          }}
                          ariaLabel={`Undo ${scope3CategoryRowLabel(category, t)}`}
                        />
                      </div>
                    );
                  })}
                </EmissionsEditRow>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-02 mt-3">
          {t("editor.singleCompanyView.noReportingPeriods")}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          disabled={saving}
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("editor.fieldEdit.save")}
        </Button>
      </div>

      <ReviewerMetadataDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        saving={saving}
        title="Reviewer details"
        confirmLabel={t("editor.fieldEdit.save")}
        initialComment={comment}
        initialSource={source}
        onConfirm={(m) => {
          setComment(m.comment);
          setSource(m.source);
          return handleSave(m);
        }}
      />
    </section>
  );
}

