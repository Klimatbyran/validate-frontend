import { Button } from "@/ui/button";
import { BookDownIcon, WandIcon, Heart } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { SelectedReport } from "../lib/crawler-types";

interface ControlsBaseProps {
  onSearch: () => void;
  onExport: () => void;
  isSearchDisabled: boolean;
  selectedReports: SelectedReport[];
}

const ControlsBase = ({
  onSearch,
  onExport,
  isSearchDisabled,
  selectedReports,
}: ControlsBaseProps) => {
  const { t } = useI18n();
  return (
    <div className="w-full flex justify-between">
      <Button size={"sm"} onClick={onSearch} disabled={isSearchDisabled}>
        {t("crawler.search")}
        <WandIcon className="w-4 h-4 ml-4" />
      </Button>
      <div className="flex gap-6">
        <Button
          size="sm"
          onClick={() => console.log(selectedReports)}
          disabled={!selectedReports.length}
        >
          {t("crawler.waitingRoom")}
          <Heart className="w-4 h-4 ml-2" />
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
