import { WandIcon } from "lucide-react";
import { Button } from "@/ui/button";
import { useI18n } from "@/contexts/I18nContext";

interface ManualSearchControlsProps {
  onCompanyNamesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onReportYearChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  isSearchDisabled: boolean;
}

const ManualSearchControls = ({
  onCompanyNamesChange,
  onReportYearChange,
  onSearch,
  isSearchDisabled,
}: ManualSearchControlsProps) => {
  const { t } = useI18n();

  return (
    <>
      <h3>{t("crawler.manualSearchDescription")}</h3>
      <div className="flex flex-col gap-4 justify-center">
        <div className="flex flex-col gap-2">
          <textarea
            onChange={onCompanyNamesChange}
            placeholder="Search for companies (separate with commas)"
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
        <Button size={"sm"} onClick={onSearch} disabled={isSearchDisabled}>
          {t("crawler.search")}
          <WandIcon className="w-4 h-4 ml-4" />
        </Button>
      </div>
    </>
  );
};

export default ManualSearchControls;
