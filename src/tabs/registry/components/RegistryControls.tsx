import { BookDownIcon, RefreshCw } from "lucide-react";
import { Button } from "@/ui/button";
import { useI18n } from "@/contexts/I18nContext";

interface RegistryControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExport: () => void;
  isExportDisabled: boolean;
}

const RegistryControls = ({
  query,
  onQueryChange,
  onRefresh,
  isRefreshing,
  onExport,
  isExportDisabled,
}: RegistryControlsProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("registry.searchPlaceholder")}
          className="bg-gray-03/20 w-full border p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {t("common.refresh")}
          <RefreshCw className="w-4 h-4 ml-2" />
        </Button>
        <Button size="sm" onClick={onExport} disabled={isExportDisabled}>
          {t("registry.exportCsv")}
          <BookDownIcon className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default RegistryControls;
