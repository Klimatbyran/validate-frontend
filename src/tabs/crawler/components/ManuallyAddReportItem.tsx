import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface ManuallyAddReportItemProps {
  companyName: string;
  selectedReport?: string;
  onSelect: (companyName: string, url: string | null) => void;
}

const ManuallyAddReportItem = ({
  companyName,
  selectedReport,
  onSelect,
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
    <div className="w-full px-4 py-3 border-b border-gray-03 flex items-center gap-4 bg-gray-03/25">
      <div className="flex items-center gap-4 w-full">
        <span className="text-sm w-64 text-gray-02">{t("crawler.manuallyAddReport")}:</span>
        <input
          type="url"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          disabled={isSelected}
          placeholder={t("registry.reportUrl")}
          className="bg-gray-03 border px-2 py-1 w-full border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03 disabled:opacity-70"
        />
      </div>
      <button
        type="button"
        disabled={!canSelect}
        onClick={handleToggleSelection}
        className="disabled:opacity-50"
      >
        <CheckCircle2
          className={`${isSelected ? "text-green-03" : "text-gray-02"} w-6 h-6`}
        />
      </button>
    </div>
  );
};

export default ManuallyAddReportItem;
