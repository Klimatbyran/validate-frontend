import { motion } from "framer-motion";
import { CompanyReport, LockedReport } from "../lib/crawler-types";
import SearchResultItem from "./SearchResultItem";
import { useI18n } from "@/contexts/I18nContext";

interface SearchResultsListProps {
  companyReports: CompanyReport[] | null;
  setManualReports: React.Dispatch<
    React.SetStateAction<CompanyReport[] | null>
  >;
  setLockedReports: React.Dispatch<React.SetStateAction<LockedReport[]>>;
  lockedReports: LockedReport[];
  reportYear: string;
  selectedReports: Record<string, string>;
  setSelectedReports: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

const SearchResultsList = ({
  companyReports,
  reportYear,
  selectedReports,
  setSelectedReports,
}: SearchResultsListProps) => {
  const { t } = useI18n();

  const handleSelect = (companyName: string, url: string | null) => {
    setSelectedReports((prev) => {
      const updated = { ...prev };
      if (url) {
        updated[companyName] = url;
      } else {
        delete updated[companyName];
      }
      return updated;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
    >
      <h3 className="text-xl font-semibold text-gray-01 mb-6">
        {t("crawler.searchResults")}
      </h3>

      {companyReports?.map((report, index) => (
        <SearchResultItem
          key={index}
          companyReport={report}
          reportYear={reportYear}
          selectedReport={selectedReports[report.companyName]}
          onSelect={handleSelect}
        />
      ))}
    </motion.div>
  );
};

export default SearchResultsList;
