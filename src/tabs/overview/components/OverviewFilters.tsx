import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SearchAndFiltersCard } from "@/ui/search-and-filters-card";
import type { OverviewData } from "../hooks/useOverviewData";
import {
  statusColumnsForView,
  type OverviewStatusColumn,
} from "../lib/overview-types";
import {
  OverviewReportYearFilter,
  OverviewSearchField,
  OverviewTagFilter,
} from "./OverviewSharedFilterFields";

type Props = {
  data: OverviewData;
};

function GapCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-01 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-gray-03"
      />
      {label}
    </label>
  );
}

export function OverviewFilters({ data }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const statusColumnOptions = statusColumnsForView(data.viewMode);

  return (
    <SearchAndFiltersCard
      title={t("overview.filtersTitle")}
      open={open}
      onOpenChange={setOpen}
    >
      <OverviewSearchField
        value={data.filters.searchQuery}
        onChange={(searchQuery) => data.patchFilters({ searchQuery })}
      />

      <div className="flex flex-wrap gap-4">
        <OverviewReportYearFilter
          years={data.distinctReportYears}
          selectedYears={data.filters.reportYears}
          onChange={(reportYears) => data.patchFilters({ reportYears })}
          labelKey={
            data.viewMode === "registryReports"
              ? "overview.reportYearFilter"
              : "overview.companyReportYearFilter"
          }
        />

        {data.viewMode === "companyYears" ? (
          <OverviewTagFilter
            tagOptions={data.tagOptions}
            tagLabelBySlug={data.tagLabelBySlug}
            selectedSlugs={data.filters.tagSlugs}
            onChange={(tagSlugs) => data.patchFilters({ tagSlugs })}
          />
        ) : null}

        <div>
          <label className="block text-xs font-medium text-gray-02 mb-1">
            {t("overview.issueFilter")}
          </label>
          <MultiSelectDropdown
            options={statusColumnOptions}
            selectedIds={data.filters.statusFilters.filter((column) =>
              statusColumnOptions.includes(column),
            )}
            onChange={(columns) =>
              data.patchFilters({
                statusFilters: columns as OverviewStatusColumn[],
              })
            }
            triggerLabel={t("overview.issueFilter")}
            getOptionLabel={(column) =>
              t(`overview.columns.${column as OverviewStatusColumn}`)
            }
            triggerClassName="min-w-[200px]"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-gray-03/50">
        <p className="text-xs font-medium text-gray-02 mb-2">
          {t("overview.gapFiltersTitle")}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {data.viewMode === "companyYears" ? (
            <GapCheckbox
              checked={data.filters.missingRegistryOnly}
              onChange={(checked) =>
                data.patchFilters({ missingRegistryOnly: checked })
              }
              label={t("overview.gapFilters.missingRegistry")}
            />
          ) : null}
          <GapCheckbox
            checked={data.filters.missingCompanyReportOnly}
            onChange={(checked) =>
              data.patchFilters({ missingCompanyReportOnly: checked })
            }
            label={t("overview.gapFilters.missingCompanyReport")}
          />
          <GapCheckbox
            checked={data.filters.notRunInPipelineOnly}
            onChange={(checked) =>
              data.patchFilters({ notRunInPipelineOnly: checked })
            }
            label={t("overview.gapFilters.notRunInPipeline")}
          />
        </div>
        <p className="text-[11px] text-gray-02 mt-2">
          {data.viewMode === "companyYears"
            ? t("overview.gapFiltersHintCompanyYears")
            : t("overview.gapFiltersHintRegistryReports")}
        </p>
      </div>
    </SearchAndFiltersCard>
  );
}
