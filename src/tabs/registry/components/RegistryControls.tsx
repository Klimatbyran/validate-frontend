import { BookDownIcon, PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/ui/button";
import { useI18n } from "@/contexts/I18nContext";

interface RegistryControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onAddEntry: () => void;
  onRunReports: () => void;
  isRunReportsDisabled: boolean;
  onExport: () => void;
  isExportDisabled: boolean;
  onDeleteSelected: () => void;
  isDeleteDisabled: boolean;
  selectedCount: number;
  isDeletingSelected: boolean;
}

const RegistryControls = ({
  query,
  onQueryChange,
  onRefresh,
  isRefreshing,
  onAddEntry,
  onRunReports,
  isRunReportsDisabled,
  onExport,
  isExportDisabled,
  onDeleteSelected,
  isDeleteDisabled,
  selectedCount,
  isDeletingSelected,
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
        <Button
          size="sm"
          variant="secondary"
          onClick={onAddEntry}
        >
          {t("registry.addEntry")}
          <PlusCircle className="w-4 h-4 ml-2" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-blue-04 text-white hover:bg-blue-4 active:bg-blue-04/80"
          onClick={onRunReports}
          disabled={isRunReportsDisabled}
        >
          {`${t("registry.runReports")} (${selectedCount})`}
        </Button>
        <Button size="sm" onClick={onExport} disabled={isExportDisabled}>
          {t("registry.exportCsv")}
          <BookDownIcon className="w-4 h-4 ml-2" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-red-400 text-white hover:bg-red-500/90 active:bg-red-500/80"
          onClick={onDeleteSelected}
          disabled={isDeleteDisabled || isDeletingSelected}
        >
          {`${t("registry.deleteSelected")} (${selectedCount})`}
        </Button>
      </div>
    </div>
  );
};

export default RegistryControls;
