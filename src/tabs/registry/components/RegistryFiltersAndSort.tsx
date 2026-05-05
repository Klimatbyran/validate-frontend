import { useMemo, useState, type ReactNode } from "react";
import { Filter } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { SearchAndFiltersCard } from "@/ui/search-and-filters-card";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { buildTagLabelBySlug } from "@/tabs/editor/lib/editor-tag-and-payload-utils";
import type { TagOption } from "@/tabs/editor/lib/types";
import type {
  RegistrySortKey,
  RegistryTagFilterMode,
  ReportYearFilterValue,
  WikidataPresenceFilter,
} from "../lib/registry-table-utils";

const WIKIDATA_OPTIONS: WikidataPresenceFilter[] = ["all", "present", "missing"];

const TAG_MODE_OPTIONS: RegistryTagFilterMode[] = [
  "ignore",
  "no_tags_in_garbo",
  "has_any_of",
];

const SORT_KEYS: RegistrySortKey[] = [
  "companyNameAsc",
  "companyNameDesc",
  "reportYearDesc",
  "reportYearAsc",
  "registryIdDesc",
  "registryIdAsc",
];

interface RegistryFiltersAndSortProps {
  disabled: boolean;
  yearFilter: ReportYearFilterValue;
  onYearFilterChange: (value: ReportYearFilterValue) => void;
  distinctYears: string[];
  wikidataFilter: WikidataPresenceFilter;
  onWikidataFilterChange: (value: WikidataPresenceFilter) => void;
  tagFilterMode: RegistryTagFilterMode;
  onTagFilterModeChange: (value: RegistryTagFilterMode) => void;
  selectedTagSlugs: string[];
  onSelectedTagSlugsChange: (value: string[]) => void;
  tagOptions: TagOption[];
  tagsOptionsLoading: boolean;
  companyTagsLoading: boolean;
  companyTagsError: string | null;
  sortKey: RegistrySortKey;
  onSortKeyChange: (value: RegistrySortKey) => void;
}

function DisableWrap({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn(disabled && "pointer-events-none opacity-50")}>
      {children}
    </div>
  );
}

