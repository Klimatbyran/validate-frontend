import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { searchCoverageCompanies } from "@/tabs/overview/lib/coverage-api";
import type {
  CoverageCompanySearchHit,
  CoverageEntry,
  CoverageMatchSaveAction,
} from "@/tabs/overview/lib/coverage-types";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";

type CoverageEntryMatchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CoverageEntry | null;
  onAction: (action: CoverageMatchSaveAction) => Promise<void>;
  isSubmitting?: boolean;
};

export function CoverageEntryMatchDialog({
  open,
  onOpenChange,
  entry,
  onAction,
  isSubmitting = false,
}: CoverageEntryMatchDialogProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoverageCompanySearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !entry) return;
    setQuery(entry.matchedCompany?.name ?? entry.name);
    setSelectedId(null);
    setSearchError(null);
  }, [open, entry]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const handle = window.setTimeout(() => {
      setIsSearching(true);
      setSearchError(null);
      void searchCoverageCompanies(trimmed)
        .then((hits) => {
          setResults(hits);
          if (!entry?.matchedCompany) return;
          const suggested = hits.find(
            (hit) => hit.wikidataId === entry.matchedCompany?.wikidataId,
          );
          if (suggested) setSelectedId(suggested.id);
        })
        .catch((err) => {
          setResults([]);
          setSearchError(err instanceof Error ? err.message : "Search failed");
        })
        .finally(() => setIsSearching(false));
    }, 300);

    return () => window.clearTimeout(handle);
  }, [open, query, entry]);

  const selectedCompany = useMemo(
    () => results.find((hit) => hit.id === selectedId) ?? null,
    [results, selectedId],
  );

  if (!entry) return null;

  const suggestedHit = entry.matchedCompany
    ? results.find((hit) => hit.wikidataId === entry.matchedCompany?.wikidataId)
    : null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      scrollable
      title={t("overview.coverage.editMatchTitle")}
      description={t("overview.coverage.editMatchDescription")}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {entry.matchMethod === "manual" ? (
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => void onAction({ type: "clear" })}
            >
              {t("overview.coverage.clearMatch")}
            </Button>
          ) : entry.status === "ambiguous" ? (
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => void onAction({ type: "markMissing" })}
            >
              {t("overview.coverage.markAsMissing")}
            </Button>
          ) : null}
          {entry.status === "ambiguous" && suggestedHit ? (
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={() =>
                void onAction({
                  type: "match",
                  companyId: suggestedHit.id,
                  companyName: suggestedHit.name,
                })
              }
            >
              {t("overview.coverage.useSuggestedMatch")}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!selectedCompany || isSubmitting}
            onClick={() =>
              selectedCompany
                ? void onAction({
                    type: "match",
                    companyId: selectedCompany.id,
                    companyName: selectedCompany.name,
                  })
                : undefined
            }
          >
            {t("overview.coverage.confirmMatch")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-02">
            {t("overview.coverage.columns.listName")}
          </p>
          <p className="text-sm text-gray-01 font-medium">{entry.name}</p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-gray-02">
            {t("overview.coverage.searchCompanyLabel")}
          </span>
          <input
            className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("overview.coverage.searchCompanyPlaceholder")}
          />
        </label>

        <div className="rounded-md border border-gray-03 max-h-64 overflow-y-auto">
          {isSearching ? (
            <p className="px-3 py-4 text-sm text-gray-02">
              {t("common.loading")}
            </p>
          ) : searchError ? (
            <p className="px-3 py-4 text-sm text-orange-03">{searchError}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-02">
              {query.trim().length < 2
                ? t("overview.coverage.searchMinLength")
                : t("overview.coverage.searchNoResults")}
            </p>
          ) : (
            <ul>
              {results.map((hit) => {
                const isSelected = selectedId === hit.id;
                const isSuggested =
                  hit.wikidataId === entry.matchedCompany?.wikidataId;
                return (
                  <li key={hit.id}>
                    <button
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm border-b border-gray-03/60 hover:bg-gray-04/40 ${
                        isSelected
                          ? "bg-blue-03/10 text-blue-03"
                          : "text-gray-01"
                      }`}
                      onClick={() => setSelectedId(hit.id)}
                    >
                      <span className="font-medium">{hit.name}</span>
                      <span className="ml-2 text-xs text-gray-02">
                        {hit.wikidataId}
                        {isSuggested
                          ? ` · ${t("overview.coverage.suggestedMatch")}`
                          : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
