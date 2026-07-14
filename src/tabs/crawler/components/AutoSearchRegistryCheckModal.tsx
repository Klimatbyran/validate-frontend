import { ExternalLink } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Button } from "@/ui/button";
import { reportHrefLinkPillClassName } from "@/lib/report-url-link-pill";
import type { AutoSearchRegistryMatch } from "../lib/auto-search-registry-check";

interface AutoSearchRegistryCheckModalProps {
  open: boolean;
  reportYear: string;
  matches: AutoSearchRegistryMatch[];
  remainingCompanyCount: number;
  excludedCompanies: Set<string>;
  onToggleExclude: (companyName: string) => void;
  onContinue: () => void;
  onCancel: () => void;
}

function reportHref(
  match: AutoSearchRegistryMatch["matches"][number],
): string | null {
  return (
    match.sourceUrl?.trim() || match.s3Url?.trim() || match.url?.trim() || null
  );
}

export default function AutoSearchRegistryCheckModal({
  open,
  reportYear,
  matches,
  remainingCompanyCount,
  excludedCompanies,
  onToggleExclude,
  onContinue,
  onCancel,
}: AutoSearchRegistryCheckModalProps) {
  const { t } = useI18n();

  const handleOpenChange = (next: boolean) => {
    if (!next) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("crawler.autoSearchRegistryCheckTitle")}</DialogTitle>
          <DialogDescription>
            {t("crawler.autoSearchRegistryCheckDescription", { reportYear })}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2 pt-2">
          {matches.map((item) => {
            const excluded = excludedCompanies.has(item.searchedCompanyName);
            const match = item.matches[0];
            const href = match ? reportHref(match) : null;
            const year = match?.reportYear?.trim();

            return (
              <li
                key={item.searchedCompanyName}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  excluded
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-gray-03 bg-gray-03/20"
                }`}
              >
                <span className="text-sm font-medium text-gray-01 truncate min-w-0 flex-1">
                  {item.searchedCompanyName}
                </span>

                {year && (
                  <span className="text-sm text-gray-02 shrink-0 tabular-nums">
                    {year}
                  </span>
                )}

                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${reportHrefLinkPillClassName} shrink-0`}
                  >
                    {t("crawler.reportLink")}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-gray-02 shrink-0">
                    {t("common.placeholderDash")}
                  </span>
                )}

                <Button
                  type="button"
                  variant={excluded ? "secondary" : "ghost"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => onToggleExclude(item.searchedCompanyName)}
                >
                  {excluded
                    ? t("crawler.autoSearchRegistryCheckInclude")
                    : t("crawler.autoSearchRegistryCheckExclude")}
                </Button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t("crawler.autoSearchRegistryCheckCancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onContinue}
            disabled={remainingCompanyCount === 0}
          >
            {remainingCompanyCount === 0
              ? t("crawler.autoSearchRegistryCheckNoCompanies")
              : t("crawler.autoSearchRegistryCheckContinue", {
                  count: remainingCompanyCount,
                })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
