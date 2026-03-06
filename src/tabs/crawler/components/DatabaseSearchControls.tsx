import ControlsBase from "./ControlsBase";
import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";

interface DatabaseSearchControlsProps {
  onReportYearChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onSearch: () => void;
  isSearchDisabled: boolean;
  isLockDisabled: boolean;
  onLockReports: () => void;
  selectedReports: Record<string, string>;
  onExport: () => void;
  isExportDisabled: boolean;
  filterEnabled: boolean;
  setFilterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  filterYear: number | null;
  setFilterYear: React.Dispatch<React.SetStateAction<number | null>>;
  searchYear: string;
}

const DatabaseSearchControls = ({
  onReportYearChange,
  onSearch,
  isSearchDisabled,
  isLockDisabled,
  onLockReports,
  onExport,
  isExportDisabled,
  filterEnabled,
  setFilterEnabled,
  setFilterYear,
  searchYear,
}: DatabaseSearchControlsProps) => {
  const { t } = useI18n();

  const [filterInput, setFilterInput] = useState("");
  return (
    <>
      <h3 className="text-gray-02 mb-8">
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
          isExportDisabled={isExportDisabled}
          isLockDisabled={isLockDisabled}
          onLockReports={onLockReports}
        />
      </div>
      <div className="flex flex-col gap-2 mt-8">
        <p className="text-gray-02">
          Only show companies without a report from the chosen year
        </p>
        <div className="flex gap-4">
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
      </div>
    </>
  );
};

export default DatabaseSearchControls;
