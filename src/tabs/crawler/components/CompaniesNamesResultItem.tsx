import { CheckCircle2 } from "lucide-react";
import { memo } from "react";

interface CompaniesNamesResultItemProps {
  isSelected: boolean;
  onToggle: (companyName: string) => void;
  companyDetails: {
    name: string;
    wikidataId?: string;
  };
}

const CompaniesNamesResultItem = ({
  companyDetails,
  isSelected,
  onToggle,
}: CompaniesNamesResultItemProps) => {
  return (
    <tr className="transition-colors hover:bg-gray-03/30">
      <td className="px-4 py-3 text-sm text-gray-01">
        <div className="flex items-center justify-between gap-3">
          <span>{companyDetails.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-02">—</td>
      <td className="px-4 py-3 text-sm text-gray-02">
        <button onClick={() => onToggle(companyDetails.name)}>
          <CheckCircle2
            className={`${isSelected ? "text-green-03" : "text-gray-02"} w-6 h-6`}
          />
        </button>
      </td>
    </tr>
  );
};

export default memo(CompaniesNamesResultItem);
