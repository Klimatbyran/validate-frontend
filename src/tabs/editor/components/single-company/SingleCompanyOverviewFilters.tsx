import type { ReactNode } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { SearchAndFiltersCard } from "@/ui/search-and-filters-card";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { NO_TAGS_FILTER_OPTION } from "../../lib/types";
import type { FilterUnverifiedOption } from "../../lib/single-company-overview-list";
import type { SingleCompanyOverviewList } from "../../hooks/useSingleCompanyOverviewList";

type Props = {
  list: SingleCompanyOverviewList;
  afterSlot: ReactNode;
};

export function SingleCompanyOverviewFilters({ list, afterSlot }: Props) {
  const { t } = useI18n();

  return (
    <SearchAndFiltersCard
      title={t("editor.singleCompanyView.searchAndFilters")}
      open={list.filtersOpen}
      onOpenChange={list.setFiltersOpen}
      after={afterSlot}
    >
      <div>
        <label className="block text-xs font-medium text-gray-02 mb-1">
          {t("editor.singleCompanyView.searchByNameOrId")}
        </label>
        <input
          type="text"
          value={list.searchQuery}
          onChange={(e) => list.setSearchQuery(e.target.value)}
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
            options={[NO_TAGS_FILTER_OPTION, ...list.tagOptions.map((o) => o.slug)]}
            selectedIds={list.filterTags}
            onChange={list.setFilterTags}
            triggerLabel={t("editor.companies.tags")}
            getOptionLabel={(slug) =>
              slug === NO_TAGS_FILTER_OPTION
                ? t("editor.companies.noTags")
                : (list.tagLabelBySlug[slug] ?? slug)
            }
            emptyLabel={t("editor.companies.allTags")}
            triggerClassName="min-w-[140px] !h-8 !text-xs px-3"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-02 mb-1">
            {t("editor.singleCompanyView.excludeTagsLabel")}
          </label>
          <MultiSelectDropdown
            options={list.tagOptions.map((o) => o.slug)}
            selectedIds={list.excludeFilterTags}
            onChange={list.setExcludeFilterTags}
            triggerLabel={t("editor.singleCompanyView.excludeTagsTrigger")}
            getOptionLabel={(slug) => list.tagLabelBySlug[slug] ?? slug}
            emptyLabel={t("editor.singleCompanyView.excludeTagsEmpty")}
            triggerClassName="min-w-[140px] !h-8 !text-xs px-3"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-02 mb-1">
            {t("editor.companies.year")}
          </label>
          <MultiSelectDropdown
            options={list.years}
            selectedIds={list.filterYears}
            onChange={list.setFilterYears}
            triggerLabel={t("editor.companies.year")}
            emptyLabel={t("editor.companies.allYears")}
            triggerClassName="min-w-[120px] !h-8 !text-xs px-3"
          />
        </div>
        {list.sectors.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("editor.singleCompanyView.sector")}
            </label>
            <SingleSelectDropdown
              options={["", ...list.sectors]}
              value={list.filterSector}
              onChange={list.setFilterSector}
              placeholder={t("editor.singleCompanyView.allSectors")}
              getOptionLabel={(v) =>
                v ? v : t("editor.singleCompanyView.allSectors")
              }
              triggerClassName="min-w-[140px] !h-8 !text-xs px-3"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-02 mb-1">
            {t("editor.singleCompanyView.filterUnverifiedLabel")}
          </label>
          <SingleSelectDropdown
            options={["", "emissions", "all"] as FilterUnverifiedOption[]}
            value={list.filterUnverified}
            onChange={list.setFilterUnverified}
            placeholder={t("editor.singleCompanyView.filterUnverifiedNoFilter")}
            getOptionLabel={(v) => {
              if (v === "emissions")
                return t("editor.singleCompanyView.filterUnverifiedEmissionsOnly");
              if (v === "all")
                return t("editor.singleCompanyView.filterUnverifiedEmissionsAndEconomy");
              return t("editor.singleCompanyView.filterUnverifiedNoFilter");
            }}
            triggerClassName="min-w-[180px] !h-8 !text-xs px-3"
          />
        </div>
        {list.filterUnverified && (
          <div
            className="self-end"
            title={
              list.filterYears.length === 0
                ? t("editor.singleCompanyView.filterApplyToSelectedYearsHint")
                : undefined
            }
          >
            <label
              className={`flex items-center h-8 gap-2 text-xs ${
                list.filterYears.length > 0
                  ? "cursor-pointer text-gray-01"
                  : "cursor-not-allowed text-gray-03"
              }`}
            >
              <input
                type="checkbox"
                checked={list.filterApplyUnverifiedToSelectedYears}
                onChange={(e) =>
                  list.setFilterApplyUnverifiedToSelectedYears(e.target.checked)
                }
                disabled={list.filterYears.length === 0}
                className="rounded border-gray-03 disabled:opacity-40"
              />
              {t("editor.singleCompanyView.filterApplyToSelectedYears")}
            </label>
          </div>
        )}
      </div>
      {!list.loadingList && list.filteredCompanies.length > 0 && (
        <p className="text-xs text-gray-02 mt-3 pt-3 border-t border-gray-03/50">
          {t("editor.singleCompanyView.filterPeriodValidationSummary", {
            verified: list.filterPeriodStats.verifiedEmissionsPeriods,
            total: list.filterPeriodStats.totalPeriods,
          })}
        </p>
      )}
    </SearchAndFiltersCard>
  );
}

export function SingleCompanyOverviewListAfterSlot({
  list,
}: {
  list: SingleCompanyOverviewList;
}) {
  const { t } = useI18n();

  return (
    <>
      {list.listError && !list.loadingList && (
        <div className="rounded-lg border border-gray-03 bg-gray-05/80 p-4">
          <p className="text-gray-01 font-medium">
            {t("editor.singleCompanyView.loadError")}
          </p>
          <p className="text-sm text-gray-02 mt-1">{list.listError}</p>
        </div>
      )}

      {list.loadingList && (
        <div className="flex justify-center py-12">
          <LoadingSpinner label={t("editor.companies.loading")} />
        </div>
      )}

      {!list.loadingList && list.filteredCompanies.length === 0 && (
        <div className="py-8 text-center text-gray-02 text-sm">
          {t("editor.singleCompanyView.noCompaniesMatch")}
        </div>
      )}
    </>
  );
}
