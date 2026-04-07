import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, BadgeCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { IconActionButton } from "@/ui/icon-action-button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import type {
  GarboCompanyDetail,
  GarboFieldMetadata,
  GarboReportingPeriodSummary,
} from "../../lib/types";
import { updateReportingPeriods } from "../../lib/companies-api";
import { inputClassName } from "../../lib/company-edit-utils";
import {
  editorDenseMultiSelectTriggerClass,
  editorDenseToolbarClass,
  formatPeriodDateRange,
  getPeriodYear,
  isReportingPeriodWithIdAndDates,
  toNumberOrNull,
} from "../../lib/reporting-period-ui";
import { useReportingPeriodColumnFilters } from "../../hooks/useReportingPeriodColumnFilters";
import { ReviewerMetadataDialog } from "../ReviewerMetadataDialog";
import { FieldWithMetadata } from "../FieldWithMetadata";

type EditedPeriodEconomy = {
  turnoverValue?: string;
  turnoverVerified?: boolean;
  turnoverCurrency?: string;
  employeesValue?: string;
  employeesVerified?: boolean;
  employeesUnit?: string;
};

function employeesUnitOptionsFor(current: string | null | undefined): string[] {
  const base = ["FTE", "EOY", "AVG"];
  if (!current || base.includes(current)) return base;
  return [...base, current];
}

