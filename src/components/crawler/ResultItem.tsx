import { useState } from "react";
import {
  Book,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { CompanyReport } from "@/lib/crawler-types";
import { Button } from "../ui/button";

interface ResultItemProps {
  companyReport: CompanyReport;
  companyReports: CompanyReport[] | null;
  setCompanyReports: React.Dispatch<
    React.SetStateAction<CompanyReport[] | null>
  >;
}

const ResultItem = ({
  companyReport,
  companyReports,
  setCompanyReports,
}: ResultItemProps) => {
  console.log(companyReports);
  const { companyName, results } = companyReport;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const handleReportSelect = (url: string) => {
    if (selectedReport === url) {
      setSelectedReport(null);
    } else {
      setSelectedReport(url);
    }
  };

  const handleSaveReport = () => {
    const company = companyReports?.find(
      (company) => company.companyName === companyReport.companyName,
    );

    const updatedResults = [
      { url: selectedReport},
    ];

    if (company) {
      const updatedCompany = (company.results = updatedResults);
      console.log(updatedCompany);
    }
  };

  return (
    <>
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
        <div className="w-full px-4 py-3 bg-gray-03/50 border-b border-gray-03 flex items-center justify-between">
          <button
            onClick={() => setIsDialogOpen(!isDialogOpen)}
            className="flex items-center gap-3 hover:opacity-70 transition-opacity w-full"
          >
            {isDialogOpen ? (
              <ChevronDown className="w-5 h-5 text-gray-02" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-02" />
            )}

            <div className="w-full text-left">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Book className="w-4 h-4 text-white" />
                  <h3 className="font-bold text-gray-01">{companyName}</h3>
                </div>
                <Button
                  onClick={() => handleSaveReport()}
                  disabled={!selectedReport}
                  variant="ghost"
                  size="sm"
                  className="border border-white text-gray-01 hover:bg-gray-03/40"
                >
                  Save report
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-02 mt-1">
                Found {results.length} possible report link
                {results.length > 1 ? "s" : ""}
              </div>
            </div>
          </button>
        </div>
        <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
          {isDialogOpen &&
            results.map((result, index) => (
              <div
                key={`${result.url}-${index}`}
                className="w-full px-4 py-3 border-b border-gray-03 flex items-center justify-between"
              >
                <span className="text-sm text-gray-02 flex gap-2">
                  {result.position}.
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-02 hover:text-blue-04"
                  >
                    {result.url.substring(0, 100) + "..."}

                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </span>
                <button onClick={() => handleReportSelect(result.url)}>
                  <CheckCircle2
                    className={`${selectedReport === result.url ? "text-green-03" : "text-gray-02"} w-6 h-6`}
                  />
                </button>
              </div>
            ))}
        </div>
      </div>
    </>
  );
};

export default ResultItem;
