import { useState } from "react";
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
import { getJobStatus } from "@/lib/workflow-utils";
import {
  getStatusIcon as getCentralizedStatusIcon,
  getStatusBackgroundColor,
  getStatusLabelSwedish,
} from "@/lib/status-config";
import {
  RotateCcw,
  Check,
  X,
  ArrowUpRight,
  GitBranch,
  HelpCircle,
  Info,
  Code,
  FileText,
  Globe,
} from "lucide-react";
import { JobSpecificDataView } from "./job-specific-data-view";
import { JsonViewer } from "./ui/json-viewer";
import { isJsonString, getWikidataInfo } from "@/lib/utils";

// Reusable components for the dialog
function JobDialogHeader({ job }: { job: QueueJob }) {
  return (
    <DialogHeader>
      <div className="flex items-center justify-between">
        <div>
          <DialogTitle className="text-2xl mb-2">
            {job.data.companyName || job.data.company}
          </DialogTitle>
          {getWikidataInfo(job)?.node && (
            <div className="text-sm text-gray-02 mb-2">
              WikidataID: {getWikidataInfo(job)?.node}
            </div>
          )}
          {job.data.description && (
            <DialogDescription className="text-base">
              {job.data.description}
            </DialogDescription>
          )}
        </div>
      </div>
    </DialogHeader>
  );
}

function DialogTabs({
  activeTab,
  setActiveTab,
  job,
}: {
  activeTab: "user" | "technical";
  setActiveTab: (tab: "user" | "technical") => void;
  job: QueueJob;
}) {
  return (
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
      {job.data.url && (
        <Button variant="ghost" size="sm" asChild className="rounded-full">
          <a
            href={job.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            Report
          </a>
        </Button>
      )}
      {getWikidataInfo(job) && (
        <Button variant="ghost" size="sm" asChild className="rounded-full">
          <a
            href={`https://www.wikidata.org/wiki/${getWikidataInfo(job)?.node}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Globe className="w-4 h-4 mr-2" />
            Wikidata
          </a>
        </Button>
      )}
    </div>
  );
}

function TechnicalDataSection({ job }: { job: QueueJob }) {
  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">Teknisk data</h3>
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
  );
}

function JobMetadataSection({ job }: { job: QueueJob }) {
  const metadataFields = [
    {
      label: "ID",
      value: job.id,
      className: "font-mono",
    },
    {
      label: "Kö",
      value: job.queueId,
    },
    {
      label: "Skapad",
      value: new Date(job.timestamp).toLocaleString("sv-SE"),
    },
    {
      label: "Startad",
      value: job.processedOn
        ? new Date(job.processedOn).toLocaleString("sv-SE")
        : "-",
    },
    {
      label: "Avslutad",
      value: job.finishedOn
        ? new Date(job.finishedOn).toLocaleString("sv-SE")
        : "-",
    },
    {
      label: "Försök",
      value: job.attempts || 0,
    },
  ];

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">Jobbmetadata</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {metadataFields.map((field, index) => (
          <div key={index}>
            <div className="text-gray-02">{field.label}</div>
            <div className={`text-gray-01 ${field.className || ""}`}>
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorSection({
  job,
  setActiveTab,
  isFullError = false,
}: {
  job: QueueJob;
  setActiveTab: (tab: "user" | "technical") => void;
  isFullError?: boolean;
}) {
  if (!job.isFailed || job.stacktrace.length === 0) return null;

  return (
    <div className="bg-pink-03/10 rounded-lg p-4">
      <h3 className="text-lg font-medium text-pink-03 mb-4">
        {isFullError ? "Fullständigt felmeddelande" : "Felmeddelande"}
      </h3>
      {isFullError ? (
        <pre className="text-pink-03 text-sm overflow-x-auto">
          {job.stacktrace.join("\n")}
        </pre>
      ) : (
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
      )}
    </div>
  );
}

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

  // Use centralized status system
  const jobStatus = getJobStatus(job);
  const isActivelyProcessing = job.processedOn && !job.finishedOn;

  const getStatusIcon = () => {
    return getCentralizedStatusIcon(
      jobStatus,
      "detailed",
      !!isActivelyProcessing
    );
  };

  const getStatusColor = () => {
    return getStatusBackgroundColor(jobStatus);
  };

  const getStatusText = () => {
    return getStatusLabelSwedish(jobStatus, !!isActivelyProcessing);
  };

  // Filter out schema and metadata fields from job data for user-friendly view
  const getFilteredJobDataWithoutSchema = () => {
    const { companyName, description, schema, ...rest } = job.data;
    return rest;
  };

  // Simplified view for jobs that need approval
  if (needsApproval) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-6xl">
          <JobDialogHeader job={job} />

          <DialogTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            job={job}
          />

          <div className="space-y-6 my-6">
            {activeTab === "user" && (
              <>
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
              </>
            )}
            {activeTab === "technical" && <TechnicalDataSection job={job} />}
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
                  className="bg-green-04 text-green-01 hover:bg-green-04/90"
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
        <JobDialogHeader job={job} />

        <DialogTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          job={job}
        />

        <div className="space-y-6 my-6">
          {activeTab === "user" && (
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

              <ErrorSection job={job} setActiveTab={setActiveTab} />
            </>
          )}
          {activeTab === "technical" && (
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
              <TechnicalDataSection job={job} />
              <ErrorSection
                job={job}
                setActiveTab={setActiveTab}
                isFullError={true}
              />
              <JobMetadataSection job={job} />
            </>
          )}
          {activeTab === "technical" && (
            <>
              {/* Technical Tab Content */}
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
              <TechnicalDataSection job={job} />
              <ErrorSection
                job={job}
                setActiveTab={setActiveTab}
                isFullError={true}
              />
              <JobMetadataSection job={job} />
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
