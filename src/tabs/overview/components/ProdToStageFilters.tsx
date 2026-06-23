import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { SearchAndFiltersCard } from "@/ui/search-and-filters-card";
import type { OverviewData } from "../hooks/useOverviewData";
import {
  OverviewReportYearFilter,
  OverviewSearchField,
  OverviewTagFilter,
} from "./OverviewSharedFilterFields";

type Props = {
  data: OverviewData;
};

export function ProdToStageFilters({ data }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);

  return (
    <SearchAndFiltersCard
      title={t("overview.filtersTitle")}
      open={open}
      onOpenChange={setOpen}
    >
      <OverviewSearchField
        value={data.prodToStageFilters.searchQuery}
        onChange={(searchQuery) =>
          data.patchProdToStageFilters({ searchQuery })
        }
      />

      <div className="flex flex-wrap gap-4 items-end">
        <OverviewReportYearFilter
          years={data.prodToStageDistinctYears}
          selectedYears={data.prodToStageFilters.reportYears}
          onChange={(reportYears) =>
            data.patchProdToStageFilters({ reportYears })
          }
          labelKey="overview.companyReportYearFilter"
        />

        <OverviewTagFilter
          tagOptions={data.tagOptions}
          tagLabelBySlug={data.tagLabelBySlug}
          selectedSlugs={data.prodToStageFilters.tagSlugs}
          onChange={(tagSlugs) => data.patchProdToStageFilters({ tagSlugs })}
        />

        <label className="flex items-center gap-2 text-xs text-gray-01 cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={data.prodToStageFilters.runnableOnly}
            onChange={(event) =>
              data.patchProdToStageFilters({
                runnableOnly: event.target.checked,
              })
            }
            className="rounded border-gray-03"
          />
          {t("overview.prodToStage.runnableOnly")}
        </label>
      </div>
    </SearchAndFiltersCard>
  );
}
