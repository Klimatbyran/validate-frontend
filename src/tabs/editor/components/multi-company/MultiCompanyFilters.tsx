import { useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { inputClassName } from "../../lib/company-edit-utils";
import { buildTagLabelBySlug } from "../../lib/editor-tag-and-payload-utils";
import { NO_TAGS_FILTER_OPTION, type TagOption } from "../../lib/types";
import { SearchAndFiltersCard } from "@/ui/search-and-filters-card";

export function MultiCompanyFilters({
  searchQuery,
  onSearchQueryChange,
  years,
  selectedYear,
  onYearChange,
  tagOptions,
  selectedTags,
  onTagsChange,
  onRefresh,
  refreshDisabled,
}: {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  years: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  tagOptions: TagOption[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onRefresh: () => void;
  refreshDisabled?: boolean;
}) {
  const { t } = useI18n();
  const tagLabelBySlug = useMemo(() => buildTagLabelBySlug(tagOptions), [tagOptions]);
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <SearchAndFiltersCard
      title={t("editor.singleCompanyView.searchAndFilters")}
      open={filtersOpen}
      onOpenChange={setFiltersOpen}
    >
      <div>
        <label className="block text-xs font-medium text-gray-02 mb-1">
          {t("editor.singleCompanyView.searchByNameOrId")}
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder={t("editor.singleCompanyView.searchPlaceholder")}
          className={inputClassName}
        />
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-02 mb-1">
            {t("editor.companies.tag")}
          </label>
          <MultiSelectDropdown
            options={[NO_TAGS_FILTER_OPTION, ...tagOptions.map((o) => o.slug)]}
            selectedIds={selectedTags}
            onChange={onTagsChange}
            triggerLabel={t("editor.companies.tags")}
            getOptionLabel={(optionValue) => {
              if (optionValue === NO_TAGS_FILTER_OPTION) return t("editor.companies.noTags");
              return tagLabelBySlug[optionValue] ?? optionValue;
            }}
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
            value={selectedYear}
            onChange={onYearChange}
            placeholder={t("editor.companies.allYears")}
            getOptionLabel={(optionValue) =>
              optionValue ? optionValue : t("editor.companies.allYears")
            }
            triggerClassName="min-w-[120px]"
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={refreshDisabled}
        >
          {t("common.refresh")}
        </Button>
      </div>
    </SearchAndFiltersCard>
  );
}

