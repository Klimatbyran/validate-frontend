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
}

const SearchResultsList = ({
  companyReports,
  setManualReports,
  reportYear,
  setLockedReports,
  lockedReports,
}: SearchResultsListProps) => {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
    >
      <h3 className="text-xl font-semibold text-gray-01 mb-6">
        {t("crawler.searchResults")}
      </h3>

      {companyReports?.map((report, index) => {
        return (
          <SearchResultItem
            key={index}
            setLockedReports={setLockedReports}
            lockedReports={lockedReports}
            setManualReports={setManualReports}
            companyReports={companyReports}
            companyReport={report}
            reportYear={reportYear}
          />
        );
      })}
    </motion.div>
  );
};

export default SearchResultsList;