const RegistryFiltersAndSort = ({
  disabled,
  yearFilter,
  onYearFilterChange,
  distinctYears,
  wikidataFilter,
  onWikidataFilterChange,
  tagFilterMode,
  onTagFilterModeChange,
  selectedTagSlugs,
  onSelectedTagSlugsChange,
  tagOptions,
  tagsOptionsLoading,
  companyTagsLoading,
  companyTagsError,
  sortKey,
  onSortKeyChange,
}: RegistryFiltersAndSortProps) => {
  const { t } = useI18n();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const tagControlsDisabled =
    disabled || Boolean(companyTagsError) || companyTagsLoading;

  const yearOptionList = useMemo(
    () => ["all", "missing", ...distinctYears],
    [distinctYears],
  );

  const tagSlugOptions = useMemo(
    () => tagOptions.map((o) => o.slug),
    [tagOptions],
  );
  const tagLabelBySlug = useMemo(
    () => buildTagLabelBySlug(tagOptions),
    [tagOptions],
  );

  const labelYear = (v: string) => {
    if (v === "all") return t("registry.filterYearAll");
    if (v === "missing") return t("registry.filterYearMissing");
    return v;
  };

  const labelWikidata = (v: string) => {
    if (v === "all") return t("registry.filterWikidataAll");
    if (v === "present") return t("registry.filterWikidataPresent");
    return t("registry.filterWikidataMissing");
  };

  const labelTagMode = (v: string) => {
    if (v === "ignore") return t("registry.filterTagsIgnore");
    if (v === "no_tags_in_garbo") return t("registry.filterTagsNoTagsInGarbo");
    return t("registry.filterTagsHasAnyOf");
  };

  const labelSort = (v: string) => {
    switch (v as RegistrySortKey) {
      case "companyNameAsc":
        return t("registry.sortCompanyNameAsc");
      case "companyNameDesc":
        return t("registry.sortCompanyNameDesc");
      case "reportYearDesc":
        return t("registry.sortReportYearDesc");
      case "reportYearAsc":
        return t("registry.sortReportYearAsc");
      case "registryIdDesc":
        return t("registry.sortRegistryIdDesc");
      case "registryIdAsc":
        return t("registry.sortRegistryIdAsc");
      default:
        return v;
    }
  };

  return (
    <div className="mt-4">
      <SearchAndFiltersCard
        title={t("registry.filtersAndSort")}
        icon={<Filter className="w-4 h-4 text-gray-02" />}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      >
        <div className="flex flex-wrap gap-4 items-start">
          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("registry.filterReportYear")}
            </label>
            <DisableWrap disabled={disabled}>
              <SingleSelectDropdown
                options={yearOptionList}
                value={yearFilter}
                onChange={(v) => onYearFilterChange(v as ReportYearFilterValue)}
                placeholder={t("registry.filterYearAll")}
                getOptionLabel={labelYear}
                ariaLabel={t("registry.filterReportYear")}
                triggerClassName="min-w-[140px]"
              />
            </DisableWrap>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("registry.filterWikidata")}
            </label>
            <DisableWrap disabled={disabled}>
              <SingleSelectDropdown
                options={[...WIKIDATA_OPTIONS]}
                value={wikidataFilter}
                onChange={(v) =>
                  onWikidataFilterChange(v as WikidataPresenceFilter)
                }
                placeholder={t("registry.filterWikidataAll")}
                getOptionLabel={labelWikidata}
                ariaLabel={t("registry.filterWikidata")}
                triggerClassName="min-w-[160px]"
              />
            </DisableWrap>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("registry.filterCompanyTags")}
            </label>
            <DisableWrap disabled={tagControlsDisabled}>
              <SingleSelectDropdown
                options={[...TAG_MODE_OPTIONS]}
                value={tagFilterMode}
                onChange={(v) =>
                  onTagFilterModeChange(v as RegistryTagFilterMode)
                }
                placeholder={t("registry.filterTagsIgnore")}
                getOptionLabel={labelTagMode}
                ariaLabel={t("registry.filterCompanyTags")}
                triggerClassName="min-w-[180px]"
              />
            </DisableWrap>
            {companyTagsLoading && (
              <span className="mt-1 block text-xs text-gray-02">
                {t("registry.filterTagsLoadingCompanies")}
              </span>
            )}
            {companyTagsError && (
              <span className="mt-1 block text-xs text-red-500">
                {t("registry.filterTagsCompanyListError")}
              </span>
            )}
          </div>

          {tagFilterMode === "has_any_of" && (
            <div>
              <label className="block text-xs font-medium text-gray-02 mb-1">
                {t("registry.filterTagsPickSlugs")}
              </label>
              <DisableWrap
                disabled={
                  tagControlsDisabled || tagsOptionsLoading || !tagOptions.length
                }
              >
                <MultiSelectDropdown
                  options={tagSlugOptions}
                  selectedIds={selectedTagSlugs}
                  onChange={onSelectedTagSlugsChange}
                  triggerLabel={t("registry.filterTagsPickSlugs")}
                  getOptionLabel={(slug) => tagLabelBySlug[slug] ?? slug}
                  loading={tagsOptionsLoading}
                  loadingLabel={t("registry.loading")}
                  emptyLabel={t("registry.filterTagsEmptyOptions")}
                  triggerClassName="min-w-[200px]"
                />
              </DisableWrap>
              <span className="mt-1 block text-xs text-gray-02/90">
                {t("registry.filterTagsMultiHint")}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("registry.sortBy")}
            </label>
            <DisableWrap disabled={disabled}>
              <SingleSelectDropdown
                options={[...SORT_KEYS]}
                value={sortKey}
                onChange={(v) => onSortKeyChange(v as RegistrySortKey)}
                placeholder={t("registry.sortBy")}
                getOptionLabel={labelSort}
                ariaLabel={t("registry.sortBy")}
                triggerClassName="min-w-[200px] max-w-[280px]"
              />
            </DisableWrap>
            <span className="mt-1 block text-xs text-gray-02/90 max-w-sm">
              {t("registry.sortIdHint")}
            </span>
          </div>
        </div>
      </SearchAndFiltersCard>
    </div>
  );
};

export default RegistryFiltersAndSort;
