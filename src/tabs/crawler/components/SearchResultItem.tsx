import { useEffect, useState } from "react";
import {
  Book,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { CompanyReport } from "../lib/crawler-types";
import { useI18n } from "@/contexts/I18nContext";
import { generateReportPreviews } from "../lib/crawler-utils";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { CopyButton } from "@/ui/copy-button";
import ReactDOM from "react-dom";
import ManuallyAddReportItem from "./ManuallyAddReportItem";

interface SearchResultItemProps {
  companyReport: CompanyReport;
  selectedReport?: string;
  onSelect: (companyName: string, url: string | null) => void;
  /** When true, result links are expanded on first render (e.g. coverage find-report modal). */
  initialExpanded?: boolean;
  /** Flatter layout for use inside dialogs (no nested cards). */
  variant?: "default" | "embedded";
  /** Notifies parent when the full-page PDF preview overlay opens or closes. */
  onPreviewOpenChange?: (open: boolean) => void;
}

const SearchResultItem = ({
  companyReport,
  selectedReport,
  onSelect,
  initialExpanded = false,
  variant = "default",
  onPreviewOpenChange,
}: SearchResultItemProps) => {
  const { t } = useI18n();
  const { companyName, results } = companyReport;
  const [resultsWithPreview, setResultsWithPreview] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(
    initialExpanded || variant === "embedded",
  );
  const [previewOpenIndex, setPreviewOpenIndex] = useState<number | null>(null);
  const [imgStatus, setImgStatus] = useState<
    { loading: boolean; error: boolean }[]
  >([]);

  useEffect(() => {
    onPreviewOpenChange?.(previewOpenIndex !== null);
  }, [previewOpenIndex, onPreviewOpenChange]);

  useEffect(() => {
    if (previewOpenIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpenIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewOpenIndex]);

  const handlePreviewOpen = (index: number) => {
    setPreviewOpenIndex(index);
  };

  const handlePreviewClose = () => {
    setPreviewOpenIndex(null);
  };

  useEffect(() => {
    if (results && results.length > 0) {
      setResultsWithPreview(generateReportPreviews(results as Report[]));
    }
  }, [results]);

  useEffect(() => {
    if (resultsWithPreview.length > 0) {
      setImgStatus(
        Array(resultsWithPreview.length).fill({ loading: true, error: false }),
      );
    }
  }, [resultsWithPreview.length]);

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

      {resultsWithPreview.map((result, index) => (
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
                ? "flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start"
                : "relative flex items-center gap-4"
            }
            style={
              variant === "embedded"
                ? undefined
                : { minWidth: 50, minHeight: 50 }
            }
          >
            <div
              className="relative shrink-0"
              style={{ width: 50, height: 50 }}
            >
              <img
                src={result.previewUrl}
                height={50}
                width={50}
                className="cursor-pointer rounded shadow"
                onClick={() => handlePreviewOpen(index)}
                alt="Preview"
                style={{
                  visibility:
                    imgStatus[index]?.loading || imgStatus[index]?.error
                      ? "hidden"
                      : "visible",
                  transition: "visibility 0.2s",
                  width: 50,
                  height: 50,
                  objectFit: "cover",
                }}
                onLoad={() => {
                  setImgStatus((prev) => {
                    const arr = [...prev];
                    arr[index] = { loading: false, error: false };
                    return arr;
                  });
                }}
                onError={() => {
                  setImgStatus((prev) => {
                    const arr = [...prev];
                    arr[index] = { loading: false, error: true };
                    return arr;
                  });
                }}
              />
              {imgStatus[index]?.loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoadingSpinner size={6} />
                </div>
              )}
              {imgStatus[index]?.error && (
                <div className="absolute inset-0 flex items-center justify-center px-1 text-center">
                  <span className="text-xs text-red-04">
                    Image failed to load
                  </span>
                </div>
              )}
            </div>
            <div
              className={
                variant === "embedded"
                  ? "flex min-w-0 flex-1 items-start gap-2"
                  : "flex gap-2 text-sm text-gray-02"
              }
            >
              <span className="shrink-0 text-sm text-gray-02">
                {index + 1}.
              </span>
              {variant === "embedded" ? (
                <div className="min-w-0 flex-1">
                  <a
                    href={result.url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-gray-01 hover:text-blue-04"
                  >
                    {result.url}
                  </a>
                  <div className="mt-1.5 flex flex-nowrap items-center gap-2">
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
              ) : (
                <>
                  <a
                    href={result.url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-02 hover:text-blue-04"
                  >
                    {`${result?.url?.substring(0, 100)}...`}
                    <ExternalLink className="ml-2 inline h-4 w-4 shrink-0" />
                  </a>
                  <CopyButton
                    getText={() => String(result.url ?? "")}
                    className="border-gray-03/70 bg-gray-03/20 px-2 py-0.5 text-gray-02 hover:bg-gray-03/40"
                  />
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 self-start sm:self-center"
            onClick={() => handleReportSelect(result.url as string)}
          >
            <CheckCircle2
              className={`${selectedReport === result.url ? "text-green-03" : "text-gray-02"} h-6 w-6`}
            />
          </button>
          {previewOpenIndex === index &&
            ReactDOM.createPortal(
              <div
                style={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  width: "100vw",
                  height: "100vh",
                  zIndex: 10000,
                  background: "rgba(0,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handlePreviewClose}
              >
                <img
                  src={result.previewUrl}
                  className="max-h-[90vh] max-w-[90vw] rounded border border-gray-200 bg-white shadow-lg"
                  alt="Full Preview"
                  style={{ objectFit: "contain" }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>,
              document.body,
            )}
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
            <p className="text-xs text-gray-02">
              {t("crawler.foundReportLinks", { count: results.length })}
            </p>
          </div>
        </div>
        {resultRows}
      </div>
    );
  }

  return (
    <>
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
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-02">
                {t("crawler.foundReportLinks", { count: results.length })}
              </div>
            </div>
          </button>
        </div>
        <div className="overflow-hidden rounded-[20px] bg-gray-04/80 backdrop-blur-sm hover:shadow-md transition-shadow">
          {isDialogOpen && resultRows}
        </div>
      </div>
    </>
  );
};

export default SearchResultItem;
