import { useProcesses } from "@/hooks/useProcesses";
import { motion } from "framer-motion"
import { AlertCircleIcon, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { ProcessCard } from "./process-card";
import { useContext, useState } from "react";
import { JobDetailsDialog } from "./job-details-dialog";
import { JobDetailContext } from "../contexts/JobDetailContext";

export function ProcessOverview() {
  const { processes, isLoading, refresh, error, isError } = useProcesses(); 
  const { jobPopover } = useContext(JobDetailContext);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(
    new Set()
  );

  const toggleCompanyExpansion = (processId: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(processId)) {
        next.delete(processId);
      } else {
        next.add(processId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 text-gray-02 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-pink-03">
            <AlertCircleIcon className="w-6 h-6 mr-2" />
            <span>{error?.message || 'Ett fel uppstod'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            className="ml-4 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      </div>
    );
  }
                          
  return(
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6"
      >
        <JobDetailsDialog
          jobId={jobPopover?.id ?? "0"}
          queueName={jobPopover?.queue ?? ""}
          isOpen={jobPopover != null}
        />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-3xl text-gray-01">Process Overview</h3>
          </div>
        </div>
        <div className="border-t border-l border-r rounded-lg">
          <div className="botder-b h-[60px] bg-gray-03/80 px-4 flex items-center">
            <strong>{processes.length} Processes</strong>
          </div>
          {processes.map((process, index) => <ProcessCard key={`ProcessCard-${process.id}`}  extend={() => toggleCompanyExpansion(process.id)} extended={expandedCompanies.has(process.id)} className={`border-b ${index === processes.length - 1 ? 'rounded-lg' : ''}`} process={process} />)}
        </div>
      </motion.div>
  )
}
