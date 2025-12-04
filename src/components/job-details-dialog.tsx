import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
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
import { ArrowUpRight, GitBranch, HelpCircle, Code } from "lucide-react";
import { JobSpecificDataView } from "./job-specific-data-view";
import { JsonViewer } from "./ui/json-viewer";
import { isJsonString } from "@/lib/utils";
import { JobDialogHeader } from "./job-details/JobDialogHeader";
import { DialogTabs } from "./job-details/DialogTabs";
import { JobDialogFooter } from "./job-details/JobDialogFooter";

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

function ReturnValueSection({ job }: { job: QueueJob | null }) {
  if (!job) return null;

  // Check both returnValue (camelCase) and returnvalue (lowercase)
  const returnValue = job.returnValue ?? (job as any).returnvalue;

  if (returnValue === null || returnValue === undefined) {
    return null;
  }

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">Return Value</h3>
      <div className="bg-gray-04 rounded-lg p-3">
        <div className="text-gray-01 break-words">
          {typeof returnValue === "string" && isJsonString(returnValue) ? (
            <JsonViewer data={returnValue} />
          ) : typeof returnValue === "object" ? (
            <JsonViewer data={returnValue} />
          ) : (
            String(returnValue)
          )}
        </div>
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
  const [detailed, setDetailed] = useState<any | null>(null);

  // Fetch detailed job data if returnValue is not present (similar to job-specific-data-view)
  useEffect(() => {
    if (!job) return;
    let aborted = false;
    async function loadDetails() {
      if (!job) return;
      if (job.returnValue || (job as any).returnvalue) return;
      if (!job.queueId || !job.id) return;
      try {
        const res = await fetch(
          `/api/queues/${encodeURIComponent(job.queueId)}/${encodeURIComponent(
            job.id
          )}`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!aborted) setDetailed(json);
      } catch (e) {
        console.error("[JobDetailsDialog] Failed to load details", e);
      }
    }
    loadDetails();
    return () => {
      aborted = true;
    };
  }, [
    job?.id,
    job?.queueId,
    Boolean(job?.returnValue),
    Boolean((job as any)?.returnvalue),
  ]);

  // Create effectiveJob that merges detailed data (similar to job-specific-data-view)
  const effectiveJob = useMemo(() => {
    if (!job) return null;
    if (!detailed) return job;
    return {
      ...job,
      returnValue:
        (detailed as any).returnvalue ??
        job.returnValue ??
        (job as any).returnvalue,
      // Merge both shapes from details
      data: {
        ...(job.data || {}),
        ...(detailed as any)?.data,
        ...(detailed as any)?.jobData,
      },
      progress: detailed.progress ?? job.progress,
      failedReason: detailed.failedReason ?? (job as any).failedReason,
      stacktrace: detailed.stacktrace || job.stacktrace,
    } as any;
  }, [job, detailed]);

  if (!job) return null;

  // Debug: log threadId sources for the selected job
  try {
    console.log("[JobDetailsDialog] Selected job debug", {
      jobId: job.id,
      queueId: job.queueId,
      dataThreadId: (job as any)?.data?.threadId,
      jobDataThreadId: (job as any)?.jobData?.threadId,
      company: (job as any)?.data?.company,
      mergedPreview: { ...(job as any)?.jobData, ...(job as any)?.data },
    });
  } catch (_) {}

  const stage = getWorkflowStages().find((s) => s.id === job.queueId);
  const needsApproval = !job.data.approved && !job.data.autoApprove;
  const canRetry = Boolean(job.isFailed);
  const hasParent = !!job.parent;

  const handleApprove = (approved: boolean) => {
    if (onApprove) {
      onApprove(approved);
      onOpenChange(false);
      toast.success(approved ? "Jobbet godkänt" : "Jobbet avvisat");
    }
  };

  const handleRetry = async () => {
    if (!job || !effectiveJob || !effectiveJob.queueId || !effectiveJob.id) {
      console.error("Cannot retry: missing job information");
      toast.error("Kunde inte köra om jobbet: saknar jobbinformation");
      return;
    }

    // Retry without overriding any data - send empty data object
    const requestData = {
      data: {},
    };

    try {
      const response = await fetch(
        `/api/queues/${encodeURIComponent(
          effectiveJob.queueId
        )}/${encodeURIComponent(effectiveJob.id)}/rerun`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to retry job:", errorText);
        toast.error(`Kunde inte köra om jobbet: ${errorText || "Okänt fel"}`);
        return;
      }

      const updatedJob = await response.json();
      console.log("Job retried successfully:", updatedJob);
      toast.success("Jobbet körs om");

      // Refresh job data
      if (job.queueId && job.id) {
        try {
          const res = await fetch(
            `/api/queues/${encodeURIComponent(
              job.queueId
            )}/${encodeURIComponent(job.id)}`
          );
          if (res.ok) {
            const json = await res.json();
            setDetailed(json);
          }
        } catch (e) {
          console.error("Failed to refresh job data:", e);
        }
      }

      // Call the onRetry callback if provided (for parent component updates)
      if (onRetry) {
        onRetry();
      }

      // Don't close the dialog automatically - let user see the updated status
    } catch (error) {
      console.error("Error retrying job:", error);
      toast.error(
        `Ett fel uppstod vid omkörning: ${
          error instanceof Error ? error.message : "Okänt fel"
        }`
      );
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
    // Merge possible worker data shapes so threadId/company are present regardless
    const merged = { ...(job as any)?.jobData, ...job.data } as Record<
      string,
      any
    >;
    const { companyName, description, schema, ...rest } = merged;
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
            <JobDialogFooter
              needsApproval={needsApproval}
              canRetry={false}
              approvalOnly={true}
              onApprove={handleApprove}
            />
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
              <ReturnValueSection job={effectiveJob ?? job} />
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
          <JobDialogFooter
            needsApproval={needsApproval}
            canRetry={canRetry}
            onApprove={handleApprove}
            onRetry={handleRetry}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
