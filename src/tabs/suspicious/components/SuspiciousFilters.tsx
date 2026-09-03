import { Search } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { ViewModePills } from "@/ui/view-mode-pills";
import {
  SUSPICION_SEVERITIES,
  type SuspicionOrigin,
  type SuspicionRuleId,
  type SuspicionSeverity,
} from "../types";
import { ruleLabelKey, severityLabelKey } from "../lib/finding-display";
import type { SuspicionFilters } from "../lib/filters";

const fieldLabelClass = "text-xs text-gray-02 uppercase tracking-wide";

type OriginFilter = SuspicionOrigin | "all";

export function SuspiciousFiltersBar({
  filters,
  onChange,
  availableDataYears,
  availableRules,
  availableTags,
}: {
  filters: SuspicionFilters;
  onChange: (filters: SuspicionFilters) => void;
  availableDataYears: number[];
  availableRules: SuspicionRuleId[];
  availableTags: string[];
}) {
  const { t } = useI18n();

  const originOptions: Array<{ value: OriginFilter; label: string }> = [
    { value: "all", label: t("suspicious.origin.all") },
    { value: "ai", label: t("suspicious.origin.ai") },
    { value: "verified", label: t("suspicious.origin.verified") },
  ];

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col gap-1">
        <label className={fieldLabelClass}>
          {t("suspicious.filters.origin")}
        </label>
        <ViewModePills
          options={originOptions}
          value={filters.origin}
          onValueChange={(origin) => onChange({ ...filters, origin })}
          ariaLabel={t("suspicious.filters.origin")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={fieldLabelClass}>{t("yearLabels.dataYear")}</label>
        <SingleSelectDropdown
          options={["", ...availableDataYears.map(String)]}
          value={filters.dataYear === null ? "" : String(filters.dataYear)}
          onChange={(value) =>
            onChange({ ...filters, dataYear: value ? Number(value) : null })
          }
          getOptionLabel={(value) =>
            value ? value : t("suspicious.filters.allYears")
          }
          placeholder={t("suspicious.filters.allYears")}
          ariaLabel={t("yearLabels.dataYear")}
          panelMinWidth={120}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={fieldLabelClass}>
          {t("suspicious.filters.severity")}
        </label>
        <MultiSelectDropdown
          options={[...SUSPICION_SEVERITIES]}
          selectedIds={filters.severities}
          onChange={(ids) =>
            onChange({ ...filters, severities: ids as SuspicionSeverity[] })
          }
          getOptionLabel={(id) => t(severityLabelKey(id as SuspicionSeverity))}
          triggerLabel={t("suspicious.filters.severity")}
          emptyLabel={t("suspicious.filters.allSeverities")}
          panelMinWidth={180}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={fieldLabelClass}>
          {t("suspicious.filters.rule")}
        </label>
        <MultiSelectDropdown
          options={availableRules}
          selectedIds={filters.rules}
          onChange={(ids) =>
            onChange({ ...filters, rules: ids as SuspicionRuleId[] })
          }
          getOptionLabel={(id) => t(ruleLabelKey(id as SuspicionRuleId))}
          triggerLabel={t("suspicious.filters.rule")}
          emptyLabel={t("suspicious.filters.allRules")}
          panelMinWidth={280}
          panelMaxHeight={340}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={fieldLabelClass}>{t("editor.companies.tags")}</label>
        <MultiSelectDropdown
          options={availableTags}
          selectedIds={filters.tags}
          onChange={(tags) => onChange({ ...filters, tags })}
          triggerLabel={t("editor.companies.tags")}
          emptyLabel={t("editor.companies.allTags")}
          panelMinWidth={220}
          panelMaxHeight={320}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={fieldLabelClass}>{t("common.search")}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-02" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
            placeholder={t("suspicious.filters.searchPlaceholder")}
            className="h-12 w-64 rounded-md border border-gray-02/15 bg-gray-03/50 pl-9 pr-3 text-sm text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-1 focus:ring-blue-03"
          />
        </div>
      </div>
    </div>
  );
}
