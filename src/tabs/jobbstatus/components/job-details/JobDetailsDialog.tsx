import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/ui/dialog";
import { Callout } from "@/ui/callout";
import { toast } from "sonner";
import { QueueJob, DetailedJobResponse, SwimlaneYearData } from "@/lib/types";
import { HelpCircle, RotateCcw } from "lucide-react";
import { JobSpecificDataView } from "./JobSpecificDataView";
import { JobDialogHeader } from "./JobDialogHeader";
import { DialogTabs } from "./DialogTabs";
import { JobDialogFooter } from "./JobDialogFooter";
import { TechnicalDataSection } from "./TechnicalDataSection";
import { ReturnValueSection } from "./ReturnValueSection";
import { JobMetadataSection } from "./JobMetadataSection";
import { ErrorSection } from "./ErrorSection";
import { JobStatusSection } from "./JobStatusSection";
import { JobRelationshipsSection } from "./JobRelationshipsSection";
import { SchemaSection } from "./SchemaSection";
import { authenticatedFetch } from "@/lib/api-helpers";
import { buildRerunRequestData, buildRerunAndSaveBody, QUEUE_TO_FOLLOW_UP_KEY } from "@/lib/job-rerun-utils";
import { getQueueDisplayName } from "@/lib/workflow-config";
import { findJobByQueueId } from "@/lib/workflow-utils";
import { getWikidataInfo } from "@/lib/utils";
import { Button } from "@/ui/button";

interface JobDetailsDialogProps {
  job: QueueJob | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (approved: boolean) => void;
  onRetry?: () => void;
  missingQueueId?: string;
  yearData?: SwimlaneYearData;
  /** When true, this job is one of multiple runs for the same queue in this run (orange triangle on grid) */
  isRerun?: boolean;
}

export function JobDetailsDialog({
  job,
  isOpen,
  onOpenChange,
  onApprove,
  onRetry,
  missingQueueId,
  yearData,
  isRerun = false,
}: JobDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<"user" | "technical">("user");
  const [detailed, setDetailed] = useState<DetailedJobResponse | null>(null);

  // Fetch detailed job data if returnValue is not present (similar to job-specific-data-view)
  useEffect(() => {
    if (!job) return;
    let aborted = false;
    async function loadDetails() {
      if (!job) return;
      // If we already have a return value on the job, no need to fetch details
      if (job.returnvalue) return;
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
    Boolean(job?.returnvalue),
  ]);

  // Create effectiveJob that merges detailed data (similar to job-specific-data-view)
  const effectiveJob = useMemo(() => {
    if (!job) return null;
    if (!detailed) return job;
    return {
      ...job,
      returnvalue: detailed.returnvalue ?? job.returnvalue,
      data: {
        ...(job.data || {}),
        ...detailed?.data,
      },
      progress: detailed.progress ?? job.progress,
      failedReason: detailed.failedReason ?? job.failedReason,
      stacktrace: detailed.stacktrace || job.stacktrace,
    } as QueueJob;
  }, [job, detailed]);

  // Handle missing follow-up job: show empty dialog with "Run and save" button
  if (!job && missingQueueId && yearData) {
    const followUpKey = QUEUE_TO_FOLLOW_UP_KEY[missingQueueId];
    const displayName = getQueueDisplayName(missingQueueId);
    const extractEmissionsJob = findJobByQueueId("extractEmissions", yearData);
    const checkDBJob = findJobByQueueId("checkDB", yearData);
    const wikidata = getWikidataInfo(checkDBJob);

    const handleRunAndSave = async () => {
      if (!extractEmissionsJob?.id) {
        toast.error("Kan inte köra: hittade ingen extractEmissions-förälder för denna körning");
        return;
      }

      try {
        const response = await authenticatedFetch(
          `/api/queues/extractEmissions/${encodeURIComponent(extractEmissionsJob.id)}/rerun-and-save`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildRerunAndSaveBody([followUpKey], wikidata)),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          toast.error(`Kunde inte köra ${displayName}: ${errorText || "Okänt fel"}`);
          return;
        }

        toast.success(`${displayName} körs och sparas`);
        onOpenChange(false);
      } catch (error) {
        toast.error(`Ett fel uppstod: ${error instanceof Error ? error.message : "Okänt fel"}`);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-03/30">
                <HelpCircle className="w-6 h-6 text-gray-02" />
              </div>
              <h2 className="text-lg font-semibold text-gray-01">{displayName}</h2>
              <p className="text-sm text-gray-02">
                Det här jobbet har inte körts ännu.
              </p>
            </div>

            {!extractEmissionsJob && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-300">
                Kunde inte hitta ett extractEmissions-jobb i denna körning. Jobbet kan inte triggas utan en förälder.
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRunAndSave}
                disabled={!extractEmissionsJob}
                className="text-green-03 hover:bg-green-03/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Kör och spara {displayName}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!job) return null;

  // Debug: log threadId sources for the selected job
  try {
    console.log("[JobDetailsDialog] Selected job debug", {
      jobId: job.id,
      queueId: job.queueId,
      dataThreadId: job.data?.threadId,
      company: job.data?.company,
      mergedPreview: { ...job.data },
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

    const requestData = buildRerunRequestData(
      effectiveJob.queueId,
      job,
      effectiveJob,
      detailed
    );

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
    const merged = (job.data || {}) as Record<string, unknown>;
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
                <Callout
                  variant="info"
                  title="Godkännande krävs"
                  description="Vänligen granska informationen och godkänn eller avvisa."
                  icon={<HelpCircle className="w-5 h-5" />}
                />

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
              <JobStatusSection job={job} isRerun={isRerun} />
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

              <ErrorSection
                job={effectiveJob ?? job}
                setActiveTab={setActiveTab}
              />
            </>
          )}
          {activeTab === "technical" && (
            <>
              <SchemaSection job={job} />
              <ReturnValueSection job={effectiveJob ?? job} />
              <TechnicalDataSection job={job} />
              <ErrorSection
                job={effectiveJob ?? job}
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
