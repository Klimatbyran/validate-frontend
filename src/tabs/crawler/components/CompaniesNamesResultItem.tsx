import { CheckCircle2 } from "lucide-react";
import { memo } from "react";
import { GARBO_PROD_ORIGIN } from "@/config/api-env";
import { CompanyDetails } from "../lib/crawler-types";

interface CompaniesNamesResultItemProps {
  isSelected: boolean;
  onToggle: (companyName: string) => void;
  companyDetails: CompanyDetails;
}

const CompaniesNamesResultItem = ({
  companyDetails,
  isSelected,
  onToggle,
}: CompaniesNamesResultItemProps) => {
  const { wikidataId, name, reportingPeriods } = companyDetails;

  const latestReportYear =
    reportingPeriods?.[0]?.endDate?.split("-")[0] ?? "N/A";

  return (
    <tr className="transition-colors hover:bg-gray-03/30">
      <td className="px-4 py-3 text-sm text-gray-01">
        <div className="flex items-center justify-between gap-3">
          <a
            href={`${GARBO_PROD_ORIGIN}/companies/${wikidataId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {name}
          </a>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-02">{latestReportYear}</td>
      <td className="px-4 py-3 text-sm text-gray-02">
        <button onClick={() => onToggle(name)}>
          <CheckCircle2
            className={`${isSelected ? "text-green-03" : "text-gray-02"} w-6 h-6`}
          />
        </button>
      </td>
    </tr>
  );
};

export default memo(CompaniesNamesResultItem);
