import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { toast } from "sonner";
import { listCompanies, updateCompany, updateReportingPeriods } from "../lib/companies-api";
import { fetchTagOptions } from "../lib/tag-options-api";
import type {
  GarboCompanyListItem,
  TagOption,
  GarboMetadata,
} from "../lib/types";
import { FieldEditModal } from "./FieldEditModal";
import { BulkTagUpdateModal } from "./BulkTagUpdateModal";
import { MultiCompanyFilters } from "./MultiCompanyFilters";
import { MultiCompanySelectionBar } from "./MultiCompanySelectionBar";
import { MultiCompanyTable } from "./MultiCompanyTable";
import type { EditState } from "../lib/types";
import { getPeriodForYear } from "../lib/multi-company-utils";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";

export function MultiCompanyView() {
  const { t } = useI18n();
  const [companies, setCompanies] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [selectedWikidataIds, setSelectedWikidataIds] = useState<Set<string>>(new Set());
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, tags] = await Promise.all([listCompanies(), fetchTagOptions()]);
      setCompanies(list);
      setTagOptions(tags);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const years = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      c.reportingPeriods?.forEach((p) => {
        const y = p.startDate?.slice(0, 4) ?? p.endDate?.slice(0, 4);
        if (y) set.add(y);
      });
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    let list = companies;
    if (selectedTags.length) {
      // API returns company.tags as string[] of slugs; filter shows companies that have any selected tag
      list = list.filter((c) => {
        const companyTagSlugs = Array.isArray(c.tags) ? c.tags : [];
        return selectedTags.some((slug) => companyTagSlugs.includes(slug));
      });
    }
    if (selectedYear) {
      const y = Number(selectedYear);
      list = list.filter((c) => getPeriodForYear(c.reportingPeriods, y));
    }
    return list;
  }, [companies, selectedYear, selectedTags]);

  const toggleCompanySelection = useCallback((wikidataId: string) => {
    setSelectedWikidataIds((prev) => {
      const next = new Set(prev);
      if (next.has(wikidataId)) next.delete(wikidataId);
      else next.add(wikidataId);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedWikidataIds(new Set(filteredCompanies.map((c) => c.wikidataId)));
  }, [filteredCompanies]);

  const clearSelection = useCallback(() => {
    setSelectedWikidataIds(new Set());
  }, []);

  const allFilteredSelected =
    filteredCompanies.length > 0 &&
    filteredCompanies.every((c) => selectedWikidataIds.has(c.wikidataId));

  const handleBulkTagSubmit = useCallback(
    async (tags: string[]) => {
      const ids = Array.from(selectedWikidataIds);
      setActionLoading(true);
      try {
        let success = 0;
        let failed = 0;
        for (const wikidataId of ids) {
          const company = companies.find((c) => c.wikidataId === wikidataId);
          if (!company) {
            failed++;
            continue;
          }
          try {
            await updateCompany(wikidataId, { name: company.name, tags });
            success++;
          } catch {
            failed++;
          }
        }
        if (failed === 0) {
          toast.success(t("editor.companies.bulkUpdateTagsSuccess", { count: ids.length }));
          setCompanies((prev) =>
            prev.map((c) =>
              selectedWikidataIds.has(c.wikidataId) ? { ...c, tags } : c
            )
          );
        } else {
          toast.warning(
            t("editor.companies.bulkUpdateTagsSuccess", { count: success }) +
              (failed > 0 ? `; ${t("editor.companies.bulkUpdateTagsError")}` : "")
          );
        }
        setBulkTagModalOpen(false);
        setSelectedWikidataIds(new Set());
        await loadCompanies();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setActionLoading(false);
      }
    },
    [selectedWikidataIds, companies, t, loadCompanies]
  );

  const handleSaveEdit = useCallback(
    async (
      value: string,
      meta: GarboMetadata & { verified?: boolean }
    ) => {
      if (!editState) return;
      setActionLoading(true);
      try {
        if (editState.field === "tags") {
          const tags = value
            ? value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
            : [];
          await updateCompany(editState.wikidataId, {
            name: editState.companyName,
            tags,
          });
          toast.success(t("editor.tagOptions.updated"));
          setCompanies((prev) =>
            prev.map((c) =>
              c.wikidataId === editState.wikidataId ? { ...c, tags } : c
            )
          );
        } else if (
          editState.year != null &&
          editState.startDate &&
          editState.endDate
        ) {
          const payload: Record<string, unknown> = {
            startDate: editState.startDate,
            endDate: editState.endDate,
          };
          if (editState.field === "reportURL") {
            payload.reportURL = value || undefined;
          }
          if (editState.field === "scope1") {
            const num = value === "" ? null : Number(value);
            payload.emissions = {
              scope1: {
                total: num,
                unit: "tCO2e",
                verified: meta.verified,
              },
            };
          }
          if (editState.field === "scope2") {
            const num = value === "" ? null : Number(value);
            payload.emissions = {
              scope2: {
                mb: num,
                lb: null,
                unknown: null,
                unit: "tCO2e",
                verified: meta.verified,
              },
            };
          }
          if (editState.field === "economy") {
            const num = value === "" ? null : Number(value);
            payload.economy = {
              turnover: { value: num, currency: "SEK", verified: meta.verified },
            };
          }
          await updateReportingPeriods(editState.wikidataId, {
            reportingPeriods: [payload as any],
            metadata: meta.source || meta.comment ? { source: meta.source, comment: meta.comment } : undefined,
          });
          toast.success(t("editor.tagOptions.updated"));
        }
        setEditState(null);
        if (editState.field !== "tags") {
          await loadCompanies();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setActionLoading(false);
      }
    },
    [editState, t, loadCompanies]
  );

  return (
    <div className="space-y-4">
      <MultiCompanyFilters
        years={years}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        tagOptions={tagOptions}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        onRefresh={loadCompanies}
        refreshDisabled={loading}
      />

      {loading ? (
        <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner label={t("editor.companies.loading")} />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-6">
          <p className="text-gray-01 font-medium">{t("editor.companies.loadError")}</p>
          <p className="text-sm text-gray-02 mt-1">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={loadCompanies}>
            {t("common.refresh")}
          </Button>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-8 text-center text-gray-02">
          {t("editor.companies.empty")}
        </div>
      ) : (
        <>
          <MultiCompanySelectionBar
            count={selectedWikidataIds.size}
            onClear={clearSelection}
            onBulkUpdateTags={() => setBulkTagModalOpen(true)}
            bulkDisabled={actionLoading}
          />

          <MultiCompanyTable
            companies={filteredCompanies}
            selectedYear={selectedYear}
            allFilteredSelected={allFilteredSelected}
            onToggleSelectAll={() =>
              allFilteredSelected ? clearSelection() : selectAllFiltered()
            }
            selectedWikidataIds={selectedWikidataIds}
            onToggleCompanySelection={toggleCompanySelection}
            actionLoading={actionLoading}
            onEdit={setEditState}
          />
        </>
      )}

      {editState && (
        <FieldEditModal
          open={!!editState}
          onOpenChange={(open) => !open && setEditState(null)}
          title={`${editState.field === "tags" ? t("editor.companies.tags") : editState.field} — ${editState.companyName}`}
          currentValue={editState.currentValue}
          initialValue={editState.currentValue != null ? String(editState.currentValue) : ""}
          onSubmit={handleSaveEdit}
          allowVerifyOnly={editState.field !== "tags" && editState.field !== "reportURL"}
          isSubmitting={actionLoading}
          renderInput={
            editState.field === "tags"
              ? (value, onChange) => {
                  const selectedSlugs = value ? value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean) : [];
                  return (
                    <div className="space-y-2">
                      <MultiSelectDropdown
                        options={tagOptions.map((o) => o.slug)}
                        selectedIds={selectedSlugs}
                        onChange={(ids: string[]) => onChange(ids.join(", "))}
                        triggerLabel={t("editor.companies.tags")}
                        getOptionLabel={(slug) => tagOptions.find((o) => o.slug === slug)?.label ?? slug}
                        emptyLabel={t("editor.tagOptions.empty")}
                        panelClassName="max-h-64"
                        panelMinWidth={260}
                        portalToBody={false}
                      />
                      {selectedSlugs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSlugs.map((slug: string) => (
                            <span
                              key={slug}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-03/80 text-gray-01 border border-gray-03"
                            >
                              {tagOptions.find((o) => o.slug === slug)?.label ?? slug}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              : editState.field === "scope1" || editState.field === "scope2" || editState.field === "economy"
                ? (value, onChange, disabled) => (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 focus:outline-none focus:ring-2 focus:ring-blue-03"
                      disabled={disabled}
                      min={0}
                      step="any"
                    />
                  )
                : undefined
          }
        />
      )}

      <BulkTagUpdateModal
        open={bulkTagModalOpen}
        onOpenChange={setBulkTagModalOpen}
        companyCount={selectedWikidataIds.size}
        tagOptions={tagOptions}
        onSubmit={handleBulkTagSubmit}
        isSubmitting={actionLoading}
      />
    </div>
  );
}
