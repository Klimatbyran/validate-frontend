import { Check, ClipboardCopy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import type { AutoSearchStats } from "../lib/crawler-types";
import {
  autoSearchLogToJson,
  buildAutoSearchLog,
} from "../lib/auto-search-log";

/**
 * Copy/download the diagnostic log of companies whose report was not saved in
 * the last auto-search run. Renders nothing when every requested company was
 * resolved. Shared by the results modal and the Crawler tab header.
 */
export default function AutoSearchLogButton({
  stats,
  reportYear,
  variant = "secondary",
}: {
  stats: AutoSearchStats;
  reportYear: string;
  variant?: "secondary" | "outline";
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const { json, notFoundCount } = useMemo(() => {
    const log = buildAutoSearchLog(stats, reportYear);
    return {
      json: autoSearchLogToJson(log),
      notFoundCount: log.entries.length,
    };
  }, [stats, reportYear]);

  if (notFoundCount === 0) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Fallback for environments without the async clipboard API.
      const area = document.createElement("textarea");
      area.value = json;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `auto-search-log-${reportYear}-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={handleCopy}
        title={t("crawler.autoSearchLogHint")}
      >
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <ClipboardCopy className="w-4 h-4" />
        )}
        {copied
          ? t("crawler.autoSearchLogCopied")
          : t("crawler.autoSearchLog", { count: notFoundCount })}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        title={t("crawler.autoSearchLogDownload")}
        aria-label={t("crawler.autoSearchLogDownload")}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
}
