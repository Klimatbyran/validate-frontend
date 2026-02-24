import { WandIcon } from "lucide-react";
import { Button } from "@/ui/button";
import { useI18n } from "@/contexts/I18nContext";

interface DatabaseSearchControlsProps {
  onReportYearChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  isSearchDisabled: boolean;
}

const DatabaseSearchControls = ({
  onReportYearChange,
  onSearch,
  isSearchDisabled,
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
      <Button size={"sm"} onClick={onSearch} disabled={isSearchDisabled}>
        {t("crawler.search")}
        <WandIcon className="w-4 h-4 ml-4" />
      </Button>
    </>
  );
};

export default DatabaseSearchControls;
