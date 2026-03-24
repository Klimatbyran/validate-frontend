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
    <tr className="transition-colors hover:bg-gray-03/30">
      <td className="px-4 py-3 text-sm text-gray-01">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-semibold truncate">{entry.companyName}</span>
          <span className="text-xs text-gray-02">
            {t("registry.wikidataId")}:{" "}
            {entry.wikidataId ?? t("registry.unknownId")}
          </span>
          {entry.wikidataId && (
            <a
              href={`https://www.wikidata.org/wiki/${entry.wikidataId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-blue-04 text-xs text-gray-02"
            >
              {t("registry.openOnWikidata")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-02">{entry.reportYear}</td>
      <td className="px-4 py-3 text-sm text-gray-02 max-w-[22rem]">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-blue-04 min-w-0"
          title={entry.url}
        >
          <span className="truncate">
            {entry.url.length > 52 ? `${entry.url.slice(0, 52)}...` : entry.url}
          </span>
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
        </a>
      </td>
      <td className="px-4 py-3 text-sm text-gray-02">
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
      </td>
    </tr>
  );
};

export default RegistryResultItem;
