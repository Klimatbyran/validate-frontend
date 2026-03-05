import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, CheckCircle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { toast } from "sonner";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { listCompanies, updateCompany, updateCompanyTags, updateReportingPeriods } from "../lib/companies-api";
import { fetchTagOptions } from "../lib/tag-options-api";
import type {
  GarboCompanyListItem,
  GarboReportingPeriodSummary,
  TagOption,
  GarboMetadata,
} from "../lib/types";
import { FieldEditModal } from "./FieldEditModal";
import { BulkTagUpdateModal } from "./BulkTagUpdateModal";

function getPeriodForYear(
  periods: GarboReportingPeriodSummary[] | undefined,
  year: number
): GarboReportingPeriodSummary | null {
  if (!periods?.length) return null;
  const y = String(year);
  return (
    periods.find(
      (p) =>
        p.startDate?.startsWith(y) ||
        p.endDate?.startsWith(y) ||
        (p.startDate && p.endDate && y >= p.startDate.slice(0, 4) && y <= p.endDate.slice(0, 4))
    ) ?? null
  );
}

function formatNumber(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString();
}

export function MultiCompanyView() {
  const { t } = useI18n();
  const [companies, setCompanies] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [editState, setEditState] = useState<{
    wikidataId: string;
    companyName: string;
    field: "tags" | "reportURL" | "scope1" | "scope2" | "economy";
    year?: number;
    startDate?: string;
    endDate?: string;
    currentValue: string | number | null;
  } | null>(null);
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
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-02">{t("editor.companies.filters")}</span>
        <SingleSelectDropdown
          options={["", ...years]}
          value={selectedYear}
          onChange={setSelectedYear}
          placeholder={t("editor.companies.allYears")}
          getOptionLabel={(v) => (v ? v : t("editor.companies.allYears"))}
          triggerClassName="min-w-[120px]"
        />
        <MultiSelectDropdown
          options={tagOptions.map((o) => o.slug)}
          selectedIds={selectedTags}
          onChange={setSelectedTags}
          triggerLabel={t("editor.companies.tag")}
          getOptionLabel={(id) => tagOptions.find((o) => o.slug === id)?.label ?? id}
          emptyLabel={t("editor.companies.allTags")}
          triggerClassName="min-w-[140px]"
        />
        <Button variant="secondary" size="sm" onClick={loadCompanies} disabled={loading}>
          {t("common.refresh")}
        </Button>
      </div>

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
          {selectedWikidataIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-03 bg-gray-04/80 px-4 py-3">
              <span className="text-sm font-medium text-gray-01">
                {t("editor.companies.companiesSelected", { count: selectedWikidataIds.size })}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                {t("editor.companies.clearSelection")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setBulkTagModalOpen(true)}
                disabled={actionLoading}
              >
                {t("editor.companies.bulkUpdateTags")}
              </Button>
            </div>
          )}
          <div className="rounded-lg border border-gray-03 bg-gray-04/80 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-03 bg-gray-04 text-gray-02 text-xs uppercase tracking-wide">
                <th className="w-10 px-2 py-3 font-medium">
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={() => (allFilteredSelected ? clearSelection() : selectAllFiltered())}
                      className="rounded border-gray-03"
                      aria-label={t("editor.companies.selectAll")}
                    />
                  </label>
                </th>
                <th className="px-4 py-3 font-medium">{t("editor.companies.company")}</th>
                <th className="px-4 py-3 font-medium">{t("editor.companies.tags")}</th>
                {selectedYear && (
                  <>
                    <th className="px-4 py-3 font-medium">{t("editor.companies.reportUrl")}</th>
                    <th className="px-4 py-3 font-medium">{t("editor.companies.scope1")}</th>
                    <th className="px-4 py-3 font-medium">{t("editor.companies.scope2")}</th>
                    <th className="px-4 py-3 font-medium w-24">{t("editor.companies.edit")}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => {
                const period =
                  selectedYear ? getPeriodForYear(c.reportingPeriods, Number(selectedYear)) : null;
                const scope1 = period?.emissions?.scope1?.total ?? null;
                const scope2 =
                  period?.emissions?.scope2 != null
                    ? (period.emissions.scope2.mb ?? period.emissions.scope2.lb ?? period.emissions.scope2.unknown) ?? null
                    : null;
                return (
                  <tr key={c.wikidataId} className="border-b border-gray-03/50 hover:bg-gray-04/50">
                    <td className="w-10 px-2 py-3">
                      <label className="flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedWikidataIds.has(c.wikidataId)}
                          onChange={() => toggleCompanySelection(c.wikidataId)}
                          className="rounded border-gray-03"
                          aria-label={t("editor.companies.select")}
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3 text-gray-01 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-01">
                      {c.tags?.length ? c.tags.join(", ") : "—"}
                      <button
                        type="button"
                        onClick={() =>
                          setEditState({
                            wikidataId: c.wikidataId,
                            companyName: c.name,
                            field: "tags",
                            currentValue: c.tags?.join(", ") ?? "",
                          })
                        }
                        disabled={actionLoading}
                        className="ml-2 p-1 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50"
                        aria-label={t("editor.companies.edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                    {selectedYear && period && (
                      <>
                        <td className="px-4 py-3 text-gray-01">
                          {period.reportURL ? (
                            <a
                              href={period.reportURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-03 hover:underline truncate max-w-[180px] block"
                            >
                              {period.reportURL}
                            </a>
                          ) : (
                            "—"
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setEditState({
                                wikidataId: c.wikidataId,
                                companyName: c.name,
                                field: "reportURL",
                                year: Number(selectedYear),
                                startDate: period.startDate,
                                endDate: period.endDate,
                                currentValue: period.reportURL ?? "",
                              })
                            }
                            disabled={actionLoading}
                            className="ml-2 p-1 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50 inline-flex align-middle"
                            aria-label={t("editor.companies.edit")}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-01">
                          {formatNumber(scope1)}
                          <button
                            type="button"
                            onClick={() =>
                              setEditState({
                                wikidataId: c.wikidataId,
                                companyName: c.name,
                                field: "scope1",
                                year: Number(selectedYear),
                                startDate: period.startDate,
                                endDate: period.endDate,
                                currentValue: scope1,
                              })
                            }
                            disabled={actionLoading}
                            className="ml-2 p-1 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50 inline-flex align-middle"
                            aria-label={t("editor.companies.edit")}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-01">
                          {formatNumber(scope2)}
                          <button
                            type="button"
                            onClick={() =>
                              setEditState({
                                wikidataId: c.wikidataId,
                                companyName: c.name,
                                field: "scope2",
                                year: Number(selectedYear),
                                startDate: period.startDate,
                                endDate: period.endDate,
                                currentValue: scope2,
                              })
                            }
                            disabled={actionLoading}
                            className="ml-2 p-1 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50 inline-flex align-middle"
                            aria-label={t("editor.companies.edit")}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setEditState({
                                  wikidataId: c.wikidataId,
                                  companyName: c.name,
                                  field: "scope1",
                                  year: Number(selectedYear),
                                  startDate: period.startDate,
                                  endDate: period.endDate,
                                  currentValue: scope1,
                                })
                              }
                              disabled={actionLoading}
                              className="p-2 rounded-full text-gray-02 hover:text-green-600 hover:bg-gray-03 disabled:opacity-50"
                              aria-label={t("editor.companies.verify")}
                              title={t("editor.companies.verify")}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
                        onChange={(ids) => onChange(ids.join(", "))}
                        triggerLabel={t("editor.companies.tags")}
                        getOptionLabel={(slug) => tagOptions.find((o) => o.slug === slug)?.label ?? slug}
                        emptyLabel={t("editor.tagOptions.empty")}
                        panelClassName="max-h-64"
                        panelMinWidth={260}
                      />
                      {selectedSlugs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSlugs.map((slug) => (
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
