import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import type { TagOption } from "../lib/types";

export function MultiCompanyFilters({
  years,
  selectedYear,
  onYearChange,
  tagOptions,
  selectedTags,
  onTagsChange,
  onRefresh,
  refreshDisabled,
}: {
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-gray-02">{t("editor.companies.filters")}</span>
      <SingleSelectDropdown
        options={["", ...years]}
        value={selectedYear}
        onChange={onYearChange}
        placeholder={t("editor.companies.allYears")}
        getOptionLabel={(v) => (v ? v : t("editor.companies.allYears"))}
        triggerClassName="min-w-[120px]"
      />
      <MultiSelectDropdown
        options={tagOptions.map((o) => o.slug)}
        selectedIds={selectedTags}
        onChange={onTagsChange}
        triggerLabel={t("editor.companies.tag")}
        getOptionLabel={(id) => tagOptions.find((o) => o.slug === id)?.label ?? id}
        emptyLabel={t("editor.companies.allTags")}
        triggerClassName="min-w-[140px]"
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={onRefresh}
        disabled={refreshDisabled}
      >
        {t("common.refresh")}
      </Button>
    </div>
  );
}

