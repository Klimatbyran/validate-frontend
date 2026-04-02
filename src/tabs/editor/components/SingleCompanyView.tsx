import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Minus,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { listCompanies, getCompany } from "../lib/companies-api";
import { fetchTagOptions } from "../lib/tag-options-api";
import type {
  GarboCompanyDetail,
  GarboCompanyListItem,
  TagOption,
} from "../lib/types";
import type { VerificationState } from "../lib/verification";
import { getCompanyVerificationOverview } from "../lib/verification";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { CompanyEditDetail } from "./CompanyEditDetail";
import { DataTable, DataTableBody, DataTableHead, DataTableShell } from "@/ui/data-table";
import { NO_TAGS_FILTER_OPTION } from "../lib/types";
import { buildTagLabelBySlug, companyMatchesTagFilter } from "../lib/editor-tag-and-payload-utils";
import { SearchAndFiltersCard } from "@/ui/search-and-filters-card";
import { ReportingPeriodQuickEditModal } from "./ReportingPeriodQuickEditModal";

function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

function companyHasPeriodsInYears(
  company: GarboCompanyListItem,
  years: string[]
): boolean {
  if (!years.length) return true;
  // AND: must have all selected years
  return years.every((y) =>
    (company.reportingPeriods ?? []).some((p) => getPeriodYear(p) === y)
  );
}

function companyMatchesSearch(
  company: GarboCompanyListItem,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (company.name ?? "").toLowerCase();
  const id = (company.wikidataId ?? "").toLowerCase();
  return name.includes(q) || id.includes(q);
}

function StatusIcon({ state }: { state: VerificationState }) {
  if (state === "verified")
    return <CheckCircle2 className="w-4 h-4 text-green-03" />;
  if (state === "unverified")
    return <AlertCircle className="w-4 h-4 text-orange-03" />;
  return <Minus className="w-4 h-4 text-gray-03" />;
}

