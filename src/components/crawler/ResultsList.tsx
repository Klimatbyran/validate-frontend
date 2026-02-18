import { motion } from "framer-motion";
import { CompanyReport } from "@/lib/crawler-types";
import ResultItem from "./ResultItem";

interface ResultsListProps {
  reports: CompanyReport[] | null;
}

const ResultsList = ({ reports }: ResultsListProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
    >
      <h3 className="text-xl font-semibold text-gray-01 mb-6">
        Search Results
      </h3>

      {reports?.map((report, index) => {
        return <ResultItem key={index} report={report} />;
      })}
    </motion.div>
  );
};

export default ResultsList;
