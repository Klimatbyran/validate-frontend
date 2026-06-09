import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { IconActionButton } from "@/ui/icon-action-button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import type {
  GarboCompanyDetail,
  GarboFieldMetadata,
  GarboReportingPeriodSummary,
} from "../../lib/types";
import { updateReportingPeriods } from "../../lib/companies-api";
import {
  dataYearsWithMultiplePeriods,
  editorDenseMultiSelectTriggerClass,
  editorDenseToolbarClass,
  formatPeriodDateRange,
  getPeriodDataYear,
  getPeriodYear,
  isReportingPeriodWithIdAndDates,
} from "../../lib/reporting-period-ui";
import { publicPeriodIdsForCompany } from "../../lib/reporting-period-public-read";
import { useReportingPeriodColumnFilters } from "../../hooks/useReportingPeriodColumnFilters";
import { useCompanyReportShellFilters } from "../../hooks/useCompanyReportShellFilters";
import { CompanyReportShellFilterControls } from "./CompanyReportShellFilterControls";
import { useReviewerMetadataSave } from "../../hooks/useReviewerMetadataSave";
import { ReviewerMetadataDialog } from "../ReviewerMetadataDialog";
import { buildEmissionsPeriodPatch, type EditedPeriodEmissions } from "../../lib/emissions-edit";
import { editorPrimaryActionButtonClass } from "../../lib/editor-button-classes";
import { ReportingPeriodCompanyReportInfo } from "./ReportingPeriodCompanyReportInfo";
import { reportHrefLinkPillClassName } from "@/lib/report-url-link-pill";
import {
  applyNullableStringEdit,
  applyScope3CategoryValueEdit,
  applyScope3CategoryVerifiedEdit,
  applyScope3CategoryClear,
} from "../../lib/emissions-edit-state";
import {
  EmissionsEditRow,
  emissionsFieldCellClass,
  emissionsPeriodHeaderCellClass,
} from "./emissions/EmissionsGridParts";
import { EmissionsNumberCell } from "./emissions/EmissionsNumberCell";
import { Scope2Section } from "./emissions/Scope2Section";
import { Scope3Section } from "./emissions/Scope3Section";

