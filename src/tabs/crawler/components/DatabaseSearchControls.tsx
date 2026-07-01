import ControlsBase from "./ControlsBase";
import type { SelectedReport } from "../lib/crawler-types";
import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";

interface DatabaseSearchControlsProps {
  onReportYearChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onSearch: () => void;
  isSearchDisabled: boolean;
  selectedReports: SelectedReport[];
  onExport: () => void;
  filterEnabled: boolean;
  setFilterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  filterYear: number | null;
  setFilterYear: React.Dispatch<React.SetStateAction<number | null>>;
  searchYear: string;
  handleAddToRegistryClick?: () => void;
  onRunSelectedReports?: () => void;
  tagOptions: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const DatabaseSearchControls = ({
  onReportYearChange,
  onSearch,
  isSearchDisabled,
  selectedReports,
  onExport,
  filterEnabled,
  setFilterEnabled,
  setFilterYear,
  searchYear,
  handleAddToRegistryClick,
  onRunSelectedReports,
  tagOptions,
  selectedTags,
  onTagsChange,
}: DatabaseSearchControlsProps) => {
  const { t } = useI18n();

  const [filterInput, setFilterInput] = useState("");
  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-gray-02">{t("crawler.filterDescription")}</p>
        <div className="flex flex-wrap gap-4 mb-4">
          <input
            type="text"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            placeholder={t("errors.year")}
            className="bg-gray-03 w-32 border p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
          />
          <button
            type="button"
            className={`px-3 rounded-lg border ${filterEnabled ? "bg-orange-500/10 text-white" : "bg-gray-03 text-gray-01"}`}
            onClick={() => {
              if (filterEnabled) {
                setFilterEnabled(false);
                setFilterYear(null);
              } else {
                const year = parseInt(filterInput, 10);
                if (!isNaN(year) && filterInput.trim().length === 4) {
                  setFilterYear(year);
                  setFilterEnabled(true);
                } else {
                  // Optionally show feedback for invalid input
                  setFilterInput("");
                  setFilterEnabled(false);
                  setFilterYear(null);
                }
              }
            }}
          >
            {filterEnabled
              ? t("crawler.filterDisable")
              : t("crawler.filterEnable")}
          </button>
        </div>
        {tagOptions.length > 0 && (
          <div className="flex items-center gap-3 mb-8">
            <span className="text-sm text-gray-02 shrink-0">
              {t("crawler.filterByTags")}
            </span>
            <MultiSelectDropdown
              options={tagOptions}
              selectedIds={selectedTags}
              onChange={onTagsChange}
              triggerLabel={
                selectedTags.length > 0
                  ? t("crawler.tagsSelected", { count: selectedTags.length })
                  : t("crawler.allTags")
              }
              emptyLabel={t("crawler.noTags")}
              triggerClassName="min-w-[180px]"
            />
            {selectedTags.length > 0 && (
              <button
                className="text-xs text-gray-02 hover:text-gray-01 underline"
                onClick={() => onTagsChange([])}
              >
                {t("crawler.clearTagFilter")}
              </button>
            )}
          </div>
        )}
      </div>
      <h3 className="text-gray-02">
        {t("crawler.databaseControlsDescription")}
      </h3>
      <div className="flex items-center">
        <input
          required
          onChange={onReportYearChange}
          value={searchYear}
          placeholder="Ex. 2025"
          className="bg-gray-03/20 w-48 border mr-4 p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
        />
        <ControlsBase
          onSearch={onSearch}
          onExport={onExport}
          isSearchDisabled={isSearchDisabled}
          selectedReports={selectedReports}
          handleAddToRegistryClick={handleAddToRegistryClick}
          onRunSelectedReports={onRunSelectedReports}
        />
      </div>
    </>
  );
};

export default DatabaseSearchControls;
