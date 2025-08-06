import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QueueJob } from "@/lib/types";
import { WORKFLOW_STAGES } from "@/lib/constants";
import {
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  RotateCcw,
  Check,
  X,
  HelpCircle,
  Info,
  Code,
  FileText,
} from "lucide-react";
import { JobHeader } from "./job-header";
import { JobTabs } from "./job-tabs";
import { ApprovalSection } from "./approval-section";
import { JobMetadata } from "./job-metadata";
import { ErrorSection } from "./ui/error-section";
import { JobRelationships } from "./job-relationships";
import {
  UserFriendlyDataView,
  JsonViewer,
  isJsonString,
} from "./job-data-viewer";
import { getFilteredJobDataWithoutSchema } from "./job-status-helpers";

interface JobDetailsDialogProps {
  job: QueueJob | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (approved: boolean) => void;
  onRetry?: () => void;
}

export function JobDetailsDialog({
  job,
  isOpen,
  onOpenChange,
  onApprove,
  onRetry,
}: JobDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<"user" | "technical">("user");

  if (!job) return null;

  const stage = WORKFLOW_STAGES.find(s => s.id === job.queueId);
  const needsApproval = !job.data.approved && !job.data.autoApprove;
  const canRetry = job.isFailed;
  const hasParent = !!job.parent;

  const handleApprove = (approved: boolean) => {
    if (onApprove) {
      onApprove(approved);
      onOpenChange(false);
      toast.success(approved ? "Jobbet godkänt" : "Jobbet avvisat");
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      onOpenChange(false);
      toast.success("Jobbet omstartat");
    }
  };

  const getStatusIcon = () => {
    if (needsApproval) return <HelpCircle className="w-5 h-5 text-blue-03" />;
    if (job.isFailed) return <AlertTriangle className="w-5 h-5 text-pink-03" />;
    if (job.finishedOn)
      return <CheckCircle2 className="w-5 h-5 text-green-03" />;
    if (job.processedOn)
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RotateCcw className="w-5 h-5 text-blue-03" />
        </motion.div>
      );
    return <MessageSquare className="w-5 h-5 text-gray-02" />;
  };

  const getStatusColor = () => {
    if (needsApproval) return "bg-blue-03/20";
    if (job.isFailed) return "bg-pink-03/20";
    if (job.finishedOn) return "bg-green-03/20";
    if (job.processedOn) return "bg-blue-03/20";
    return "bg-gray-03/20";
  };

  const getStatusText = () => {
    if (needsApproval) return "Väntar på godkännande";
    if (job.isFailed) return "Misslyckad";
    if (job.finishedOn) return "Slutförd";
    if (job.processedOn) return "Bearbetar";
    return "Väntar";
  };

  // Simplified view for jobs that need approval
  if (needsApproval && activeTab === "user") {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl p-0">
          {/* Sticky Header */}
          <div className="sticky top-0 z-0 bg-gray-05/95 backdrop-blur-sm border-b border-gray-03/30 p-6 pt-12">
            <JobHeader job={job} needsApproval={true} />
            <JobTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Scrollable Content */}
          <div className="p-6 space-y-6">
            <ApprovalSection job={job} />

            <div className="bg-gray-04/80 backdrop-blur-sm rounded-xl p-6 border border-gray-03/30 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-01 mb-6 flex items-center">
                <Info className="w-5 h-5 mr-3 text-blue-03" />
                Information
              </h3>
              <UserFriendlyDataView
                data={getFilteredJobDataWithoutSchema(job)}
              />
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-gray-03/30">
            <div className="flex justify-between w-full">
              <div></div>
              <div className="space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => handleApprove(false)}
                  className="border-pink-03 text-pink-03 hover:bg-pink-03/10 px-6 py-2 font-medium transition-all duration-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avvisa
                </Button>
                <Button
                  onClick={() => handleApprove(true)}
                  className="bg-green-03 text-white hover:bg-green-03/90 px-6 py-2 font-medium transition-all duration-200 shadow-sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Godkänn
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Technical view or non-approval jobs
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl p-0">
        {/* Sticky Header */}
        <div className="sticky top-0 z-0 bg-gray-05/95 backdrop-blur-sm border-b border-gray-03/30 p-6 pt-12">
          <JobHeader job={job} stage={stage} />
          <JobTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6">
          {activeTab === "user" ? (
            <>
              {/* Status Section */}
              <div className="bg-gray-04/80 backdrop-blur-sm rounded-xl p-6 border border-gray-03/30 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-01 flex items-center">
                    <Info className="w-5 h-5 mr-3 text-blue-03" />
                    Status
                  </h3>
                  {job.data.url && (
                    <a
                      href={job.data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-blue-03 hover:text-blue-03/80 bg-blue-03/10 hover:bg-blue-03/20 p-3 rounded-xl transition-all duration-200"
                      title="Öppna källdokument"
                    >
                      <FileText className="w-5 h-5" />
                      <span className="text-sm font-medium">Öppna PDF</span>
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${getStatusColor()}`}>
                      {getStatusIcon()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-01 text-lg">
                        {stage?.name || job.queueId}
                      </div>
                      <div className="text-sm text-gray-02 font-medium">
                        {getStatusText()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-03/20 rounded-lg p-4">
                    <div className="text-sm text-gray-02 font-medium mb-1">
                      Skapad
                    </div>
                    <div className="text-gray-01 font-mono">
                      {new Date(job.timestamp).toLocaleString("sv-SE")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Relationships Section */}
              <JobRelationships job={job} />

              {/* User-friendly Job Data Section */}
              <div className="bg-gray-04/80 backdrop-blur-sm rounded-xl p-6 border border-gray-03/30 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-01 mb-6 flex items-center">
                  <Info className="w-5 h-5 mr-3 text-blue-03" />
                  Information
                </h3>
                <UserFriendlyDataView
                  data={getFilteredJobDataWithoutSchema(job)}
                />
              </div>

              {/* Error Section */}
              <ErrorSection
                job={job}
                onShowTechnical={() => setActiveTab("technical")}
              />
            </>
          ) : (
            <>
              {/* Schema Section (if present) */}
              {job.data.schema && (
                <div className="bg-blue-03/10 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-03 mb-4 flex items-center">
                    <Code className="w-5 h-5 mr-2" />
                    Schema
                  </h3>
                  <div className="bg-gray-04 rounded-lg p-3">
                    <JsonViewer data={job.data.schema} />
                  </div>
                </div>
              )}

              {/* Technical Job Data Section */}
              <div className="bg-gray-03/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-01 mb-4">
                  Teknisk data
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(job.data).map(([key, value]) => {
                    if (
                      key === "companyName" ||
                      key === "description" ||
                      key === "schema"
                    )
                      return null;

                    return (
                      <div key={key} className="bg-gray-04 rounded-lg p-3">
                        <div className="text-sm text-gray-02 mb-1">{key}</div>
                        <div className="text-gray-01 break-words">
                          {typeof value === "string" && isJsonString(value) ? (
                            <JsonViewer data={value} />
                          ) : typeof value === "object" ? (
                            <JsonViewer data={value} />
                          ) : (
                            String(value)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Full Error Section */}
              {job.isFailed && job.stacktrace.length > 0 && (
                <div className="bg-pink-03/10 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-03 mb-4">
                    Fullständigt felmeddelande
                  </h3>
                  <pre className="text-pink-03 text-sm overflow-x-auto">
                    {job.stacktrace.join("\n")}
                  </pre>
                </div>
              )}

              {/* Job Metadata */}
              <JobMetadata job={job} />
            </>
          )}
        </div>

        <DialogFooter className="pt-6 border-t border-gray-03/30">
          <div className="flex justify-between w-full">
            <div>
              {canRetry && (
                <Button
                  variant="ghost"
                  onClick={handleRetry}
                  className="text-blue-03 hover:bg-blue-03/10 px-6 py-2 font-medium transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Försök igen
                </Button>
              )}
            </div>
            {needsApproval && (
              <div className="space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => handleApprove(false)}
                  className="border-pink-03 text-pink-03 hover:bg-pink-03/10 px-6 py-2 font-medium transition-all duration-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avvisa
                </Button>
                <Button
                  onClick={() => handleApprove(true)}
                  className="bg-green-03 text-white hover:bg-green-03/90 px-6 py-2 font-medium transition-all duration-200 shadow-sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Godkänn
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
