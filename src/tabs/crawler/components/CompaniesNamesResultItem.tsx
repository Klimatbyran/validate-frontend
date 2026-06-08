import { CheckCircle2 } from "lucide-react";
import { memo } from "react";
import { getKlimatkollenCompanyPath } from "@/lib/company-routing";
import { CompanyDetails } from "../lib/crawler-types";
import { useI18n } from "@/contexts/I18nContext";

interface CompaniesNamesResultItemProps {
  isSelected: boolean;
  onToggle: (companyName: string, wikidataId?: string) => void;
  companyDetails: CompanyDetails;
}

const CompaniesNamesResultItem = ({
  companyDetails,
  isSelected,
  onToggle,
}: CompaniesNamesResultItemProps) => {
  const { id, wikidataId, name, reportingPeriods } = companyDetails;
  const { t } = useI18n();

  const latestReportYear =
    reportingPeriods?.[0]?.endDate?.split("-")[0] ?? "N/A";

  return (
    <tr className="transition-colors hover:bg-gray-03/30">
      <td className="px-4 py-3 text-sm text-gray-01">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <a
              href={getKlimatkollenCompanyPath({ id, wikidataId })}
              target="_blank"
              rel="noopener noreferrer"
            >
              {name}
            </a>
            <span className="text-xs text-gray-02">
              {t("crawler.wikidataIdLabel")}:{" "}
              {wikidataId ?? t("crawler.unknownId")}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-02">{latestReportYear}</td>
      <td className="px-4 py-3 text-sm text-gray-02">
        <button onClick={() => onToggle(name, wikidataId)}>
          <CheckCircle2
            className={`${isSelected ? "text-green-03" : "text-gray-02"} w-6 h-6`}
          />
        </button>
      </td>
    </tr>
  );
};

export default memo(CompaniesNamesResultItem);