export function EmissionsDataTab({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const scope1And2Display = t("editor.companies.scope1And2");
  const dash = t("common.placeholderDash");

  const periods = useMemo(
    () =>
      (company.reportingPeriods ?? []).filter(isReportingPeriodWithIdAndDates),
    [company.reportingPeriods]
  );

  const [edited, setEdited] = useState<Record<string, EditedPeriodEmissions>>({});
  const [saving, setSaving] = useState(false);

  const {
    shells,
    showAllReports,
    setShowAllReports,
    selectedShellKeys,
    setSelectedShellKeys,
    filterPeriodsByShell,
  } = useCompanyReportShellFilters(periods, company.wikidataId, {
    defaultToLatestShell: true,
  });

  const periodsForShellFilter = useMemo(
    () => filterPeriodsByShell(periods),
    [periods, filterPeriodsByShell],
  );

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
    periodsForShellFilter,
    company.wikidataId,
  );

  useEffect(() => {
    setEdited({});
    setSaving(false);
  }, [company.wikidataId]);

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
    setEdited((prev) => applyNullableStringEdit(prev, rpId, key, value, hadOriginalValue));
  };

  const setScope3CategoryValue = (
    rpId: string,
    category: number,
    value: string,
    hadOriginalValue: boolean
  ) => {
    setEdited((prev) => applyScope3CategoryValueEdit(prev, rpId, category, value, hadOriginalValue));
  };

  const setScope3CategoryVerified = (rpId: string, category: number, verified: boolean) => {
    setEdited((prev) => applyScope3CategoryVerifiedEdit(prev, rpId, category, verified));
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
      const nextRecord: Record<string, unknown> = { ...current };
      keys.forEach((k) => {
        delete nextRecord[String(k)];
      });
      const nextForRp = nextRecord as EditedPeriodEmissions;
      const hasAny = Object.keys(nextForRp).length > 0;
      return hasAny
        ? { ...prev, [rpId]: nextForRp }
        : (() => {
            const next = { ...prev };
            delete next[rpId];
            return next;
          })();
    });
  };

  const duplicateDataYears = useMemo(
    () => dataYearsWithMultiplePeriods(periods),
    [periods],
  );

  const publicPeriodIds = useMemo(
    () => publicPeriodIdsForCompany(periods),
    [periods],
  );

  const visibleColumns = useMemo(() => {
    return visiblePeriods.map((rp) => {
      const dateRangeLabel = formatPeriodDateRange(rp.startDate, rp.endDate, dash);
      const year = getPeriodYear(rp);
      const dataYear = getPeriodDataYear(rp) ?? "";
      return {
        rp,
        dateRangeLabel,
        year: year ?? "",
        isDuplicateDataYear: duplicateDataYears.includes(dataYear),
        isPublicApiPeriod: publicPeriodIds.has(rp.id),
      };
    });
  }, [dash, duplicateDataYears, publicPeriodIds, visiblePeriods]);

  const scope3CategoryIds = useMemo(() => {
    const set = new Set<number>();
    visiblePeriods.forEach((rp) => {
      rp.emissions?.scope3?.categories?.forEach((c) => {
        if (typeof c.category === "number") set.add(c.category);
      });
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [visiblePeriods]);

  const handleSave = async (meta?: { comment?: string; source?: string }) => {
    const payloadPeriods = visiblePeriods
      .map((rp) => {
        const rpEdits = edited[rp.id];
        if (!rpEdits) return null;
        return buildEmissionsPeriodPatch(rp, rpEdits);
      })
      .filter(Boolean) as Array<{
      startDate: string;
      endDate: string;
      emissions?: Record<string, unknown>;
    }>;

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

  const reviewerSave = useReviewerMetadataSave({
    onSave: (m) => handleSave(m),
    onSaved,
    reset: () => setEdited({}),
  });

  const numInputClass =
    "px-3 py-2 rounded-lg border border-gray-03 bg-gray-04 text-gray-01 " +
    "placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03 " +
    "w-[140px] max-w-[150px] shrink-0 text-right tabular-nums";

  type NumberRowSpec = {
    /** Left-hand row label. */
    rowName: string;
    /** Which edited key holds the numeric value (nullable-string edit). */
    valueKey:
      | "statedTotalEmissions"
      | "scope1Total"
      | "scope1And2Total";
    /** Which edited key holds the verified toggle for this value. */
    verifiedKey:
      | "statedTotalVerified"
      | "scope1Verified"
      | "scope1And2Verified";
    getOriginalTotal: (rp: GarboReportingPeriodSummary) => number | null;
    getOriginalMeta: (rp: GarboReportingPeriodSummary) => GarboFieldMetadata | null;
    fieldLabel: (year: string) => string;
    undoTitle: string;
  };

  const numberRowSpecs: NumberRowSpec[] = useMemo(() => {
    const overall = t("editor.periodEditor.overallStatedTotal");
    const scope1 = t("editor.companies.scope1");
    return [
      {
        rowName: overall,
        valueKey: "statedTotalEmissions",
        verifiedKey: "statedTotalVerified",
        getOriginalTotal: (rp) => rp.emissions?.statedTotalEmissions?.total ?? null,
        getOriginalMeta: (rp) =>
          (rp.emissions?.statedTotalEmissions?.metadata as GarboFieldMetadata | null) ?? null,
        fieldLabel: (year) => `${overall} (${year})`,
        undoTitle: t("editor.periodEditor.undoField", { field: overall }),
      },
      {
        rowName: scope1,
        valueKey: "scope1Total",
        verifiedKey: "scope1Verified",
        getOriginalTotal: (rp) => rp.emissions?.scope1?.total ?? null,
        getOriginalMeta: (rp) =>
          (rp.emissions?.scope1?.metadata as GarboFieldMetadata | null) ?? null,
        fieldLabel: (year) => `${scope1} (${year})`,
        undoTitle: t("editor.periodEditor.undoField", { field: scope1 }),
      },
      {
        rowName: scope1And2Display,
        valueKey: "scope1And2Total",
        verifiedKey: "scope1And2Verified",
        getOriginalTotal: (rp) => rp.emissions?.scope1And2?.total ?? null,
        getOriginalMeta: (rp) =>
          (rp.emissions?.scope1And2?.metadata as GarboFieldMetadata | null) ?? null,
        fieldLabel: (year) => `${scope1And2Display} (${year})`,
        undoTitle: t("editor.periodEditor.undoField", { field: scope1And2Display }),
      },
    ];
  }, [scope1And2Display, t]);

  return (
    <section className="rounded-lg bg-gray-05 p-4 min-w-0 max-w-full">
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
              className={editorDenseToolbarClass}
            >
              {sortOrder === "desc"
                ? t("editor.periodEditor.sortNewestFirst")
                : t("editor.periodEditor.sortOldestFirst")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetAll}
              disabled={Object.keys(edited).length === 0}
              className={editorDenseToolbarClass}
              title={t("editor.periodEditor.resetAllChangesTitle")}
            >
              <Undo2 className="w-3.5 h-3.5 mr-1.5" />
              {t("editor.periodEditor.resetAll")}
            </Button>
            <CompanyReportShellFilterControls
              shells={shells}
              showAllReports={showAllReports}
              onShowAllReportsChange={setShowAllReports}
              selectedShellKeys={selectedShellKeys}
              onSelectedShellKeysChange={setSelectedShellKeys}
            />
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

      {duplicateDataYears.length > 0 ? (
        <div className="mb-4 rounded-md border border-orange-03/40 bg-orange-05/10 px-3 py-2 text-xs text-gray-01">
          {t("editor.singleCompanyView.multiplePeriodsSameDataYear", {
            years: duplicateDataYears.join(", "),
          })}
        </div>
      ) : null}

      {visiblePeriods.length ? (
        <div className="w-full min-w-0 overflow-x-auto overflow-y-visible">
          <div className="min-w-max pb-2">
            <p className="text-[11px] font-semibold text-gray-02 mb-3 px-2 uppercase tracking-wider">
              {t("editor.singleCompanyView.sections.reportingPeriods")}
            </p>

            <div className="mb-8">
              <EmissionsEditRow name={t("editor.periodEditor.reportingPeriodHeader")} headerName noHover>
                {visibleColumns.map(({ rp, dateRangeLabel, year, isDuplicateDataYear, isPublicApiPeriod }) => (
                  <div
                    key={rp.id}
                    className={`${emissionsPeriodHeaderCellClass} ${isPublicApiPeriod ? "border-l-2 border-l-green-03/70" : ""}`}
                  >
                    <div className="text-right min-w-0 flex-1">
                      {year ? (
                        <>
                          <div className="text-sm font-semibold text-gray-01">{year}</div>
                          <div className="text-[11px] text-gray-02 mt-0.5 leading-tight break-words">
                            {dateRangeLabel}
                          </div>
                          <ReportingPeriodCompanyReportInfo
                            period={rp}
                            compact
                            reportYearLabel={t(
                              "editor.singleCompanyView.pdfCatalogYearShort",
                            )}
                            companyReportIdLabel={t(
                              "editor.singleCompanyView.companyReportIdShort",
                            )}
                            noReportYearLabel={t(
                              "editor.singleCompanyView.noReportYear",
                            )}
                          />
                          {isPublicApiPeriod ? (
                            <p
                              className="mt-1.5 text-[10px] font-medium text-green-03/90 uppercase tracking-wide"
                              title={t("editor.singleCompanyView.publicApiPeriodHint")}
                            >
                              {t("editor.singleCompanyView.publicApiPeriodBadge")}
                            </p>
                          ) : null}
                          {isDuplicateDataYear ? (
                            <p className="mt-1.5 text-[11px] text-orange-03/90 leading-tight">
                              {t("editor.singleCompanyView.sameDataYearAsAnotherPeriod")}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-gray-01">{dateRangeLabel}</div>
                      )}
                    </div>
                    <IconActionButton
                      onClick={() => resetPeriod(rp.id)}
                      disabled={!edited[rp.id]}
                      title={t("editor.periodEditor.resetThisYearTitle")}
                      aria-label={t("editor.periodEditor.resetThisYearTitle")}
                    >
                      <Undo2 className="text-gray-02" />
                    </IconActionButton>
                  </div>
                ))}
              </EmissionsEditRow>

              <EmissionsEditRow name={t("editor.companies.reportUrl")}>
                {visibleColumns.map(({ rp }) => {
                  const reportUrl = (rp.reportURL ?? "").trim();
                  const s3Url = (rp.s3Url ?? "").trim();

                  // Editor context: only two URLs matter.
                  // - Source URL: `reportURL` (public/original)
                  // - S3 URL: `reportS3Url` (normalized to `s3Url`)
                  const links: Array<{ label: string; href: string }> = [
                    ...(reportUrl
                      ? [{ label: t("registry.sourceUrl"), href: reportUrl }]
                      : []),
                    ...(s3Url ? [{ label: t("registry.s3Url"), href: s3Url }] : []),
                  ];
                  return (
                    <div
                      key={rp.id}
                      className={
                        emissionsFieldCellClass + " justify-center sm:justify-start"
                      }
                    >
                      {links.length ? (
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          {links.map((l) => (
                            <a
                              key={`${rp.id}-${l.label}-${l.href}`}
                              href={l.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={reportHrefLinkPillClassName}
                              title={l.href}
                              aria-label={`${l.label}: ${l.href}`}
                            >
                              <span className="font-medium whitespace-nowrap">{l.label}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ))}
                        </div>
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
              {numberRowSpecs.map((spec) => (
                <EmissionsEditRow key={spec.valueKey} name={spec.rowName} headerName>
                  {visibleColumns.map(({ rp, year }) => {
                    const rpEdits = edited[rp.id] ?? {};
                    const original = spec.getOriginalTotal(rp);
                    const originalMeta = spec.getOriginalMeta(rp);
                    const originalVerified = !!originalMeta?.verifiedBy;
                    const value = (rpEdits[spec.valueKey] ?? (original != null ? String(original) : "")) as string;
                    const dirty = rpEdits[spec.valueKey] != null;
                    const dirtyVerified = rpEdits[spec.verifiedKey] != null;
                    const verified = (rpEdits[spec.verifiedKey] ?? originalVerified) as boolean;
                    const undoDisabled = !(dirty || dirtyVerified);
                    const yearLabel = year || "";
                    return (
                      <div key={rp.id} className={emissionsFieldCellClass}>
                        <EmissionsNumberCell
                          value={value}
                          dirty={dirty}
                          onChange={(next) =>
                            setNullableStringEdit(
                              rp.id,
                              spec.valueKey,
                              next,
                              original != null
                            )
                          }
                          metadata={originalMeta}
                          fieldLabel={spec.fieldLabel(yearLabel)}
                          verified={verified}
                          onToggleVerified={() =>
                            setEditedField(rp.id, { [spec.verifiedKey]: !verified })
                          }
                          onUndo={() =>
                            clearEditedKeys(rp.id, [spec.valueKey, spec.verifiedKey])
                          }
                          undoDisabled={undoDisabled}
                          verifyTitle={t("editor.fieldEdit.markVerified")}
                          verifyAriaLabel={t("editor.fieldEdit.markVerified")}
                          undoTitle={spec.undoTitle}
                          undoAriaLabel={spec.undoTitle}
                          inputClassName={numInputClass}
                        />
                      </div>
                    );
                  })}
                </EmissionsEditRow>
              ))}

              <Scope2Section
                visibleColumns={visibleColumns}
                edited={edited}
                setNullableStringEdit={setNullableStringEdit}
                setEditedField={setEditedField}
                clearEditedKeys={clearEditedKeys}
                numInputClass={numInputClass}
              />

              <Scope3Section
                visibleColumns={visibleColumns}
                edited={edited}
                scope3CategoryIds={scope3CategoryIds}
                setNullableStringEdit={setNullableStringEdit}
                setEditedField={setEditedField}
                clearEditedKeys={clearEditedKeys}
                setScope3CategoryValue={setScope3CategoryValue}
                setScope3CategoryVerified={setScope3CategoryVerified}
                clearScope3Category={(rpId, category) =>
                  setEdited((prev) => applyScope3CategoryClear(prev, rpId, category))
                }
                numInputClass={numInputClass}
              />
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
          onClick={reviewerSave.requestSave}
          disabled={saving}
          className={editorPrimaryActionButtonClass}
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("editor.fieldEdit.save")}
        </Button>
      </div>

      <ReviewerMetadataDialog
        open={reviewerSave.dialogOpen}
        onOpenChange={reviewerSave.setDialogOpen}
        saving={saving}
        confirmLabel={t("editor.fieldEdit.save")}
        initialComment={reviewerSave.comment}
        initialSource={reviewerSave.source}
        onConfirm={(m) => reviewerSave.confirmSave(m)}
      />
    </section>
  );
}

