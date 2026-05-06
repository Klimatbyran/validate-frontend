import { Button } from "@/ui/button";
import { BookDownIcon, PlayCircle, WandIcon, Heart } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { SelectedReport } from "../lib/crawler-types";

interface ControlsBaseProps {
  onSearch: () => void;
  onExport: () => void;
  handleAddToRegistryClick?: () => void;
  onRunSelectedReports?: () => void;
  isSearchDisabled: boolean;
  selectedReports: SelectedReport[];
}

const ControlsBase = ({
  onSearch,
  onExport,
  isSearchDisabled,
  selectedReports,
  handleAddToRegistryClick,
  onRunSelectedReports,
}: ControlsBaseProps) => {
  const { t } = useI18n();
  return (
    <div className="w-full flex justify-between">
      <Button size={"sm"} onClick={onSearch} disabled={isSearchDisabled}>
        {t("crawler.search")}
        <WandIcon className="w-4 h-4 ml-4" />
      </Button>
      <div className="flex flex-wrap gap-3 justify-end">
        <Button
          size="sm"
          onClick={handleAddToRegistryClick}
          disabled={!selectedReports.length}
        >
          {t("crawler.addToRegistry")}
          <Heart className="w-4 h-4 ml-2" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-blue-04 text-white hover:bg-blue-4 active:bg-blue-04/80"
          onClick={onRunSelectedReports}
          disabled={!selectedReports.length}
        >
          {t("crawler.runSelectedReports")}
          <PlayCircle className="w-4 h-4 ml-2" />
        </Button>
        <Button
          size={"sm"}
          onClick={onExport}
          disabled={!selectedReports.length}
        >
          {t("crawler.exportCsv")}
          <BookDownIcon className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ControlsBase;
