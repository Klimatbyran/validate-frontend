import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, BadgeCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import type { GarboCompanyDetail } from "../lib/types";
import { updateReportingPeriods } from "../lib/companies-api";
import { inputClassName } from "../lib/company-edit-utils";
import { MetadataDetailsDialog } from "./MetadataDetailsDialog";

type EditedPeriodEmissions = {
  reportURL?: string;
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

function formatMonthYear(dateLike: string | undefined | null): string | null {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

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
  const [showAllYears, setShowAllYears] = useState(true);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    setEdited({});
    setComment("");
    setSource("");
    setSaving(false);
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
      const headerLabel =
        formatMonthYear(rp.endDate) ??
        formatMonthYear(rp.startDate) ??
        `${rp.startDate} – ${rp.endDate}`;
      const year = getPeriodYear(rp);
      return { rp, headerLabel, year: year ?? "" };
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

  const isSingleYearView = visibleColumns.length <= 1;

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
      className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-03/40"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <BadgeCheck className={"w-5 h-5 " + (checked ? "text-green-03" : "text-gray-02")} />
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
        "shrink-0 h-9 w-9 rounded-full flex items-center justify-center " +
        (disabled ? "opacity-30 cursor-default" : "hover:bg-gray-03/40")
      }
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Undo2 className="w-5 h-5 text-gray-02" />
    </button>
  );

  const handleSave = async () => {
    const payloadPeriods = visiblePeriods
      .map((rp) => {
        const rpEdits = edited[rp.id];
        if (!rpEdits) return null;

        const hasReportUrl = rpEdits.reportURL != null;
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
          !hasReportUrl &&
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
          reportURL: hasReportUrl ? (rpEdits.reportURL || undefined) : undefined,
          emissions: Object.keys(emissions).length ? emissions : undefined,
        };
      })
      .filter(Boolean) as Array<{
      startDate: string;
      endDate: string;
      reportURL?: string;
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
          source.trim() || comment.trim()
            ? { source: source.trim() || undefined, comment: comment.trim() || undefined }
            : undefined,
      });
      toast.success(t("editor.tagOptions.updated"));
      setEdited({});
      setComment("");
      setSource("");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-gray-03 bg-gray-05 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-01">
            {t("editor.singleCompanyView.tabs.emissionsData")}
          </h3>
          <p className="text-xs text-gray-02 mt-1">
            {t("editor.singleCompanyView.reportingPeriodsHint")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
            className="min-w-0 px-3"
          >
            {sortOrder === "desc" ? "Newest → Oldest" : "Oldest → Newest"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={resetAll}
            disabled={Object.keys(edited).length === 0}
            className="min-w-0 px-3"
            title="Reset all changes"
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Reset all
          </Button>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-01">
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
              triggerClassName="min-w-[130px]"
            />
          )}
        </div>
      </div>

      {visiblePeriods.length ? (
        <div className="mt-4 w-full overflow-x-auto overflow-y-visible">
          <div className={isSingleYearView ? "w-full" : "min-w-max"}>
            <div className="text-xs font-medium text-gray-03 uppercase tracking-wide px-2 mb-2">
              {t("editor.singleCompanyView.sections.reportingPeriods")}
            </div>

            <div className="rounded-lg border border-gray-03 bg-gray-04 overflow-hidden">
              <table
                className={
                  (isSingleYearView ? "w-full" : "min-w-max") +
                  " border-separate border-spacing-0 [&_td]:py-2 [&_th]:py-2"
                }
              >
                <thead>
                  <tr className="bg-gray-04/70">
                    <th className="sticky left-0 z-30 bg-gray-04/70 text-left px-3 py-2 border-b border-r border-gray-03 w-[300px]">
                      <div className="text-xs font-semibold text-gray-02">Data point</div>
                    </th>
                    {visibleColumns.map(({ rp, headerLabel, year }) => (
                      <th
                        key={rp.id}
                        className="relative bg-gray-04/70 px-4 py-2 border-b border-gray-03 min-w-[380px] align-bottom"
                      >
                        <div className="flex items-start gap-2 pr-10">
                          <div>
                            <div className="text-sm font-semibold text-gray-01">
                              {year || headerLabel}
                            </div>
                            {!!year && (
                              <div className="text-[11px] text-gray-02 mt-0.5">
                                {headerLabel}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => resetPeriod(rp.id)}
                          disabled={!edited[rp.id]}
                          className={
                            "absolute top-1.5 right-2 h-9 w-9 rounded-full inline-flex items-center justify-center " +
                            (!edited[rp.id] ? "opacity-30 cursor-default" : "hover:bg-gray-03/40")
                          }
                          title="Reset this year"
                          aria-label="Reset this year"
                        >
                          <Undo2 className="w-5 h-5 text-gray-02" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Group: Report */}
                  <tr className="bg-black">
                    <td className="sticky left-0 z-30 bg-black px-3 py-2 border-b border-r border-gray-03">
                      <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide">
                        Report
                      </div>
                    </td>
                    <td className="bg-black px-4 py-2 border-b border-gray-03" colSpan={visibleColumns.length} />
                  </tr>

                  {/* Report URL */}
                  <tr className="odd:bg-gray-04 even:bg-gray-04/60">
                    <td className="sticky left-0 z-30 bg-inherit px-3 py-3 border-b border-r border-gray-03">
                      <div className="text-sm font-medium text-gray-01">
                        {t("editor.companies.reportUrl")}
                      </div>
                    </td>
                    {visibleColumns.map(({ rp }) => {
                      const rpEdits = edited[rp.id] ?? {};
                      const reportUrlDirty = rpEdits.reportURL != null;
                      return (
                        <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={rpEdits.reportURL ?? (rp.reportURL ?? "")}
                              onChange={(e) =>
                                setNullableStringEdit(
                                  rp.id,
                                  "reportURL",
                                  e.target.value,
                                  Boolean((rp.reportURL ?? "").trim())
                                )
                              }
                              className={
                                inputClassName +
                                " w-[280px] max-w-none " +
                                " bg-gray-04 " +
                                " placeholder:text-gray-02/70" +
                                (reportUrlDirty ? " border-orange-03" : "")
                              }
                              placeholder={t("editor.fieldEdit.sourcePlaceholder")}
                            />
                            {rp.reportURL && !reportUrlDirty && (
                              <Button asChild variant="ghost" size="sm" className="min-w-0 px-3">
                                <a
                                  href={rp.reportURL}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Open
                                </a>
                              </Button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Group: Scope 1 */}
                  <tr className="bg-black">
                    <td className="sticky left-0 z-30 bg-black px-3 py-2 border-b border-r border-gray-03">
                      <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide">
                        Scope 1
                      </div>
                    </td>
                    <td className="bg-black px-4 py-2 border-b border-gray-03" colSpan={visibleColumns.length} />
                  </tr>

                  {/* Scope 1 */}
                  <tr className="odd:bg-gray-04 even:bg-gray-04/60">
                    <td className="sticky left-0 z-30 bg-inherit px-3 py-3 border-b border-r border-gray-03">
                      <div className="text-sm font-medium text-gray-01">
                        {t("editor.companies.scope1") ?? "Scope 1"}
                      </div>
                    </td>
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
                        <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                          <div className="flex items-center gap-2">
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
                                inputClassName +
                                " w-[180px] max-w-none " +
                                " bg-gray-04 " +
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
                        </td>
                      );
                    })}
                  </tr>

                  {/* Group: Scope 1+2 */}
                  <tr className="bg-black">
                    <td className="sticky left-0 z-30 bg-black px-3 py-2 border-b border-r border-gray-03">
                      <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide">
                        Scope 1+2
                      </div>
                    </td>
                    <td className="bg-black px-4 py-2 border-b border-gray-03" colSpan={visibleColumns.length} />
                  </tr>

                  {/* Scope 1+2 */}
                  <tr className="odd:bg-gray-04 even:bg-gray-04/60">
                    <td className="sticky left-0 z-30 bg-inherit px-3 py-3 border-b border-r border-gray-03">
                      <div className="text-sm font-medium text-gray-01">
                        {scope1And2Display}
                      </div>
                    </td>
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
                        <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                          <div className="flex items-center gap-2">
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
                                inputClassName +
                                " w-[180px] max-w-none " +
                                " bg-gray-04 " +
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
                        </td>
                      );
                    })}
                  </tr>

                  {/* Group: Scope 2 */}
                  <tr className="bg-black">
                    <td className="sticky left-0 z-30 bg-black px-3 py-2 border-b border-r border-gray-03">
                      <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide">
                        Scope 2
                      </div>
                      <div className="text-[11px] text-gray-02 mt-0.5">
                        Verified as a unit (MB/LB/Unknown).
                      </div>
                    </td>
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
                        <td key={rp.id} className="bg-black px-4 py-2 border-b border-gray-03">
                          <div className="flex w-full items-center justify-end gap-2">
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
                                clearEditedKeys(rp.id, ["scope2Mb", "scope2Lb", "scope2Unknown", "scope2Verified"])
                              }
                              ariaLabel="Undo Scope 2"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Scope 2 (MB) */}
                  <tr className="odd:bg-gray-04 even:bg-gray-04/60">
                    <td className="sticky left-0 z-30 bg-inherit px-3 py-3 border-b border-r border-gray-03">
                      <div className="text-sm font-medium text-gray-01">MB</div>
                    </td>
                    {visibleColumns.map(({ rp }) => {
                      const rpEdits = edited[rp.id] ?? {};
                      const original = rp.emissions?.scope2?.mb ?? null;
                      const value = rpEdits.scope2Mb ?? (original != null ? String(original) : "");
                      const dirty =
                        rpEdits.scope2Mb != null ||
                        rpEdits.scope2Lb != null ||
                        rpEdits.scope2Unknown != null;
                      return (
                        <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={value}
                              onChange={(e) =>
                                setNullableStringEdit(
                                  rp.id,
                                  "scope2Mb",
                                  e.target.value,
                                  original != null
                                )
                              }
                              className={
                                inputClassName +
                                " w-[180px] max-w-none " +
                                " bg-gray-04 " +
                                " placeholder:text-gray-02/70" +
                                (dirty ? " border-orange-03" : "")
                              }
                              step="any"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Scope 2 (LB) */}
                  <tr className="odd:bg-gray-04 even:bg-gray-04/60">
                    <td className="sticky left-0 z-30 bg-inherit px-3 py-3 border-b border-r border-gray-03">
                      <div className="text-sm font-medium text-gray-01">LB</div>
                    </td>
                    {visibleColumns.map(({ rp }) => {
                      const rpEdits = edited[rp.id] ?? {};
                      const original = rp.emissions?.scope2?.lb ?? null;
                      const value = rpEdits.scope2Lb ?? (original != null ? String(original) : "");
                      const dirty =
                        rpEdits.scope2Mb != null ||
                        rpEdits.scope2Lb != null ||
                        rpEdits.scope2Unknown != null;
                      return (
                        <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={value}
                              onChange={(e) =>
                                setNullableStringEdit(
                                  rp.id,
                                  "scope2Lb",
                                  e.target.value,
                                  original != null
                                )
                              }
                              className={
                                inputClassName +
                                " w-[180px] max-w-none " +
                                " bg-gray-04 " +
                                " placeholder:text-gray-02/70" +
                                (dirty ? " border-orange-03" : "")
                              }
                              step="any"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Scope 2 (Unknown) */}
                  <tr className="odd:bg-gray-04 even:bg-gray-04/60">
                    <td className="sticky left-0 z-30 bg-inherit px-3 py-3 border-b border-r border-gray-03">
                      <div className="text-sm font-medium text-gray-01">Unknown</div>
                    </td>
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
                        <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                          <div className="flex items-center gap-2">
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
                                inputClassName +
                                " w-[180px] max-w-none " +
                                " bg-gray-04 " +
                                " placeholder:text-gray-02/70" +
                                (dirty ? " border-orange-03" : "")
                              }
                              step="any"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Group: Scope 3 */}
                  <tr className="bg-black">
                    <td className="sticky left-0 z-30 bg-black px-3 py-2 border-b border-r border-gray-03">
                      <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide">
                        Scope 3
                      </div>
                    </td>
                    <td className="bg-black px-4 py-2 border-b border-gray-03" colSpan={visibleColumns.length} />
                  </tr>

                  {/* Scope 3 stated total */}
                  <tr className="odd:bg-gray-04 even:bg-gray-04/60">
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-3 border-b border-gray-03">
                      <div className="text-sm font-medium text-gray-01">Stated total</div>
                    </td>
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
                        <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                          <div className="flex items-center gap-2">
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
                                inputClassName +
                                " w-[180px] max-w-none " +
                                " bg-gray-04 " +
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
                                clearEditedKeys(rp.id, ["scope3StatedTotalEmissions", "scope3StatedTotalVerified"])
                              }
                              ariaLabel="Undo Scope 3 stated total"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Scope 3 categories */}
                  {scope3CategoryIds.map((category) => (
                    <tr key={category} className="odd:bg-gray-04 even:bg-gray-04/60">
                      <td className="sticky left-0 z-30 bg-inherit px-3 py-3 border-b border-r border-gray-03">
                        <div className="text-sm text-gray-01 pl-3">Category {category}</div>
                      </td>
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
                          <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                            <div className="flex items-center gap-2">
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
                                  inputClassName +
                                  " w-[180px] max-w-none " +
                                  " bg-gray-04 " +
                                  " placeholder:text-gray-02/70" +
                                  (dirty ? " border-orange-03" : "")
                                }
                                step="any"
                              />
                              <MetadataDetailsDialog
                                fieldLabel={`Scope 3 category ${category} (${year || ""})`}
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
                                ariaLabel={`Undo Scope 3 category ${category}`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Group: Totals */}
                  <tr className="bg-black">
                    <td className="sticky left-0 z-30 bg-black px-3 py-2 border-b border-r border-gray-03">
                      <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide">
                        Totals
                      </div>
                    </td>
                    <td className="bg-black px-4 py-2 border-b border-gray-03" colSpan={visibleColumns.length} />
                  </tr>

                  {/* Overall stated total emissions (outside Scope 3) */}
                  <tr className="odd:bg-gray-04 even:bg-gray-04/60">
                    <td className="sticky left-0 z-30 bg-inherit px-3 py-3 border-b border-r border-gray-03">
                      <div className="text-sm font-medium text-gray-01">Overall stated total</div>
                    </td>
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
                        <td key={rp.id} className="px-3 py-3 border-b border-gray-03">
                          <div className="flex items-center gap-2">
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
                                inputClassName +
                                " w-[180px] max-w-none " +
                                " bg-gray-04 " +
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
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-02 mt-3">
          {t("editor.singleCompanyView.noReportingPeriods")}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-01 mb-1">
            {t("editor.fieldEdit.comment")}{" "}
            <span className="text-gray-03 font-normal">({t("common.optional")})</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("editor.fieldEdit.commentPlaceholder")}
            className={
              inputClassName +
              " bg-gray-04 min-h-[90px] resize-y placeholder:text-gray-02/70"
            }
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-01 mb-1">
            {t("editor.fieldEdit.source")}{" "}
            <span className="text-gray-03 font-normal">({t("common.optional")})</span>
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={t("editor.fieldEdit.sourcePlaceholder")}
            className={inputClassName + " bg-gray-04 placeholder:text-gray-02/70"}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("editor.fieldEdit.save")}
        </Button>
      </div>
    </section>
  );
}

