import ControlsBase from "./ControlsBase";
import { useI18n } from "@/contexts/I18nContext";

interface DatabaseSearchControlsProps {
  onReportYearChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  isSearchDisabled: boolean;
  isLockDisabled: boolean;
  onLockReports: () => void;
  selectedReports: Record<string, string>;
  onExport: () => void;
  isExportDisabled: boolean;
}

const DatabaseSearchControls = ({
  onReportYearChange,
  onSearch,
  isSearchDisabled,
  isLockDisabled,
  onLockReports,
  onExport,
  isExportDisabled,
}: DatabaseSearchControlsProps) => {
  const { t } = useI18n();

  return (
    <>
      <h3 className="mb-4">{t("crawler.databaseControlsDescription")}</h3>
      <input
        required
        onChange={onReportYearChange}
        placeholder="Ex. 2025"
        className="bg-gray-03/20 w-48 border p-2 mb-4 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
      />
      <ControlsBase
        onSearch={onSearch}
        onExport={onExport}
        isSearchDisabled={isSearchDisabled}
        isExportDisabled={isExportDisabled}
        isLockDisabled={isLockDisabled}
        onLockReports={onLockReports}
      />
    </>
  );
};

export default DatabaseSearchControls;
