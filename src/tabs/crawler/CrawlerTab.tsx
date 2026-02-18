import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/ui/button";
import { WandIcon, Loader2 } from "lucide-react";
import fetchCompanyReports from "@/lib/crawler-api";
import { CompanyReport } from "@/lib/crawler-types";
import ResultsList from "@/components/crawler/ResultsList";

export function CrawlerTab() {
  const [companyNameInput, setCompanyNameInput] = useState<string>("");
  const [reportYearInput, setReportYearInput] = useState<string>("");
  const [companyReports, setCompanyReports] = useState<CompanyReport[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    const searchQuery = {
      name: companyNameInput,
      reportYear: reportYearInput,
    };

    const data = await fetchCompanyReports(searchQuery);

    if (data) {
      setCompanyReports(data.results);
      setIsLoading(false);
      console.log("Company report:", data.results);
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
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
      >
        <h2 className="text-xl font-semibold text-gray-01 mb-6">Crawler</h2>

        <div className="flex gap-4 items-center">
          <h3>Find report for a company</h3>
          <div className="flex gap-4 items-center">
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

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
            <div>
              <p className="text-lg text-gray-01 font-medium">
                Loading search results...
              </p>
              <p className="text-sm text-gray-02 mt-2">
                Fetching company data from API
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ResultsList reports={companyReports} />
      )}
    </div>
  );
}
