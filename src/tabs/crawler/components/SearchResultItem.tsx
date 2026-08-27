import { useEffect, useState } from "react";
import {
  Book,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import {
  CompanyReport,
  CRAWL_UNREACHABLE_MESSAGE,
  Report,
  sanitizeCrawlErrorMessage,
  SEARCH_REPORT_JOB_TIMEOUT_MESSAGE,
} from "../lib/crawler-types";
import { useI18n } from "@/contexts/I18nContext";
import { CopyButton } from "@/ui/copy-button";
import ManuallyAddReportItem from "./ManuallyAddReportItem";

interface SearchResultItemProps {
  companyReport: CompanyReport;
  selectedReport?: string;
  onSelect: (companyName: string, url: string | null) => void;
  /** When true, result links are expanded on first render (e.g. coverage find-report modal). */
  initialExpanded?: boolean;
  /** Flatter layout for use inside dialogs (no nested cards). */
  variant?: "default" | "embedded";
}

function reportLabel(
  result: Report,
  unknownType: string,
  unknownYear: string,
  accessFailed: string,
) {
  if (result.fetchFailed) return accessFailed;
  const type = result.reportType?.trim() || unknownType;
  const year = result.reportYear?.trim() || unknownYear;
  return `${type} · ${year}`;
}

function crawlStatusText(
  t: (key: string, params?: Record<string, string | number>) => string,
  crawlError: string | undefined,
  resultCount: number,
): string {
  if (!crawlError) return t("crawler.foundReportLinks", { count: resultCount });
  if (crawlError === SEARCH_REPORT_JOB_TIMEOUT_MESSAGE) {
    return t("crawler.crawlTimedOut");
  }
  if (crawlError === CRAWL_UNREACHABLE_MESSAGE) {
    return t("crawler.crawlRequestFailed");
  }
  return t("crawler.crawlFailedDetail", {
    error: sanitizeCrawlErrorMessage(crawlError),
  });
}

const SearchResultItem = ({
  companyReport,
  selectedReport,
  onSelect,
  initialExpanded = false,
  variant = "default",
}: SearchResultItemProps) => {
  const { t } = useI18n();
  const { companyName, results } = companyReport;
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(
    initialExpanded || variant === "embedded",
  );

  useEffect(() => {
    if ((results?.length ?? 0) > 0) {
      setIsDialogOpen(true);
    }
  }, [results?.length]);

  const handleReportSelect = (url: string) => {
    if (selectedReport === url) {
      onSelect(companyName, null);
    } else {
      onSelect(companyName, url);
    }
  };

  const resultRows = (
    <>
      <ManuallyAddReportItem
        companyName={companyName}
        selectedReport={selectedReport}
        onSelect={onSelect}
        variant={variant}
      />

      {(results ?? []).map((result, index) => (
        <div
          key={`${result.url}-${index}`}
          className={
            variant === "embedded"
              ? "flex flex-col gap-3 border-b border-gray-03/60 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
              : "flex w-full items-center justify-between border-b border-gray-03 px-4 py-3"
          }
        >
          <div
            className={
              variant === "embedded"
                ? "flex min-w-0 flex-1 items-start gap-2"
                : "flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-02"
            }
          >
            <span className="shrink-0 text-sm text-gray-02">{index + 1}.</span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  result.fetchFailed ? "text-orange-03" : "text-gray-01"
                }`}
              >
                {reportLabel(
                  result,
                  t("crawler.otherReport"),
                  t("crawler.unknownYear"),
                  t("crawler.accessFailed"),
                )}
              </p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                <a
                  href={result.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-all text-xs text-gray-02 hover:text-blue-04"
                >
                  {variant === "embedded"
                    ? result.url
                    : `${result?.url?.substring(0, 100) ?? ""}...`}
                </a>
                <a
                  href={result.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center text-gray-02 hover:text-blue-04"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <CopyButton
                  getText={() => String(result.url ?? "")}
                  className="shrink-0 whitespace-nowrap border-gray-03/70 bg-gray-03/20 px-2 py-0.5 text-gray-02 hover:bg-gray-03/40"
                />
              </div>
            </div>
          </div>
          {!result.fetchFailed ? (
            <button
              type="button"
              className="shrink-0 self-start sm:self-center"
              onClick={() => handleReportSelect(result.url as string)}
            >
              <CheckCircle2
                className={`${selectedReport === result.url ? "text-green-03" : "text-gray-02"} h-6 w-6`}
              />
            </button>
          ) : null}
        </div>
      ))}
    </>
  );

  if (variant === "embedded") {
    return (
      <div className="space-y-1">
        <div className="mb-3 flex items-center gap-2 border-b border-gray-03/60 pb-3">
          <Book className="h-4 w-4 text-gray-02" />
          <div>
            <h3 className="font-semibold text-gray-01">{companyName}</h3>
            <p
              className={`text-xs ${
                companyReport.crawlError ? "text-pink-03" : "text-gray-02"
              }`}
            >
              {crawlStatusText(t, companyReport.crawlError, results.length)}
            </p>
          </div>
        </div>
        {resultRows}
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-[20px] bg-gray-04/80 backdrop-blur-sm hover:shadow-md transition-shadow">
      <div className="flex w-full items-center justify-between border-b border-gray-03 bg-gray-03/50 px-4 py-3">
        <button
          onClick={() => setIsDialogOpen(!isDialogOpen)}
          className="flex w-full items-center gap-3 transition-opacity hover:opacity-70"
        >
          {isDialogOpen ? (
            <ChevronDown className="h-5 w-5 text-gray-02" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-02" />
          )}

          <div className="w-full text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Book className="h-4 w-4 text-white" />
                <h3 className="font-bold text-gray-01">{companyName}</h3>
              </div>
            </div>
            <div
              className={`mt-1 flex items-center gap-2 text-xs ${
                companyReport.crawlError ? "text-pink-03" : "text-gray-02"
              }`}
            >
              {crawlStatusText(t, companyReport.crawlError, results.length)}
            </div>
          </div>
        </button>
      </div>
      <div className="overflow-hidden rounded-[20px] bg-gray-04/80 backdrop-blur-sm hover:shadow-md transition-shadow">
        {isDialogOpen && resultRows}
      </div>
    </div>
  );
};

export default SearchResultItem;