function buildEconomyPeriodPatch(
  rp: GarboReportingPeriodSummary,
  rpEdits: EditedPeriodEconomy
): { startDate: string; endDate: string; economy?: Record<string, unknown> } | null {
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
      value: rpEdits.turnoverValue != null ? toNumberOrNull(rpEdits.turnoverValue) : undefined,
      currency: (rpEdits.turnoverCurrency ?? rp.economy?.turnover?.currency ?? "SEK") || undefined,
      verified: rpEdits.turnoverVerified ?? undefined,
    };
  }
  if (hasEmployees) {
    economy.employees = {
      value: rpEdits.employeesValue != null ? toNumberOrNull(rpEdits.employeesValue) : undefined,
      unit: (rpEdits.employeesUnit ?? rp.economy?.employees?.unit ?? "FTE") || undefined,
      verified: rpEdits.employeesVerified ?? undefined,
    };
  }

  return {
    startDate: rp.startDate,
    endDate: rp.endDate,
    economy: Object.keys(economy).length ? economy : undefined,
  };
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
    () =>
      (company.reportingPeriods ?? []).filter(isReportingPeriodWithIdAndDates),
    [company.reportingPeriods]
  );

  const [edited, setEdited] = useState<Record<string, EditedPeriodEconomy>>({});
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const {
    showAllYears,
    setShowAllYears,
    selectedYears,
    setSelectedYears,
    sortOrder,
    setSortOrder,
    years,
    visiblePeriods,
  } = useReportingPeriodColumnFilters<GarboReportingPeriodSummary & { id: string }>(
    periods,
    company.wikidataId
  );

  useEffect(() => {
    setEdited({});
    setComment("");
    setSource("");
    setSaving(false);
    setSaveDialogOpen(false);
  }, [company.wikidataId]);

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
        return buildEconomyPeriodPatch(rp, rpEdits);
      })
      .filter(Boolean) as Array<{ startDate: string; endDate: string; economy?: Record<string, unknown> }>;

    if (!payloadPeriods.length) {
      toast.message(t("editor.periodEditor.nothingToSave"));
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
      toast.success(t("editor.periodEditor.reportingDataSaved"));
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
              className={editorDenseToolbarClass}
            >
              {sortOrder === "desc"
                ? t("editor.periodEditor.sortNewestFirst")
                : t("editor.periodEditor.sortOldestFirst")}
            </Button>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-01">
              <input
                type="checkbox"
                checked={showAllYears}
                onChange={(e) => setShowAllYears(e.target.checked)}
                className="rounded border-gray-03"
              />
              {t("editor.periodEditor.showAllYears")}
            </label>
            {years.length > 0 && (
              <MultiSelectDropdown
                options={years}
                selectedIds={showAllYears ? [] : selectedYears}
                onChange={(ids) => {
                  setSelectedYears(ids);
                  if (ids.length > 0) setShowAllYears(false);
                }}
                triggerLabel={t("editor.periodEditor.yearsTrigger")}
                emptyLabel={t("editor.companies.allYears")}
                triggerClassName={editorDenseMultiSelectTriggerClass}
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
                const employeesUnitOptions = employeesUnitOptionsFor(employeesUnit);

                const turnoverDirty = rpEdits.turnoverValue != null;
                const employeesDirty = rpEdits.employeesValue != null;
                const turnoverCurrencyDirty = rpEdits.turnoverCurrency != null;
                const employeesUnitDirty = rpEdits.employeesUnit != null;
                const periodYear = getPeriodYear(rp) ?? t("common.placeholderDash");
                const periodDateRange = formatPeriodDateRange(
                  rp.startDate,
                  rp.endDate,
                  t("common.placeholderDash")
                );
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
                          className={editorDenseToolbarClass}
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                          {t("editor.periodEditor.reset")}
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
                            className={editorDenseToolbarClass + " shrink-0"}
                          >
                            <a
                              href={reportUrlForOpen}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              {t("editor.periodEditor.openReport")}
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-02">—</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 w-full min-w-0">
                      <FieldWithMetadata
                        label={t("editor.periodEditor.turnover")}
                        fieldLabel={t("editor.periodEditor.turnover")}
                        metadata={rp.economy?.turnover?.metadata as GarboFieldMetadata | null}
                      >
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
                              placeholder={t("editor.periodEditor.currencyPlaceholder")}
                              aria-label={t("editor.periodEditor.currencyAria")}
                              title={t("editor.periodEditor.currencyTitle")}
                            />
                            <IconActionButton
                              variant="md"
                              onClick={() =>
                                setEditedField(rp.id, { turnoverVerified: !turnoverVerified })
                              }
                              aria-label={t("editor.fieldEdit.markVerified")}
                              title={t("editor.fieldEdit.markVerified")}
                            >
                              <BadgeCheck
                                className={
                                  turnoverVerified ? "text-green-03" : "text-gray-02"
                                }
                              />
                            </IconActionButton>
                          </div>
                        </div>
                      </FieldWithMetadata>

                      <FieldWithMetadata
                        label={t("editor.periodEditor.employees")}
                        fieldLabel={t("editor.periodEditor.employees")}
                        metadata={rp.economy?.employees?.metadata as GarboFieldMetadata | null}
                      >
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
                              placeholder={t("editor.periodEditor.employeesUnitPlaceholder")}
                              ariaLabel={t("editor.periodEditor.employeesUnitAria")}
                              getOptionLabel={(v) => {
                                if (v === "FTE") return t("editor.periodEditor.unitFteLong");
                                if (v === "EOY") return t("editor.periodEditor.unitEoyLong");
                                if (v === "AVG") return t("editor.periodEditor.unitAvgLong");
                                return v;
                              }}
                              triggerClassName={
                                "w-full min-w-0 justify-between sm:w-48 " +
                                (employeesUnitDirty ? "border-orange-03" : "")
                              }
                              panelMinWidth={200}
                            />
                            <IconActionButton
                              variant="md"
                              onClick={() =>
                                setEditedField(rp.id, { employeesVerified: !employeesVerified })
                              }
                              aria-label={t("editor.fieldEdit.markVerified")}
                              title={t("editor.fieldEdit.markVerified")}
                            >
                              <BadgeCheck
                                className={
                                  employeesVerified ? "text-green-03" : "text-gray-02"
                                }
                              />
                            </IconActionButton>
                          </div>
                        </div>
                      </FieldWithMetadata>
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

