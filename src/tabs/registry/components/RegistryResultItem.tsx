import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { RegistryEntry } from "../lib/registry-types";

interface RegistryResultItemProps {
  entry: RegistryEntry;
  selected: boolean;
  onToggleSelect: (entry: RegistryEntry) => void;
}

const RegistryResultItem = ({
  entry,
  selected,
  onToggleSelect,
}: RegistryResultItemProps) => {
  const { t } = useI18n();

  const handleClick = () => {
    onToggleSelect(entry);
  };

  return (
    <div className="w-full px-4 py-3 border-b border-gray-03 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-gray-01 font-semibold truncate">
          {entry.companyName}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-02 mt-1">
          <span>
            {t("registry.wikidataId")}:{" "}
            {entry.wikidataId ?? t("registry.unknownId")}
          </span>
          <span>
            {t("registry.reportYear")}: {entry.reportYear}
          </span>
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-blue-04 min-w-0"
            title={entry.url}
          >
            <span className="truncate">
              {t("registry.reportUrl")}:{" "}
              {entry.url.length > 40
                ? entry.url.slice(0, 40) + "..."
                : entry.url}
            </span>
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
          </a>
          {entry.wikidataId && (
            <a
              href={`https://www.wikidata.org/wiki/${entry.wikidataId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-blue-04"
            >
              {t("registry.openOnWikidata")}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClick}
        aria-pressed={selected}
        aria-label={`${t("registry.selected")}: ${entry.companyName}`}
        className="text-gray-02 hover:text-green-03 transition-colors"
      >
        {selected ? (
          <CheckCircle2 className="w-6 h-6 text-green-03" />
        ) : (
          <Circle className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};

export default RegistryResultItem;
