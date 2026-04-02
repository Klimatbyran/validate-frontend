import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, BadgeCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import type { GarboCompanyDetail } from "../lib/types";
import { updateReportingPeriods } from "../lib/companies-api";
import { inputClassName } from "../lib/company-edit-utils";
import { MetadataDetailsDialog } from "./MetadataDetailsDialog";
import { ReviewerMetadataDialog } from "./ReviewerMetadataDialog";

type EditedPeriodEconomy = {
  turnoverValue?: string;
  turnoverVerified?: boolean;
  turnoverCurrency?: string;
  employeesValue?: string;
  employeesVerified?: boolean;
  employeesUnit?: string;
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

function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

export function EconomyDataTab({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();

  const periods = useMemo(
    () => (company.reportingPeriods ?? []).filter((rp) => rp.startDate && rp.endDate),
    [company.reportingPeriods]
  );

  const [edited, setEdited] = useState<Record<string, EditedPeriodEconomy>>({});
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

  const setEditedField = (rpId: string, patch: Partial<EditedPeriodEconomy>) => {
    setEdited((prev) => ({
      ...prev,
      [rpId]: { ...(prev[rpId] ?? {}), ...patch },
    }));
  };

  const resetPeriod = (rpId: string) => {
    setEdited((prev) => {
      const next = { ...prev };
      delete next[rpId];
      return next;
    });
  };

  const handleSave = async (meta?: { comment?: string; source?: string }) => {
    const payloadPeriods = visiblePeriods
      .map((rp) => {
        const rpEdits = edited[rp.id];
        if (!rpEdits) return null;

        const turnoverValue =
          rpEdits.turnoverValue != null
            ? toNumberOrNull(rpEdits.turnoverValue)
            : null;
        const employeesValue =
          rpEdits.employeesValue != null
            ? toNumberOrNull(rpEdits.employeesValue)
            : null;

        const hasTurnover =
          rpEdits.turnoverValue != null ||
          rpEdits.turnoverVerified != null ||
          rpEdits.turnoverCurrency != null;
        const hasEmployees =
          rpEdits.employeesValue != null ||
          rpEdits.employeesVerified != null ||
          rpEdits.employeesUnit != null;

        if (!hasTurnover && !hasEmployees) return null;

        const economy: Record<string, unknown> = {};
        if (hasTurnover) {
          economy.turnover = {
            value: rpEdits.turnoverValue != null ? turnoverValue : undefined,
            currency:
              (rpEdits.turnoverCurrency ?? rp.economy?.turnover?.currency ?? "SEK") || undefined,
            verified: rpEdits.turnoverVerified ?? undefined,
          };
        }
        if (hasEmployees) {
          economy.employees = {
            value: rpEdits.employeesValue != null ? employeesValue : undefined,
            unit: (rpEdits.employeesUnit ?? rp.economy?.employees?.unit ?? "FTE") || undefined,
            verified: rpEdits.employeesVerified ?? undefined,
          };
        }

        return {
          startDate: rp.startDate,
          endDate: rp.endDate,
          economy: Object.keys(economy).length ? economy : undefined,
        };
      })
      .filter(Boolean) as Array<{
      startDate: string;
      endDate: string;
      economy?: Record<string, unknown>;
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

  return (
    <section className="rounded-lg bg-gray-05 p-4 w-full min-w-0 max-w-full">
      <div className="border-b border-gray-03/60 pb-6 mb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-01 tracking-tight">
              {t("editor.singleCompanyView.tabs.economyData")}
            </h2>
            <p className="text-xs text-gray-02 mt-2 leading-relaxed">
              {t("editor.singleCompanyView.economyDataHint")}
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
        <div className="w-full min-w-0">
            <p className="text-[11px] font-semibold text-gray-02 uppercase tracking-wider px-2 mb-3">
              {t("editor.singleCompanyView.sections.reportingPeriods")}
            </p>

            <div className="space-y-3 w-full min-w-0">
              {visiblePeriods.map((rp) => {
                const rpEdits = edited[rp.id] ?? {};
                const originalTurnover = rp.economy?.turnover?.value ?? null;
                const originalEmployees = rp.economy?.employees?.value ?? null;
                const originalTurnoverVerified = !!rp.economy?.turnover?.metadata?.verifiedBy;
                const originalEmployeesVerified = !!rp.economy?.employees?.metadata?.verifiedBy;
                const originalTurnoverCurrency = rp.economy?.turnover?.currency ?? null;
                const originalEmployeesUnit = rp.economy?.employees?.unit ?? null;
                const turnoverValue =
                  rpEdits.turnoverValue ?? (originalTurnover != null ? String(originalTurnover) : "");
                const employeesValue =
                  rpEdits.employeesValue ?? (originalEmployees != null ? String(originalEmployees) : "");
                const turnoverCurrency =
                  rpEdits.turnoverCurrency ??
                  (originalTurnoverCurrency != null ? String(originalTurnoverCurrency) : "SEK");
                const employeesUnit =
                  rpEdits.employeesUnit ??
                  (originalEmployeesUnit != null ? String(originalEmployeesUnit) : "FTE");
                const employeesUnitOptions = [
                  "FTE",
                  "EOY",
                  "AVG",
                  ...(employeesUnit && !["FTE", "EOY", "AVG"].includes(employeesUnit) ? [employeesUnit] : []),
                ];

                const turnoverDirty = rpEdits.turnoverValue != null;
                const employeesDirty = rpEdits.employeesValue != null;
                const turnoverCurrencyDirty = rpEdits.turnoverCurrency != null;
                const employeesUnitDirty = rpEdits.employeesUnit != null;
                const periodYear = getPeriodYear(rp) ?? "—";
                const periodDateRange = `${formatDateStamp(rp.startDate)} – ${formatDateStamp(rp.endDate)}`;
                const reportUrlForOpen = (rp.reportURL ?? "").trim();

                const turnoverVerified =
                  rpEdits.turnoverVerified ?? originalTurnoverVerified;
                const employeesVerified =
                  rpEdits.employeesVerified ?? originalEmployeesVerified;

                return (
                  <div
                    key={rp.id}
                    className="rounded-lg bg-gray-04 p-3 w-full min-w-0 max-w-full"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
                      <div>
                        <div className="text-sm font-semibold text-gray-01">{periodYear}</div>
                        <div className="text-xs text-gray-02 mt-0.5">{periodDateRange}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => resetPeriod(rp.id)}
                          disabled={!edited[rp.id]}
                          className="min-w-0 max-w-none px-3 text-xs h-8"
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                          Reset
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-01">
                          {t("editor.companies.reportUrl")}
                        </span>
                        {reportUrlForOpen ? (
                          <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="min-w-0 max-w-none shrink-0 px-3 text-xs h-8"
                          >
                            <a
                              href={reportUrlForOpen}
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
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 w-full min-w-0">
                      <div className="w-full min-w-0 lg:min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <label className="block text-xs font-medium text-gray-01">
                            Turnover
                          </label>
                          <MetadataDetailsDialog
                            fieldLabel="Turnover"
                            metadata={rp.economy?.turnover?.metadata as any}
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center">
                          <input
                            type="number"
                            value={turnoverValue}
                            onChange={(e) => setEditedField(rp.id, { turnoverValue: e.target.value })}
                            className={
                              inputClassName +
                              " bg-gray-04 w-full min-w-0 !max-w-none sm:flex-1 sm:min-w-[10rem] " +
                              " placeholder:text-gray-02/70" +
                              (turnoverDirty ? " border-orange-03" : "")
                            }
                            step="any"
                          />
                          <div className="flex items-center gap-2 w-full min-w-0 sm:w-auto sm:shrink-0">
                            <input
                              type="text"
                              value={turnoverCurrency}
                              onChange={(e) =>
                                setEditedField(rp.id, { turnoverCurrency: e.target.value.toUpperCase() })
                              }
                              className={
                                inputClassName +
                                " bg-gray-04 w-full text-center sm:w-20 !max-w-none " +
                                " placeholder:text-gray-02/70" +
                                (turnoverCurrencyDirty ? " border-orange-03" : "")
                              }
                              placeholder="SEK"
                              aria-label="Turnover currency"
                              title="Currency"
                            />
                            <button
                              type="button"
                              className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-03/40"
                              onClick={() =>
                                setEditedField(rp.id, { turnoverVerified: !turnoverVerified })
                              }
                              aria-label={t("editor.fieldEdit.markVerified")}
                              title={t("editor.fieldEdit.markVerified")}
                            >
                              <BadgeCheck
                                className={
                                  "w-5 h-5 " + (turnoverVerified ? "text-green-03" : "text-gray-02")
                                }
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="w-full min-w-0 lg:min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <label className="block text-xs font-medium text-gray-01">
                            Employees
                          </label>
                          <MetadataDetailsDialog
                            fieldLabel="Employees"
                            metadata={rp.economy?.employees?.metadata as any}
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center">
                          <input
                            type="number"
                            value={employeesValue}
                            onChange={(e) => setEditedField(rp.id, { employeesValue: e.target.value })}
                            className={
                              inputClassName +
                              " bg-gray-04 w-full min-w-0 !max-w-none sm:flex-1 sm:min-w-[10rem] " +
                              " placeholder:text-gray-02/70" +
                              (employeesDirty ? " border-orange-03" : "")
                            }
                            step="any"
                          />
                          <div className="flex items-center gap-2 w-full min-w-0 sm:w-auto sm:shrink-0 sm:min-w-0">
                            <SingleSelectDropdown
                              options={employeesUnitOptions}
                              value={employeesUnit}
                              onChange={(v) => setEditedField(rp.id, { employeesUnit: v })}
                              placeholder="Unit"
                              ariaLabel="Employees unit"
                              getOptionLabel={(v) => {
                                if (v === "FTE") return "FTE (full-time equivalent)";
                                if (v === "EOY") return "EOY (end of year)";
                                if (v === "AVG") return "AVG (average)";
                                return v;
                              }}
                              triggerClassName={
                                "w-full min-w-0 justify-between sm:w-48 " +
                                (employeesUnitDirty ? "border-orange-03" : "")
                              }
                              panelMinWidth={200}
                            />
                            <button
                              type="button"
                              className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-03/40"
                              onClick={() =>
                                setEditedField(rp.id, { employeesVerified: !employeesVerified })
                              }
                              aria-label={t("editor.fieldEdit.markVerified")}
                              title={t("editor.fieldEdit.markVerified")}
                            >
                              <BadgeCheck
                                className={
                                  "w-5 h-5 " + (employeesVerified ? "text-green-03" : "text-gray-02")
                                }
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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

