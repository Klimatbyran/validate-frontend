import { motion } from "framer-motion";
import { CompanyReport } from "@/lib/crawler-types";
import ResultItem from "./ResultItem";

interface ResultsListProps {
  companyReports: CompanyReport[] | null;
  setCompanyReports: React.Dispatch<
    React.SetStateAction<CompanyReport[] | null>
  >;
}

const ResultsList = ({
  companyReports,
  setCompanyReports,
}: ResultsListProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
    >
      <h3 className="text-xl font-semibold text-gray-01 mb-6">
        Search Results
      </h3>

      {companyReports?.map((report, index) => {
        return (
          <ResultItem
            key={index}
            setCompanyReports={setCompanyReports}
            companyReports={companyReports}
            companyReport={report}
          />
        );
      })}
    </motion.div>
  );
};

export default ResultsList;
