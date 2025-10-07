import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QueueJob } from "@/lib/types";
import { getWorkflowStages } from "@/lib/workflow-config";
import {
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  RotateCcw,
  Check,
  X,
  ArrowUpRight,
  GitBranch,
  HelpCircle,
  Info,
  Code,
  FileText,
} from "lucide-react";
import { JobSpecificDataView } from "./job-specific-data-view";
import { JsonViewer } from "./json-viewer";

interface JobDetailsDialogProps {
  job: QueueJob | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (approved: boolean) => void;
  onRetry?: () => void;
}

// Utility function to check if a string is valid JSON
function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
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

  const stage = getWorkflowStages().find((s) => s.id === job.queueId);
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

  // Filter out schema and metadata fields from job data for user-friendly view
  const getFilteredJobDataWithoutSchema = () => {
    const { companyName, description, schema, ...rest } = job.data;
    return rest;
  };

  // Simplified view for jobs that need approval
  if (needsApproval && activeTab === "user") {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-6xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl mb-2">
                  {job.data.companyName || job.data.company}
                </DialogTitle>
                {job.data.description && (
                  <DialogDescription className="text-base">
                    {job.data.description}
                  </DialogDescription>
                )}
              </div>
              {job.data.url && (
                <a
                  href={job.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-03 hover:text-blue-03/80 bg-blue-03/10 p-2 rounded-full"
                  title="Öppna källdokument"
                >
                  <FileText className="w-5 h-5" />
                </a>
              )}
            </div>
          </DialogHeader>

          <div className="flex items-center space-x-2 mb-6">
            <Button variant="primary" size="sm" className="rounded-full">
              <Info className="w-4 h-4 mr-2" />
              Översikt
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("technical")}
              className="rounded-full"
            >
              <Code className="w-4 h-4 mr-2" />
              Tekniska detaljer
            </Button>
          </div>

          <div className="space-y-6 my-6">
            <div className="bg-blue-03/10 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-full bg-blue-03/20">
                  <HelpCircle className="w-5 h-5 text-blue-03" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-blue-03">
                    Godkännande krävs
                  </h3>
                  <p className="text-sm text-blue-03/80">
                    Vänligen granska informationen och godkänn eller avvisa.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-03/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-01 mb-4">
                Information
              </h3>
              <JobSpecificDataView
                data={getFilteredJobDataWithoutSchema()}
                job={job}
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              <div></div>
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => handleApprove(false)}
                  className="border-pink-03 text-pink-03 hover:bg-pink-03/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avvisa
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApprove(true)}
                  className="bg-green-03 text-white hover:bg-green-03/90"
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
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-6xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl mb-2">
                {job.data.companyName || job.data.company}
              </DialogTitle>
              {job.data.description && (
                <DialogDescription className="text-base">
                  {job.data.description}
                </DialogDescription>
              )}
            </div>
            {job.data.url && (
              <a
                href={job.data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-03 hover:text-blue-03/80 bg-blue-03/10 p-2 rounded-full"
                title="Öppna källdokument"
              >
                <FileText className="w-5 h-5" />
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="flex items-center space-x-2 mb-6">
          <Button
            variant={activeTab === "user" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("user")}
            className="rounded-full"
          >
            <Info className="w-4 h-4 mr-2" />
            Översikt
          </Button>
          <Button
            variant={activeTab === "technical" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("technical")}
            className="rounded-full"
          >
            <Code className="w-4 h-4 mr-2" />
            Tekniska detaljer
          </Button>
        </div>

        <div className="space-y-6 my-6">
          {activeTab === "user" ? (
            <>
              {/* Status Section */}
              <div className="bg-gray-03/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-01 mb-4">
                  Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getStatusColor()}`}>
                      {getStatusIcon()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-01">
                        {stage?.name || job.queueId}
                      </div>
                      <div className="text-sm text-gray-02">
                        {getStatusText()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-02">Skapad</div>
                    <div className="text-gray-01">
                      {new Date(job.timestamp).toLocaleString("sv-SE")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Relationships Section */}
              {hasParent && job.parent && (
                <div className="bg-blue-03/10 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-03 mb-4 flex items-center">
                    <GitBranch className="w-5 h-5 mr-2" />
                    Jobbrelationer
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-blue-03">
                      <ArrowUpRight className="w-5 h-4" />
                      <span className="text-sm">Förälder:</span>
                      <code className="bg-blue-03/20 px-2 py-1 rounded text-sm">
                        {job.parent.queue}:{job.parent.id}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Information Section */}
              <div className="bg-gray-03/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-01 mb-4">
                  Information
                </h3>
                <JobSpecificDataView
                  data={getFilteredJobDataWithoutSchema()}
                  job={job}
                />
              </div>

              {/* Error Section */}
              {job.isFailed && job.stacktrace.length > 0 && (
                <div className="bg-pink-03/10 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-03 mb-4">
                    Felmeddelande
                  </h3>
                  <div className="text-pink-03 text-sm">
                    {job.stacktrace[0]}
                    {job.stacktrace.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("technical")}
                        className="mt-2 text-pink-03 hover:bg-pink-03/10"
                      >
                        Visa fullständigt felmeddelande
                      </Button>
                    )}
                  </div>
                </div>
              )}
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

              {/* Error Section */}
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
              <div className="bg-gray-03/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-01 mb-4">
                  Jobbmetadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-02">ID</div>
                    <div className="font-mono text-gray-01">{job.id}</div>
                  </div>
                  <div>
                    <div className="text-gray-02">Kö</div>
                    <div className="text-gray-01">{job.queueId}</div>
                  </div>
                  <div>
                    <div className="text-gray-02">Skapad</div>
                    <div className="text-gray-01">
                      {new Date(job.timestamp).toLocaleString("sv-SE")}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-02">Startad</div>
                    <div className="text-gray-01">
                      {job.processedOn
                        ? new Date(job.processedOn).toLocaleString("sv-SE")
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-02">Avslutad</div>
                    <div className="text-gray-01">
                      {job.finishedOn
                        ? new Date(job.finishedOn).toLocaleString("sv-SE")
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-02">Försök</div>
                    <div className="text-gray-01">{job.attempts || 0}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {canRetry && (
                <Button
                  variant="ghost"
                  onClick={handleRetry}
                  className="text-blue-03 hover:bg-blue-03/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Försök igen
                </Button>
              )}
            </div>
            {needsApproval && (
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => handleApprove(false)}
                  className="border-pink-03 text-pink-03 hover:bg-pink-03/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avvisa
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApprove(true)}
                  className="bg-green-03 text-white hover:bg-green-03/90"
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
