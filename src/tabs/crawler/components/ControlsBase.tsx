import { Button } from "@/ui/button";
import {
  BookDownIcon,
  PlayCircle,
  WandIcon,
  Heart,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { SelectedReport } from "../lib/crawler-types";

interface ControlsBaseProps {
  onSearch: () => void;
  onAutoSearch?: () => void;
  isAutoSearchRunning?: boolean;
  onExport: () => void;
  handleAddToRegistryClick?: () => void;
  onRunSelectedReports?: () => void;
  isSearchDisabled: boolean;
  selectedReports: SelectedReport[];
}

const ControlsBase = ({
  onSearch,
  onAutoSearch,
  isAutoSearchRunning = false,
  onExport,
  isSearchDisabled,
  selectedReports,
  handleAddToRegistryClick,
  onRunSelectedReports,
}: ControlsBaseProps) => {
  const { t } = useI18n();
  return (
    <div className="w-full flex justify-between">
      <div className="flex flex-wrap gap-3">
        <Button size={"sm"} onClick={onSearch} disabled={isSearchDisabled}>
          {t("crawler.search")}
          <WandIcon className="w-4 h-4 ml-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAutoSearch?.()}
          disabled={isSearchDisabled || isAutoSearchRunning || !onAutoSearch}
        >
          {t("crawler.autoSearch")}
          <Sparkles className="w-4 h-4 ml-2" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 justify-end">
        <Button
          size="sm"
          onClick={handleAddToRegistryClick}
          disabled={!selectedReports.length}
          className="!text-xs !leading-snug max-w-none"
        >
          {t("crawler.addToRegistry")}
          <Heart className="w-4 h-4 ml-2 shrink-0" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-blue-04 text-white hover:bg-blue-4 active:bg-blue-04/80 !text-xs !leading-snug max-w-none"
          onClick={onRunSelectedReports}
          disabled={!selectedReports.length}
        >
          {t("crawler.runSelectedReports")}
          <PlayCircle className="w-4 h-4 ml-2 shrink-0" />
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
