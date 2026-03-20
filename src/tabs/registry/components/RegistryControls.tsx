import { Search, X } from "lucide-react";
import { Button } from "@/ui/button";
import { useI18n } from "@/contexts/I18nContext";

interface RegistryControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  isLoading: boolean;
}

const RegistryControls = ({
  query,
  onQueryChange,
  onSearch,
  onClear,
  isLoading,
}: RegistryControlsProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
            }
          }}
          placeholder={t("registry.searchPlaceholder")}
          className="bg-gray-03/20 w-full border p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
        />

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onSearch}
            disabled={isLoading || query.trim().length === 0}
          >
            {t("registry.search")}
            <Search className="w-4 h-4 ml-2" />
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onClear}
            disabled={query.trim().length === 0}
          >
            {t("registry.clear")}
            <X className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegistryControls;
