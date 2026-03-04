import { Button } from "@/ui/button";
import { BookDownIcon, WandIcon, LockIcon } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface ControlsBaseProps {
  onSearch: () => void;
  onExport: () => void;
  isSearchDisabled: boolean;
  isExportDisabled: boolean;
  isLockDisabled: boolean;
  onLockReports: () => void;
}

const ControlsBase = ({
  onSearch,
  onExport,
  isSearchDisabled,
  isExportDisabled,
  isLockDisabled,
  onLockReports,
}: ControlsBaseProps) => {
  const { t } = useI18n();
  return (
    <div className="w-full flex justify-between">
      <Button size={"sm"} onClick={onSearch} disabled={isSearchDisabled}>
        {t("crawler.search")}
        <WandIcon className="w-4 h-4 ml-4" />
      </Button>
      <div className="flex gap-6">
        <Button size="sm" onClick={onLockReports} disabled={isLockDisabled}>
          {t("crawler.lockReports")}
          <LockIcon className="w-4 h-4 ml-2" />
        </Button>
        <Button size={"sm"} onClick={onExport} disabled={isExportDisabled}>
          {t("crawler.exportCsv")}
          <BookDownIcon className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ControlsBase;
