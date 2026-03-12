import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { listCompanies, getCompany } from "../lib/companies-api";
import { fetchTagOptions } from "../lib/tag-options-api";
import type { GarboCompanyDetail, GarboCompanyListItem, TagOption } from "../lib/types";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { CompanyEditDetail } from "./CompanyEditDetail";

function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

function companyHasPeriodInYear(
  company: GarboCompanyListItem,
  year: string
): boolean {
  if (!year) return true;
  return (company.reportingPeriods ?? []).some(
    (p) => getPeriodYear(p) === year
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

export function SingleCompanyView() {
  const { t } = useI18n();
  const [companyList, setCompanyList] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterSector, setFilterSector] = useState<string>("");
  const [filterHasUnverifiedEmissions, setFilterHasUnverifiedEmissions] = useState(false);
  const [filterHasUnverifiedData, setFilterHasUnverifiedData] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GarboCompanyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const filteredCompanies = useMemo(() => {
    return companyList.filter((c) => {
      if (!companyMatchesSearch(c, searchQuery)) return false;
      if (filterTags.length && !filterTags.some((t) => c.tags?.includes(t)))
        return false;
      if (filterYear && !companyHasPeriodInYear(c, filterYear)) return false;
      if (
        filterSector &&
        (c.industry?.subIndustryCode ?? "") !== filterSector
      )
        return false;
      if (filterHasUnverifiedEmissions && !c.hasUnverifiedEmissions) return false;
      if (filterHasUnverifiedData && !c.hasUnverifiedData) return false;
      return true;
    });
  }, [companyList, searchQuery, filterTags, filterYear, filterSector, filterHasUnverifiedEmissions, filterHasUnverifiedData]);

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
      <details
        open={filtersOpen}
        onToggle={(e) => setFiltersOpen((e.target as HTMLDetailsElement).open)}
        className="group rounded-lg border border-gray-03 bg-gray-04/80"
      >
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none text-gray-01 font-medium hover:bg-gray-03/30 select-none rounded-t-lg">
          {filtersOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-02" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-02" />
          )}
          <Search className="w-4 h-4 text-gray-02" />
          {t("editor.singleCompanyView.searchAndFilters")}
        </summary>
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-03/50 rounded-b-lg">
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
                options={tagOptions.map((o) => o.slug)}
                selectedIds={filterTags}
                onChange={setFilterTags}
                triggerLabel={t("editor.companies.tags")}
                getOptionLabel={(slug) =>
                  tagOptions.find((o) => o.slug === slug)?.label ?? slug
                }
                emptyLabel={t("editor.companies.allTags")}
                triggerClassName="min-w-[140px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-02 mb-1">
                {t("editor.companies.year")}
              </label>
              <SingleSelectDropdown
                options={["", ...years]}
                value={filterYear}
                onChange={setFilterYear}
                placeholder={t("editor.companies.allYears")}
                getOptionLabel={(v) => (v ? v : t("editor.companies.allYears"))}
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
                  getOptionLabel={(v) =>
                    v ? v : t("editor.singleCompanyView.allSectors")
                  }
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
        </div>
      </details>

      {error && !loadingList && (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
          <p className="text-gray-01 font-medium">
            {t("editor.singleCompanyView.loadError")}
          </p>
          <p className="text-sm text-gray-02 mt-1">{error}</p>
        </div>
      )}

      {loadingList ? (
        <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner label={t("editor.companies.loading")} />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-8 text-center text-gray-02 text-sm">
          {t("editor.singleCompanyView.noCompaniesMatch")}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-03 bg-gray-04 text-gray-02 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">
                  {t("editor.companies.company")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("editor.companies.tags")}
                </th>
                {sectors.length > 0 && (
                  <th className="px-4 py-3 font-medium">
                    {t("editor.singleCompanyView.sections.industry")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => (
                <tr
                  key={c.wikidataId}
                  onClick={() => setSelectedCompanyId(c.wikidataId)}
                  className="border-b border-gray-03/50 hover:bg-gray-04/50 cursor-pointer text-gray-01"
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-02">
                    {c.tags?.length ? c.tags.join(", ") : "—"}
                  </td>
                  {sectors.length > 0 && (
                    <td className="px-4 py-3 text-gray-02">
                      {c.industry?.subIndustryCode ?? "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-gray-03 border-t border-gray-03/50">
            {t("editor.singleCompanyView.showingCount", {
              count: filteredCompanies.length,
              total: companyList.length,
            })}
          </p>
        </div>
      )}
    </div>
  );
}
