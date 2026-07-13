import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface ManuallyAddReportItemProps {
  companyName: string;
  selectedReport?: string;
  onSelect: (companyName: string, url: string | null) => void;
  variant?: "default" | "embedded";
}

const ManuallyAddReportItem = ({
  companyName,
  selectedReport,
  onSelect,
  variant = "default",
}: ManuallyAddReportItemProps) => {
  const { t } = useI18n();
  const [manualUrl, setManualUrl] = useState("");
  const trimmedManualUrl = manualUrl.trim();
  const canSelect = trimmedManualUrl.length > 0;
  const isSelected = canSelect && selectedReport === trimmedManualUrl;

  const handleToggleSelection = () => {
    if (!canSelect) return;

    if (isSelected) {
      onSelect(companyName, null);
      return;
    }

    onSelect(companyName, trimmedManualUrl);
  };

  return (
    <div
      className={
        variant === "embedded"
          ? "flex flex-col gap-3 border-b border-gray-03/60 py-4 sm:flex-row sm:items-center sm:justify-between"
          : "flex w-full items-center gap-4 border-b border-gray-03 bg-gray-03/25 px-4 py-3"
      }
    >
      <div
        className={
          variant === "embedded"
            ? "flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center"
            : "flex w-full items-center gap-4"
        }
      >
        <span
          className={
            variant === "embedded"
              ? "shrink-0 text-sm text-gray-02"
              : "w-64 text-sm text-gray-02"
          }
        >
          {t("crawler.manuallyAddReport")}:
        </span>
        <input
          type="url"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          disabled={isSelected}
          placeholder={t("registry.reportUrl")}
          className="w-full min-w-0 flex-1 rounded-lg border border-gray-03 bg-gray-03 px-2 py-1 text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03 disabled:opacity-70"
        />
      </div>
      <button
        type="button"
        disabled={!canSelect}
        onClick={handleToggleSelection}
        className="shrink-0 self-end disabled:opacity-50 sm:self-center"
      >
        <CheckCircle2
          className={`${isSelected ? "text-green-03" : "text-gray-02"} w-6 h-6`}
        />
      </button>
    </div>
  );
};

export default ManuallyAddReportItem;
