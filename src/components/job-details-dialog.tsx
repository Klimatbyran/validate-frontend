import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  QueueJob,
  DetailedJobResponse,
  QueueJobWithVariants,
} from "@/lib/types";
import { HelpCircle } from "lucide-react";
import { JobSpecificDataView } from "./job-specific-data-view";
import { JobDialogHeader } from "./job-details/JobDialogHeader";
import { DialogTabs } from "./job-details/DialogTabs";
import { JobDialogFooter } from "./job-details/JobDialogFooter";
import { TechnicalDataSection } from "./job-details/TechnicalDataSection";
import { ReturnValueSection } from "./job-details/ReturnValueSection";
import { JobMetadataSection } from "./job-details/JobMetadataSection";
import { ErrorSection } from "./job-details/ErrorSection";
import { JobStatusSection } from "./job-details/JobStatusSection";
import { JobRelationshipsSection } from "./job-details/JobRelationshipsSection";
import { SchemaSection } from "./job-details/SchemaSection";
import { authenticatedFetch } from "@/lib/api-helpers";

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
  const [detailed, setDetailed] = useState<DetailedJobResponse | null>(null);

  // Fetch detailed job data if returnValue is not present (similar to job-specific-data-view)
  useEffect(() => {
    if (!job) return;
    let aborted = false;
    async function loadDetails() {
      if (!job) return;
      if (job.returnValue || (job as QueueJobWithVariants).returnvalue) return;
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
    Boolean((job as QueueJobWithVariants)?.returnvalue),
  ]);

  // Create effectiveJob that merges detailed data (similar to job-specific-data-view)
  const effectiveJob = useMemo(() => {
    if (!job) return null;
    if (!detailed) return job;
    const jobWithVariants = job as QueueJobWithVariants;
    return {
      ...job,
      returnValue:
        detailed.returnvalue ?? job.returnValue ?? jobWithVariants.returnvalue,
      // Merge both shapes from details
      data: {
        ...(job.data || {}),
        ...detailed?.data,
        ...detailed?.jobData,
      },
      progress: detailed.progress ?? job.progress,
      failedReason: detailed.failedReason ?? jobWithVariants.failedReason,
      stacktrace: detailed.stacktrace || job.stacktrace,
    } as QueueJob;
  }, [job, detailed]);

  if (!job) return null;

  // Debug: log threadId sources for the selected job
  try {
    const jobWithVariants = job as QueueJobWithVariants;
    console.log("[JobDetailsDialog] Selected job debug", {
      jobId: job.id,
      queueId: job.queueId,
      dataThreadId: job.data?.threadId,
      jobDataThreadId: jobWithVariants?.jobData?.threadId,
      company: job.data?.company,
      mergedPreview: { ...jobWithVariants?.jobData, ...job.data },
    });
  } catch (_) {}

  const needsApproval = !job.data.approved && !job.data.autoApprove;
  const canRetry = Boolean(job.isFailed);

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
      const response = await authenticatedFetch(
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

  // Filter out schema and metadata fields from job data for user-friendly view
  const getFilteredJobDataWithoutSchema = () => {
    // Merge possible worker data shapes so threadId/company are present regardless
    const jobWithVariants = job as QueueJobWithVariants;
    const merged = { ...jobWithVariants?.jobData, ...job.data } as Record<
      string,
      unknown
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
              <JobStatusSection job={job} />
              <JobRelationshipsSection job={job} />

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
              <SchemaSection job={job} />
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
