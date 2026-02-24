import { useState } from "react";
import {
  Book,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { CompanyReport } from "../lib/crawler-types";
import { Button } from "@/ui/button";

interface SearchResultItemProps {
  companyReport: CompanyReport;
  companyReports: CompanyReport[] | null;
  setCompanyReports: React.Dispatch<
    React.SetStateAction<CompanyReport[] | null>
  >;
}

const SearchResultItem = ({
  companyReport,
  companyReports,
  setCompanyReports,
}: SearchResultItemProps) => {
  console.log(companyReports);
  const { companyName, results } = companyReport;
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [lockedReport, setLockedReport] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const handleReportSelect = (url: string) => {
    if (selectedReport === url) {
      setSelectedReport(null);
      setLockedReport(false);
    } else {
      setSelectedReport(url);
    }
  };

  const handleSaveReport = () => {
    if (!selectedReport) return;

    const updatedResults = [{ url: selectedReport }];

    setLockedReport(true);
    setCompanyReports((prevReports) =>
      prevReports
        ? prevReports.map((c) =>
            c.companyName === companyReport.companyName
              ? { ...c, results: updatedResults }
              : c,
          )
        : null,
    );
  };

  const handlePushToDb = () => {
    const updatedCompanyReports = companyReports?.filter((company) => {
      return company.companyName !== companyReport?.companyName;
    });

    setCompanyReports(updatedCompanyReports || []);
    setSelectedReport(null);
    setLockedReport(false);

    console.log(companyReports);
  };
  return (
    <>
      <div className="mt-4 bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
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
                <div className="flex items-center gap-6">
                  <Button
                    onClick={() => handleSaveReport()}
                    disabled={!selectedReport || lockedReport}
                    variant="ghost"
                    size="sm"
                    className="border border-white text-gray-01 hover:bg-gray-03/100"
                  >
                    Lock report
                  </Button>
                  <Button
                    onClick={() => handlePushToDb()}
                    disabled={!lockedReport}
                    variant="ghost"
                    size="sm"
                    className="border border-white text-gray-01 hover:bg-gray-03/100"
                  >
                    Update DB
                  </Button>
                </div>
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
                  {index + 1}.
                  <a
                    href={result.url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-02 hover:text-blue-04"
                  >
                    {result?.url?.substring(0, 100) + "..."}

                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </span>
                <button
                  onClick={() => handleReportSelect(result.url as string)}
                >
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

export default SearchResultItem;
