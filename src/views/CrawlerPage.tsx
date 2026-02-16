import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { WandIcon } from "lucide-react";
import companyList from "../data/crawler/crawlerCompanyListTest.json";
import useAllCompanyNames from "@/hooks/useAllCompanyNames";
import fetchCompanyReports from "@/lib/crawler-api";

const CrawlerPage = () => {
  /*   const { companyNames, isLoading, error } = useAllCompanyNames();
   */ const [companyNameInput, setCompanyNameInput] = useState("");
  const [reportYearInput, setReportYearInput] = useState("");
  const [companyReports, setCompanyReports] = useState<any>(null);

  const handleClick = async () => {
    const searchQuery = {
      name: companyNameInput,
      reportYear: reportYearInput,
    };

    const report = await fetchCompanyReports(searchQuery);
    setCompanyReports(report);

    if (companyReports) {
      console.log("Company report:", companyReports);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyNameInput(e.target.value);
  };

  const handleReportYearInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setReportYearInput(e.target.value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
    >
      <h2 className="text-xl font-semibold text-gray-01 mb-6">Crawler</h2>

      <div className="flex gap-4 items-center">
        <h3>Find report for a company</h3>
        <div className="flex gap-4">
          <div className="flex gap-4">
            <input
              onChange={(e) => handleSearchInputChange(e)}
              placeholder="Ex. Alfa Laval"
              className="bg-gray-03/20 w-48 border p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
            />
            <input
              onChange={(e) => handleReportYearInputChange(e)}
              placeholder="Ex. 2025"
              className="bg-gray-03/20 w-48 border p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
            />
          </div>
          <Button size={"sm"} onClick={() => handleClick()}>
            Search
            <WandIcon className="w-4 h-4 ml-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CrawlerPage;
