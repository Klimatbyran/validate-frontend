import { useState } from "react";
import { Book, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { CompanyReport } from "../lib/crawler-types";
import { Button } from "@/ui/button";

interface ResultItemProps {
  report: CompanyReport;
}

const ResultItem = ({ report }: ResultItemProps) => {
  console.log(report);
  const { companyName, results } = report;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden hover:shadow-md transition-shadow">
        <div className="w-full px-4 py-3 bg-gray-03/50 border-b border-gray-03 flex items-center justify-between">
          <button
            onClick={() => setIsDialogOpen(!isDialogOpen)}
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            {isDialogOpen ? (
              <ChevronDown className="w-5 h-5 text-gray-02" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-02" />
            )}

            <div className="text-left">
              <div className="flex items-center gap-2">
                <Book className="w-4 h-4 text-white" />
                <h3 className="font-bold text-gray-01">{companyName}</h3>
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
                <p className="text-sm text-gray-02">
                  {result.position}. {result.url.substring(0, 100) + "..."}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="flex-shrink-0"
                >
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-03 hover:text-blue-04"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open
                  </a>
                </Button>
              </div>
            ))}
        </div>
      </div>
    </>
  );
};

export default ResultItem;
