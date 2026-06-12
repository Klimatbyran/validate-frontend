import { useI18n } from "@/contexts/I18nContext";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import type { TagOption } from "@/tabs/editor/lib/types";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function OverviewSearchField({ value, onChange }: SearchFieldProps) {
  const { t } = useI18n();

  return (
    <div>
      <label className="block text-xs font-medium text-gray-02 mb-1">
        {t("overview.searchLabel")}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("overview.searchPlaceholder")}
        className="w-full max-w-md px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03"
      />
    </div>
  );
}

type ReportYearFilterProps = {
  years: string[];
  selectedYears: string[];
  onChange: (years: string[]) => void;
};

export function OverviewReportYearFilter({
  years,
  selectedYears,
  onChange,
}: ReportYearFilterProps) {
  const { t } = useI18n();

  return (
    <div>
      <label className="block text-xs font-medium text-gray-02 mb-1">
        {t("overview.reportYearFilter")}
      </label>
      <MultiSelectDropdown
        options={years}
        selectedIds={selectedYears}
        onChange={onChange}
        triggerLabel={t("overview.reportYearFilter")}
        getOptionLabel={(year) => year}
        triggerClassName="min-w-[160px]"
      />
    </div>
  );
}

type TagFilterProps = {
  tagOptions: TagOption[];
  tagLabelBySlug: Record<string, string>;
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
};

export function OverviewTagFilter({
  tagOptions,
  tagLabelBySlug,
  selectedSlugs,
  onChange,
}: TagFilterProps) {
  const { t } = useI18n();

  return (
    <div>
      <label className="block text-xs font-medium text-gray-02 mb-1">
        {t("overview.tagFilter")}
      </label>
      <MultiSelectDropdown
        options={tagOptions.map((option) => option.slug)}
        selectedIds={selectedSlugs}
        onChange={onChange}
        triggerLabel={t("overview.tagFilter")}
        getOptionLabel={(slug) => tagLabelBySlug[slug] ?? slug}
        triggerClassName="min-w-[180px]"
      />
    </div>
  );
}
