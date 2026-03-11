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
import ReactDOM from "react-dom";

interface SearchResultItemProps {
  companyReport: CompanyReport;
  reportYear: string;
  selectedReport?: string;
  onSelect: (companyName: string, url: string | null) => void;
}

const SearchResultItem = ({
  companyReport,
  selectedReport,
  onSelect,
}: SearchResultItemProps) => {
  const { t } = useI18n();
  const { companyName, results } = companyReport;
  const [resultsWithPreview, setResultsWithPreview] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [previewOpenIndex, setPreviewOpenIndex] = useState<number | null>(null);
  const [imgStatus, setImgStatus] = useState<
    { loading: boolean; error: boolean }[]
  >([]);

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

  return (
    <>
      <div className="mt-4 bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
        <div className="w-full px-4 py-3 bg-gray-03/50 border-b border-gray-03 flex items-center justify-between">
          <button
            onClick={() => setIsDialogOpen(!isDialogOpen)}
            className="flex items-center gap-3 hover:opacity-70 transition-opacity w-full"
          >
            {isDialogOpen ? (
              <ChevronDown className="w-5 h-5 text-gray-02" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-02" />
            )}

            <div className="w-full text-left">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Book className="w-4 h-4 text-white" />
                  <h3 className="font-bold text-gray-01">{companyName}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-02 mt-1">
                {t("crawler.foundReportLinks", { count: results.length })}
              </div>
            </div>
          </button>
        </div>
        <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
          {isDialogOpen &&
            resultsWithPreview.map((result, index) => (
              <div
                key={`${result.url}-${index}`}
                className="w-full px-4 py-3 border-b border-gray-03 flex items-center justify-between"
              >
                <div
                  className="relative flex items-center gap-4"
                  style={{ minWidth: 50, minHeight: 50 }}
                >
                  <div className="relative" style={{ width: 50, height: 50 }}>
                    <img
                      src={result.previewUrl}
                      height={50}
                      width={50}
                      className="rounded shadow cursor-pointer"
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
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-red-04">
                          Image failed to load
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-02 flex gap-2">
                    {index + 1}.
                    <a
                      href={result.url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-02 hover:text-blue-04"
                    >
                      {result?.url?.substring(0, 100) + "..."}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </span>
                </div>
                <button
                  onClick={() => handleReportSelect(result.url as string)}
                >
                  <CheckCircle2
                    className={`${selectedReport === result.url ? "text-green-03" : "text-gray-02"} w-6 h-6`}
                  />
                </button>
                {/* Portal for preview image */}
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
                      onClick={handlePreviewClose}
                    >
                      <img
                        src={result.previewUrl}
                        className="max-h-[90vh] max-w-[90vw] rounded shadow-lg border border-gray-200 bg-white"
                        alt="Full Preview"
                        style={{ objectFit: "contain" }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>,
                    document.body,
                  )}
              </div>
            ))}
        </div>
      </div>
    </>
  );
};

export default SearchResultItem;