export function SingleCompanyView() {
  const { t } = useI18n();
  const [companyList, setCompanyList] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterYears, setFilterYears] = useState<string[]>([]);
  const [filterSector, setFilterSector] = useState<string>("");
  const [filterHasUnverifiedEmissions, setFilterHasUnverifiedEmissions] = useState(false);
  const [filterHasUnverifiedData, setFilterHasUnverifiedData] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GarboCompanyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [quickEdit, setQuickEdit] = useState<{ companyId: string; year: string } | null>(null);

  const tagLabelBySlug = useMemo(() => buildTagLabelBySlug(tagOptions), [tagOptions]);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setError(null);
    Promise.all([listCompanies(), fetchTagOptions()])
      .then(([list, tags]) => {
        if (!cancelled) {
          setCompanyList(list);
          setTagOptions(tags);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setCompanyList([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setError(null);
    getCompany(selectedCompanyId)
      .then((company) => {
        if (!cancelled) setDetail(company);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId]);

  /** All unique reporting period years (from end date) in the companies list, newest first. */
  const years = useMemo(() => {
    const set = new Set<string>();
    companyList.forEach((c) => {
      c.reportingPeriods?.forEach((p) => {
        const y = getPeriodYear(p);
        if (y) set.add(y);
      });
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [companyList]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    companyList.forEach((c) => {
      const code = c.industry?.subIndustryCode;
      if (code) set.add(code);
    });
    return Array.from(set).sort();
  }, [companyList]);

  const companyOverviewById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCompanyVerificationOverview>>();
    companyList.forEach((c) => {
      map.set(c.wikidataId, getCompanyVerificationOverview(c));
    });
    return map;
  }, [companyList]);

  const filteredCompanies = useMemo(() => {
    return companyList.filter((c) => {
      const overview = companyOverviewById.get(c.wikidataId);
      if (!companyMatchesSearch(c, searchQuery)) return false;
      if (!companyMatchesTagFilter(c.tags, filterTags)) return false;
      if (filterYears.length && !companyHasPeriodsInYears(c, filterYears))
        return false;
      if (
        filterSector &&
        (c.industry?.subIndustryCode ?? "") !== filterSector
      )
        return false;
      if (filterHasUnverifiedEmissions && !overview?.hasUnverifiedEmissions)
        return false;
      if (filterHasUnverifiedData && !overview?.hasUnverifiedData) return false;
      return true;
    });
  }, [
    companyList,
    companyOverviewById,
    searchQuery,
    filterTags,
    filterYears,
    filterSector,
    filterHasUnverifiedEmissions,
    filterHasUnverifiedData,
  ]);

  const goBack = useCallback(() => {
    setSelectedCompanyId(null);
  }, []);

  if (selectedCompanyId && detail && !loadingDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("editor.singleCompanyView.backToResults")}
          </Button>
        </div>
        <CompanyEditDetail
          company={detail}
          tagOptions={tagOptions}
          onSaved={() => {
            if (selectedCompanyId) {
              getCompany(selectedCompanyId).then(setDetail);
            }
            listCompanies().then(setCompanyList);
          }}
        />
      </div>
    );
  }

  if (loadingDetail) {
    return (
      <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
        <LoadingSpinner label={t("editor.singleCompanyView.loadingDetail")} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchAndFiltersCard
        title={t("editor.singleCompanyView.searchAndFilters")}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        after={
          <>
            {error && !loadingList && (
              <div className="rounded-lg border border-gray-03 bg-gray-05/80 p-4">
                <p className="text-gray-01 font-medium">
                  {t("editor.singleCompanyView.loadError")}
                </p>
                <p className="text-sm text-gray-02 mt-1">{error}</p>
              </div>
            )}

            {loadingList && (
              <div className="flex justify-center py-12">
                <LoadingSpinner label={t("editor.companies.loading")} />
              </div>
            )}

            {!loadingList && filteredCompanies.length === 0 && (
              <div className="py-8 text-center text-gray-02 text-sm">
                {t("editor.singleCompanyView.noCompaniesMatch")}
              </div>
            )}
          </>
        }
      >
        <div>
          <label className="block text-xs font-medium text-gray-02 mb-1">
            {t("editor.singleCompanyView.searchByNameOrId")}
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("editor.singleCompanyView.searchPlaceholder")}
            className="w-full max-w-md px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("editor.companies.tag")}
            </label>
            <MultiSelectDropdown
              options={[NO_TAGS_FILTER_OPTION, ...tagOptions.map((o) => o.slug)]}
              selectedIds={filterTags}
              onChange={setFilterTags}
              triggerLabel={t("editor.companies.tags")}
              getOptionLabel={(slug) =>
                slug === NO_TAGS_FILTER_OPTION
                  ? t("editor.companies.noTags")
                  : (tagLabelBySlug[slug] ?? slug)
              }
              emptyLabel={t("editor.companies.allTags")}
              triggerClassName="min-w-[140px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("editor.companies.year")}
            </label>
            <MultiSelectDropdown
              options={years}
              selectedIds={filterYears}
              onChange={setFilterYears}
              triggerLabel={t("editor.companies.year")}
              emptyLabel={t("editor.companies.allYears")}
              triggerClassName="min-w-[120px]"
            />
          </div>
          {sectors.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-02 mb-1">
                {t("editor.singleCompanyView.sector")}
              </label>
              <SingleSelectDropdown
                options={["", ...sectors]}
                value={filterSector}
                onChange={setFilterSector}
                placeholder={t("editor.singleCompanyView.allSectors")}
                getOptionLabel={(v) => (v ? v : t("editor.singleCompanyView.allSectors"))}
                triggerClassName="min-w-[140px]"
              />
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-gray-01 text-sm">
              <input
                type="checkbox"
                checked={filterHasUnverifiedEmissions}
                onChange={(e) => setFilterHasUnverifiedEmissions(e.target.checked)}
                className="rounded border-gray-03"
              />
              {t("editor.singleCompanyView.filterHasUnverifiedEmissions")}
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-01 text-sm">
              <input
                type="checkbox"
                checked={filterHasUnverifiedData}
                onChange={(e) => setFilterHasUnverifiedData(e.target.checked)}
                className="rounded border-gray-03"
              />
              {t("editor.singleCompanyView.filterHasUnverifiedData")}
            </label>
          </div>
        </div>
      </SearchAndFiltersCard>

      {!loadingList && filteredCompanies.length > 0 && (
        <DataTableShell>
          {quickEdit && (
            <ReportingPeriodQuickEditModal
              open={true}
              onOpenChange={(open) => {
                if (!open) setQuickEdit(null);
              }}
              company={companyList.find((x) => x.wikidataId === quickEdit.companyId)!}
              year={quickEdit.year}
              onSaved={() => {
                listCompanies().then(setCompanyList);
              }}
            />
          )}
          <DataTable>
            <DataTableHead>
              <tr>
                <th className="px-4 py-3 font-medium w-[22%]">
                  {t("editor.companies.company")}
                </th>
                <th className="px-4 py-3 font-medium">
                  <div className="leading-tight">
                    <div>Base year</div>
                    <div className="text-[10px] text-gray-01 normal-case tracking-normal">
                      All years
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">
                  <div className="leading-tight">
                    <div>Emissions</div>
                    <div className="text-[10px] text-gray-01 normal-case tracking-normal">
                      All years
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">
                  <div className="leading-tight">
                    <div>Economy</div>
                    <div className="text-[10px] text-gray-01 normal-case tracking-normal">
                      All years
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("editor.companies.year")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("editor.singleCompanyView.sections.industry")}
                </th>
                <th className="px-4 py-3 font-medium w-[18%]">
                  {t("editor.companies.tags")}
                </th>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {filteredCompanies.map((c) => {
                const overview = companyOverviewById.get(c.wikidataId);
                return (
                  <tr
                    key={c.wikidataId}
                    onClick={() => setSelectedCompanyId(c.wikidataId)}
                    className="hover:bg-gray-04/50 cursor-pointer text-gray-01 align-top"
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        <span className="text-xs text-gray-03">{c.wikidataId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-02">
                      <div className="flex items-center gap-2">
                        <StatusIcon state={overview?.baseYear ?? "none"} />
                        <span>{(c as any).baseYear?.year ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusIcon state={overview?.emissions ?? "none"} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusIcon state={overview?.economy ?? "none"} />
                    </td>
                    <td className="px-4 py-3 text-gray-02">
                      {overview?.perYear?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {overview.perYear.map((p) => (
                            <button
                              key={p.year}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickEdit({ companyId: c.wikidataId, year: p.year });
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-gray-03 px-2 py-1 text-xs text-gray-01 bg-gray-05 hover:bg-gray-03/40"
                              title={`Quick edit ${p.year}`}
                            >
                              <span className="font-semibold">{p.year}</span>
                              <span className="inline-flex items-center gap-1">
                                <span className="text-[10px] text-gray-03">E</span>
                                <StatusIcon state={p.emissions} />
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="text-[10px] text-gray-03">$</span>
                                <StatusIcon state={p.economy} />
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-02">
                      <div className="flex items-center gap-2">
                        <StatusIcon state={overview?.industry ?? "none"} />
                        <span>{c.industry?.subIndustryCode ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-02">
                      {c.tags?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {c.tags.slice(0, 4).map((slug) => (
                            <span
                              key={slug}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-03/40 text-gray-01 border border-gray-03"
                            >
                              {tagLabelBySlug[slug] ?? slug}
                            </span>
                          ))}
                          {c.tags.length > 4 && (
                            <span className="text-[11px] text-gray-02">
                              +{c.tags.length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </DataTableBody>
          </DataTable>
          <p className="px-4 py-2 text-xs text-gray-03 border-t border-gray-03/50">
            {t("editor.singleCompanyView.showingCount", {
              count: filteredCompanies.length,
              total: companyList.length,
            })}
          </p>
        </DataTableShell>
      )}
    </div>
  );
}
