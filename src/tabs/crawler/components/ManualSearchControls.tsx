import ControlsBase from "./ControlsBase";
import { useI18n } from "@/contexts/I18nContext";

interface ManualSearchControlsProps {
  onCompanyNamesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onReportYearChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  onExport: () => void;
  isSearchDisabled: boolean;
  isExportDisabled: boolean;
  isLockDisabled: boolean;
  onLockReports: () => void;
  selectedReports: Record<string, string>;
}

const ManualSearchControls = ({
  onCompanyNamesChange,
  onReportYearChange,
  onSearch,
  onExport,
  isSearchDisabled,
  isExportDisabled,
  onLockReports,
  isLockDisabled,
}: ManualSearchControlsProps) => {
  const { t } = useI18n();

  return (
    <>
      <h3 className="max-w-[750px]">{t("crawler.manualSearchDescription")}</h3>
      <div className="flex flex-col gap-4 justify-center mt-4">
        <div className="flex flex-col gap-2">
          <textarea
            onChange={onCompanyNamesChange}
            placeholder={t("crawler.searchPlaceholder")}
            className="bg-gray-03/20 w-[500px] h-[100px] border p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
          />
          <h3 className="pt-4">{t("crawler.reportYear")}</h3>
          <input
            required
            onChange={onReportYearChange}
            placeholder="Ex. 2025"
            className="bg-gray-03/20 w-48 border p-2 mb-4 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
          />
        </div>
        <ControlsBase
          onSearch={onSearch}
          onExport={onExport}
          isSearchDisabled={isSearchDisabled}
          isExportDisabled={isExportDisabled}
          isLockDisabled={isLockDisabled}
          onLockReports={onLockReports}
        />
      </div>
    </>
  );
};

export default ManualSearchControls;
