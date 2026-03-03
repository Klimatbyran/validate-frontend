import { motion } from "framer-motion";
import { CompanyReport } from "../lib/crawler-types";
import SearchResultItem from "./SearchResultItem";
import { useI18n } from "@/contexts/I18nContext";

interface SearchResultsListProps {
  companyReports: CompanyReport[] | null;
  setCompanyReports: React.Dispatch<
    React.SetStateAction<CompanyReport[] | null>
  >;
  reportYear: string;
}

const SearchResultsList = ({
  companyReports,
  setCompanyReports,
  reportYear,
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
            setCompanyReports={setCompanyReports}
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
