import React from "react";
import { QueueJob } from "@/lib/types";
import { MarkdownVectorPagesDisplay } from "./ui/markdown-display";
import { isMarkdown, isJsonString, getWikidataInfo } from "@/lib/utils";
import { FiscalYearDisplay } from "./ui/fiscal-year-display";
import { ScopeEmissionsDisplay } from "./scope-emissions-display";
import { MetadataDisplay } from "./ui/metadata-display";
import { ScreenshotSlideshow } from "./screenshot-slideshow";
import { CollapsibleSection } from "./ui/collapsible-section";
import { Image, ExternalLink, FileText, RotateCcw, AlertCircle } from "lucide-react";
import { Scope3EmissionsDisplay } from "@/components/scope-emissions-display";
import { WikidataApprovalDisplay } from "./wikidata-approval-display";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getJobStatus } from "@/lib/workflow-utils";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/lib/api-helpers";
import { buildRerunRequestData } from "@/lib/job-rerun-utils";

interface JobSpecificDataViewProps {
  data: any;
  job?: QueueJob;
}

// Utility function to parse return value data from job
function parseReturnValueData(job?: QueueJob): any {
  const rawReturnValue = job?.returnvalue;
  if (!rawReturnValue) return null;

  if (typeof rawReturnValue === "string" && isJsonString(rawReturnValue)) {
    try {
      return JSON.parse(rawReturnValue);
    } catch (e) {
      return null;
    }
  } else if (typeof rawReturnValue === "object") {
    // If returnValue.value exists, use it as the main return value
    if ("value" in rawReturnValue && (rawReturnValue as any).value) {
      return (rawReturnValue as any).value;
    } else {
      return rawReturnValue;
    }
  }
  return null;
}

// Helper function to get scope 1+2 array data from various sources
function getScopeData(processedData: any, returnValueData: any): any {
  // Check for scope12 (combined) format
  const hasScope12Data =
    (processedData.scope12 && Array.isArray(processedData.scope12)) ||
    (returnValueData &&
      typeof returnValueData === "object" &&
      Array.isArray(returnValueData.scope12)) ||
    (returnValueData &&
      typeof returnValueData === "object" &&
      returnValueData.value &&
      Array.isArray(returnValueData.value.scope12));

  if (hasScope12Data) {
    // Get scope data from any possible source (scope12 format)
    if (processedData.scope12 && Array.isArray(processedData.scope12)) {
      return processedData.scope12;
    } else if (
      returnValueData &&
      typeof returnValueData === "object" &&
      Array.isArray(returnValueData.scope12)
    ) {
      return returnValueData.scope12;
    } else if (
      returnValueData &&
      typeof returnValueData === "object" &&
      returnValueData.value &&
      Array.isArray(returnValueData.value.scope12)
    ) {
      return returnValueData.value.scope12;
    }
  }

  // Check for separate scope1 or scope2 top-level format (from split workers)
  // Workers now return { scope1: [...] } or { scope2: [...] } instead of { scope12: [...] }
  const getScope1Array = (data: any): any[] | null => {
    if (data?.scope1 && Array.isArray(data.scope1)) return data.scope1;
    if (data?.value?.scope1 && Array.isArray(data.value.scope1)) return data.value.scope1;
    return null;
  };

  const getScope2Array = (data: any): any[] | null => {
    if (data?.scope2 && Array.isArray(data.scope2)) return data.scope2;
    if (data?.value?.scope2 && Array.isArray(data.value.scope2)) return data.value.scope2;
    return null;
  };

  const scope1Array = getScope1Array(processedData) || getScope1Array(returnValueData);
  const scope2Array = getScope2Array(processedData) || getScope2Array(returnValueData);

  if (scope1Array || scope2Array) {
    // Convert to scope12 format for display components
    // The arrays contain objects with year and nested scope1/scope2 data
    const dataToConvert = scope1Array || scope2Array;
    return dataToConvert;
  }

  return null;
}

// Helper to get scope 3 data from various sources
function getScope3Data(processedData: any, returnValueData: any): any {
  const hasScope3 = (
    (processedData.scope3 && Array.isArray(processedData.scope3)) ||
    (returnValueData && typeof returnValueData === 'object' && Array.isArray((returnValueData as any).scope3)) ||
    (returnValueData && typeof returnValueData === 'object' && (returnValueData as any).value && Array.isArray((returnValueData as any).value.scope3))
  );
  if (!hasScope3) return null;
  if (processedData.scope3 && Array.isArray(processedData.scope3)) return processedData.scope3;
  if (returnValueData && typeof returnValueData === 'object' && Array.isArray((returnValueData as any).scope3)) return (returnValueData as any).scope3;
  if (returnValueData && typeof returnValueData === 'object' && (returnValueData as any).value && Array.isArray((returnValueData as any).value.scope3)) return (returnValueData as any).value.scope3;
  return null;
}

// Helper to get wikidata approval data from approval object
function getWikidataApprovalData(job?: QueueJob, effectiveJob?: any): any {
  const jobData = effectiveJob?.data || job?.data;
  const approval = jobData?.approval;
  
  if (approval && typeof approval === "object") {
    // Check if it's a wikidata approval with approved: false (pending)
    if (
      approval.type === "wikidata" &&
      approval.approved === false &&
      approval.data?.newValue?.wikidata &&
      typeof approval.data.newValue.wikidata === "object" &&
      approval.data.newValue.wikidata.node
    ) {
      return {
        status: "pending_approval",
        wikidata: approval.data.newValue.wikidata,
        message: approval.summary || "Waiting for approval",
        metadata: approval.metadata || {},
      };
    }
    
    // Also check if approved: true (approved status)
    if (
      approval.type === "wikidata" &&
      approval.approved === true &&
      approval.data?.newValue?.wikidata &&
      typeof approval.data.newValue.wikidata === "object" &&
      approval.data.newValue.wikidata.node
    ) {
      return {
        status: "approved",
        wikidata: approval.data.newValue.wikidata,
        message: approval.summary || "Approved",
        metadata: approval.metadata || {},
      };
    }
  }
  
  // Fallback: Hard-coded pending_approval for all guessWikidata jobs (for testing)
  // Only use this if no real data exists
  if (job?.queueId === "guessWikidata") {
    return {
      status: "pending_approval",
      wikidata: {
        node: "Q123456",
        url: "https://wikidata.org/wiki/Q123456",
        label: "Example Company AB",
        description: "Swedish company"
      },
      message: "Wikidata selection for Example Company AB - waiting for approval",
      metadata: {
        source: "wikidata-search",
        comment: "Wikidata found via search and LLM selection"
      }
    };
  }
  
  return null;
}

// Company Name Override Display Component for precheck jobs
interface CompanyNameOverrideDisplayProps {
  currentCompanyName?: string;
  onOverride?: (overrideCompanyName: string) => void;
}

function CompanyNameOverrideDisplay({
  currentCompanyName,
  onOverride,
}: CompanyNameOverrideDisplayProps) {
  const [overrideName, setOverrideName] = React.useState("");
  const [overrideError, setOverrideError] = React.useState("");

  const handleOverrideChange = (value: string) => {
    setOverrideName(value);
    setOverrideError("");

    // Validate that it's not empty
    if (value && !value.trim()) {
      setOverrideError("Företagsnamn kan inte vara tomt");
    }
  };

  const handleOverrideSubmit = () => {
    if (!overrideName.trim()) {
      setOverrideError("Ange ett företagsnamn");
      return;
    }

    const trimmedName = overrideName.trim();
    if (!trimmedName) {
      setOverrideError("Företagsnamn kan inte vara tomt");
      return;
    }

    if (onOverride) {
      onOverride(trimmedName);
      // Reset the input after submission
      setOverrideName("");
    }
  };

  return (
    <div className="mb-4 space-y-4">
      <div className="bg-blue-03/10 rounded-lg p-4 space-y-3 border border-blue-03/20">
        <h4 className="text-base font-medium text-blue-03">
          Ändra företagsnamn
        </h4>
        <p className="text-sm text-blue-03/80">
          Om det företagsnamn som hittades i förkontrollen inte är korrekt, kan du ange ett
          nytt namn här. Jobbet kommer att köras om med det nya namnet.
        </p>

        {/* Current company name display */}
        {currentCompanyName && (
          <div className="bg-gray-03/20 rounded-lg p-3">
            <div className="text-xs text-gray-02 mb-1">Nuvarande företagsnamn</div>
            <div className="text-sm text-gray-01 font-medium">{currentCompanyName}</div>
          </div>
        )}

        <div className="space-y-2">
          <div>
            <label
              htmlFor="override-company-name"
              className="block text-xs text-gray-02 mb-1"
            >
              Nytt företagsnamn
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="override-company-name"
                type="text"
                value={overrideName}
                onChange={(e) => handleOverrideChange(e.target.value)}
                placeholder="Ange nytt företagsnamn"
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-sm",
                  "bg-gray-04 text-gray-01",
                  "focus:outline-none focus:ring-2 focus:ring-blue-03 focus:border-transparent",
                  overrideError
                    ? "border-pink-03 focus:ring-pink-03"
                    : "border-gray-03"
                )}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleOverrideSubmit}
                disabled={!!overrideError || !overrideName.trim()}
                className="h-9 px-4"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Spara och kör om
              </Button>
            </div>
            {overrideError && (
              <div className="text-xs text-pink-03 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{overrideError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobSpecificDataView({ data, job }: JobSpecificDataViewProps) {
  const [detailed, setDetailed] = React.useState<any | null>(null);
  const [, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    let aborted = false;
    async function loadDetails() {
      if (!job || job.returnvalue) return;
      if (!job.queueId || !job.id) return;
      try {
        setIsLoading(true);
        const res = await fetch(`/api/queues/${encodeURIComponent(job.queueId)}/${encodeURIComponent(job.id)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!aborted) setDetailed(json);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    }
    loadDetails();
    return () => { aborted = true; };
  }, [job?.id, job?.queueId, Boolean(job?.returnvalue)]);

  const effectiveJob = React.useMemo(() => {
    if (!job) return undefined;
    if (!detailed) return job;
    return {
      ...job,
      // Prefer freshest lifecycle fields from detailed response
      status: (detailed as any).status ?? job.status,
      processedOn: (detailed as any).processedOn ?? job.processedOn,
      finishedOn: (detailed as any).finishedOn ?? job.finishedOn,
      isFailed: (detailed as any).isFailed ?? job.isFailed,
      timestamp: (detailed as any).timestamp ?? job.timestamp,
      // Merge return value and data (deterministic shapes for detailed job responses)
      returnvalue: (detailed as any).returnvalue ?? job.returnvalue,
      // Merge data from list job and detailed job (no legacy jobData shape)
      data: {
        ...(job.data || {}),
        ...(detailed as any)?.data,
      },
      progress: (detailed as any).progress ?? job.progress,
      failedReason: (detailed as any).failedReason ?? (job as any).failedReason,
      stacktrace: (detailed as any).stacktrace || job.stacktrace,
    } as any;
  }, [job, detailed]);

  const processedData =
    typeof data === "string" && isJsonString(data) ? JSON.parse(data) : data;

  // Parse return value data from job
  const returnValueData = parseReturnValueData(effectiveJob);

  // List of technical fields to hide from the user-friendly view
  const technicalFields = ["autoApprove", "threadId", "messageId", "url"];

  function ValueList({ items }: { items: any[] }) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {items.map((item, i) => (
          <li key={i}>{renderValue(item)}</li>
        ))}
      </ul>
    );
  }

  function ValueObject({ obj }: { obj: Record<string, any> }) {
    return (
      <div className="pl-4 border-l-2 border-gray-03/50 mt-2 space-y-2">
        {Object.entries(obj).map(([key, value]) => {
          if (technicalFields.includes(key)) return null;
          return (
            <div key={key}>
              <span className="font-medium text-gray-01">{key}:</span>{" "}
              {renderValue(value)}
            </div>
          );
        })}
      </div>
    );
  }

  const renderValue = (value: any): React.ReactNode => {
    if (value === null)
      return <span className="text-gray-02">Inget värde</span>;
    if (typeof value === "boolean") return value ? "Ja" : "Nej";
    if (typeof value === "string") {
      return isMarkdown(value) ? (
        <MarkdownVectorPagesDisplay value={value} />
      ) : (
        value
      );
    }
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) return <ValueList items={value} />;
    if (typeof value === "object") return <ValueObject obj={value} />;
    return String(value);
  };

  if (typeof processedData !== "object") {
    return <div>{String(processedData)}</div>;
  }

  // Get scope data for rendering
  const scopeData = getScopeData(processedData, returnValueData);
  const scope3Data = getScope3Data(processedData, returnValueData);
  const wikidataApprovalData = getWikidataApprovalData(job, effectiveJob);
  const wikidataId: string | undefined = React.useMemo(() => {
    const fromJob = getWikidataInfo(effectiveJob as any)?.node;
    const fromProcessed = (processedData as any)?.wikidataId || (processedData as any)?.wikidata?.node;
    const fromApproval = wikidataApprovalData?.wikidata?.node;
    const candidate = fromJob || fromProcessed || fromApproval;
    if (!candidate) return undefined;
    const id = typeof candidate === 'string' ? candidate : String(candidate);
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [effectiveJob, processedData, wikidataApprovalData]);

  // Get URL from multiple possible sources
  const jobUrl: string | undefined = React.useMemo(() => {
    const url = 
      effectiveJob?.data?.url || 
      job?.data?.url || 
      processedData?.url ||
      (effectiveJob as any)?.url ||
      (job as any)?.url;
    if (!url) return undefined;
    const urlString = typeof url === 'string' ? url : String(url);
    return urlString.trim() || undefined;
  }, [effectiveJob, job, processedData]);

  // Get company name from multiple possible sources
  const companyName: string | undefined = React.useMemo(() => {
    const name = 
      effectiveJob?.data?.companyName || 
      job?.data?.companyName || 
      processedData?.companyName ||
      effectiveJob?.data?.company ||
      job?.data?.company ||
      processedData?.company;
    if (!name) return undefined;
    const nameString = typeof name === 'string' ? name : String(name);
    return nameString.trim() || undefined;
  }, [effectiveJob, job, processedData]);

  // Check if this is a completed precheck job
  const isCompletedPrecheck = React.useMemo(() => {
    if (!effectiveJob || effectiveJob.queueId !== "precheck") return false;
    const status = getJobStatus(effectiveJob);
    return status === "completed";
  }, [effectiveJob]);

  React.useEffect(() => {
    try {
      console.log('[JobSpecificDataView] scope3 panel context', {
        jobId: job?.id,
        queueId: job?.queueId,
        hasReturnValue: !!job?.returnvalue,
        derivedWikidataId: wikidataId,
        hasScope3Data: !!scope3Data,
      });
      console.log('[JobSpecificDataView] threadId sources', {
        dataThreadId: (job as any)?.data?.threadId,
        effectiveDataThreadId: (effectiveJob as any)?.data?.threadId,
        detailedKeys: detailed ? Object.keys(detailed) : [],
        detailedDataKeys: (detailed as any)?.data ? Object.keys((detailed as any).data) : [],
      });
    } catch (_) {}
  }, [job?.id, job?.queueId, Boolean(job?.returnvalue), wikidataId, Boolean(scope3Data), effectiveJob, detailed]);

  // Helper function to refresh job data after rerun
  const refreshJobData = async () => {
    if (job?.queueId && job?.id) {
      try {
        const res = await fetch(`/api/queues/${encodeURIComponent(job.queueId)}/${encodeURIComponent(job.id)}`);
        if (res.ok) {
          const json = await res.json();
          setDetailed(json);
        }
      } catch (e) {
        console.error("Failed to refresh job data:", e);
      }
    }
  };

  // Handle approve callback - sets approved: true and re-runs the job
  const handleWikidataApprove = async () => {
    if (!effectiveJob || !effectiveJob.queueId || !effectiveJob.id) {
      console.error("Cannot approve: missing job information");
      toast.error("Kunde inte godkänna: saknar jobbinformation");
      return;
    }

    const requestData = {
      data: {
        approval: {
          approved: true,
        },
      },
    };

    try {
      const response = await authenticatedFetch(
        `/api/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to approve and re-run job:", errorText);
        toast.error(`Kunde inte godkänna jobbet: ${errorText || "Okänt fel"}`);
        return;
      }

      const updatedJob = await response.json();
      console.log("Job approved and re-run successfully:", updatedJob);
      toast.success("Jobbet godkänt och körs om");
      
      await refreshJobData();
    } catch (error) {
      console.error("Error approving job:", error);
      toast.error(`Ett fel uppstod vid godkännande: ${error instanceof Error ? error.message : "Okänt fel"}`);
    }
  };

  // Handle override callback - saves overrideWikidataId and re-runs the job
  const handleWikidataOverride = async (overrideWikidataId: string) => {
    if (!effectiveJob || !effectiveJob.queueId || !effectiveJob.id) {
      console.error("Cannot re-run: missing job information");
      toast.error("Kunde inte köra om jobbet: saknar jobbinformation");
      return;
    }

    const requestData = {
      data: {
        overrideWikidataId: overrideWikidataId,
      },
    };

    try {
      const response = await authenticatedFetch(
        `/api/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to re-run job:", errorText);
        toast.error(`Kunde inte köra om jobbet: ${errorText || "Okänt fel"}`);
        return;
      }

      const updatedJob = await response.json();
      console.log("Job re-run successfully:", updatedJob);
      toast.success("Jobbet körs om med det nya Wikidata ID:t");
      
      await refreshJobData();
    } catch (error) {
      console.error("Error re-running job:", error);
      toast.error(`Ett fel uppstod vid omkörning: ${error instanceof Error ? error.message : "Okänt fel"}`);
    }
  };

  // Handle company name override callback - saves overrideCompanyName and re-runs the job
  const handleCompanyNameOverride = async (overrideCompanyName: string) => {
    if (!effectiveJob || !effectiveJob.queueId || !effectiveJob.id) {
      console.error("Cannot re-run: missing job information");
      toast.error("Kunde inte köra om jobbet: saknar jobbinformation");
      return;
    }

    const requestData = {
      data: {
        companyName: overrideCompanyName,
        waitingForCompanyName: true,
      },
    };

    try {
      const response = await authenticatedFetch(
        `/api/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to re-run job:", errorText);
        toast.error(`Kunde inte köra om jobbet: ${errorText || "Okänt fel"}`);
        return;
      }

      const updatedJob = await response.json();
      console.log("Job re-run successfully:", updatedJob);
      toast.success("Jobbet körs om med det nya företagsnamnet");
      
      await refreshJobData();
    } catch (error) {
      console.error("Error re-running job:", error);
      toast.error(`Ett fel uppstod vid omkörning: ${error instanceof Error ? error.message : "Okänt fel"}`);
    }
  };

  // Handle general rerun (without data overrides)
  const handleRerun = async () => {
    if (!effectiveJob || !effectiveJob.queueId || !effectiveJob.id) {
      console.error("Cannot rerun: missing job information");
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
        `/api/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to rerun job:", errorText);
        toast.error(`Kunde inte köra om jobbet: ${errorText || "Okänt fel"}`);
        return;
      }

      const updatedJob = await response.json();
      console.log("Job rerun successfully:", updatedJob);
      toast.success("Jobbet körs om");
      
      await refreshJobData();
    } catch (error) {
      console.error("Error rerunning job:", error);
      toast.error(`Ett fel uppstod vid omkörning: ${error instanceof Error ? error.message : "Okänt fel"}`);
    }
  };

  // Helper flags for follow-up scope jobs
  const isFollowUpScope12Job =
    effectiveJob && effectiveJob.queueId === "followUpScope12";
  const isFollowUpScope3Job =
    effectiveJob && effectiveJob.queueId === "followUpScope3";
  const isFollowUpScope1Job =
    effectiveJob && effectiveJob.queueId === "followUpScope1";
  const isFollowUpScope2Job =
    effectiveJob && effectiveJob.queueId === "followUpScope2";

  // Generic handler for "rerun and save" operations
  const handleRerunAndSave = async (queueName: string, scopes: string[], label: string) => {
    if (!effectiveJob?.id) {
      toast.error("Kunde inte köra om jobbet: saknar jobbinformation");
      return;
    }

    try {
      const response = await authenticatedFetch(
        `/api/queues/${queueName}/${encodeURIComponent(effectiveJob.id)}/rerun-and-save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scopes }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Kunde inte köra om och spara ${label}: ${errorText || "Okänt fel"}`);
        return;
      }

      toast.success(`${label} körs om och sparas`);
      await refreshJobData();
    } catch (error) {
      toast.error(`Ett fel uppstod vid omkörning: ${error instanceof Error ? error.message : "Okänt fel"}`);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      {/* Show URL if available */}
      {jobUrl && (
        <div className="mb-4">
          <div className="bg-gray-03/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-03/20">
                  <FileText className="w-5 h-5 text-blue-03" />
                </div>
                <div>
                  <h4 className="text-base font-medium text-gray-01">Rapport</h4>
                  <p className="text-sm text-gray-02 truncate max-w-md">{jobUrl}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex-shrink-0"
              >
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-03 hover:text-blue-04"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Öppna
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Show Wikidata Approval Display if available (for guessWikidata step) */}
      {wikidataApprovalData && (
        <div className="mb-4">
          <WikidataApprovalDisplay
            data={wikidataApprovalData}
            onOverride={handleWikidataOverride}
            onApprove={handleWikidataApprove}
          />
        </div>
      )}

      {/* Show Company Name Override for completed precheck jobs */}
      {isCompletedPrecheck && (
        <CompanyNameOverrideDisplay
          currentCompanyName={companyName}
          onOverride={handleCompanyNameOverride}
        />
      )}

      {/* Show Fiscal Year display if available */}
      {(processedData.fiscalYear ||
        (processedData.startMonth && processedData.endMonth)) && (
        <div className="mb-4">
          <FiscalYearDisplay data={{ fiscalYear: processedData.fiscalYear }} />
        </div>
      )}

      {/* Show Scope 1+2 emissions data if available */}
      {scopeData && (
        <div className="mb-4">
          <ScopeEmissionsDisplay data={{ scope12: scopeData }} wikidataId={wikidataId} />
        </div>
      )}
      {/* Combined Scope 1+2 value is now surfaced inside the Scope 1 card in the Scope 1 & 2 panel */}
      {/* Show Scope 3 emissions data if available */}
      {scope3Data && (
        <div className="mb-4">
          <Scope3EmissionsDisplay data={{ scope3: scope3Data }} wikidataId={wikidataId} />
        </div>
      )}
      {/* Show Screenshot slideshow if scopeData and PDF URL exist */}
      {scopeData && job?.data?.url && (
        <CollapsibleSection
          title="Screenshots"
          icon={<Image />}
          bgColor="bg-purple-100/40"
          borderColor="border-purple-300"
          textColor="text-purple-900"
          iconColor="text-purple-700"
        >
          <ScreenshotSlideshow pdfUrl={job.data.url} />
        </CollapsibleSection>
      )}

      {/* Show metadata if available (from returnValueData) - but skip if it's already shown in wikidata approval */}
      {returnValueData &&
        typeof returnValueData === "object" &&
        "metadata" in returnValueData &&
        returnValueData.metadata &&
        !wikidataApprovalData && (
          <MetadataDisplay metadata={returnValueData.metadata} />
        )}

      {Object.entries(processedData).map(([key, value]) => {
        // Skip technical fields and special fields (since we're showing them separately)
        if (
          technicalFields.includes(key) ||
          key === "wikidata" ||
          key === "fiscalYear" ||
          key === "startMonth" ||
          key === "endMonth" ||
          key === "scope12" ||
          key === "scope1" ||
          key === "scope2"
        )
          return null;

        return (
          <div key={key} className="bg-gray-03/20 rounded-lg p-3">
            <div className="font-medium text-gray-01 mb-1">{key}</div>
            <div className="text-gray-02">{renderValue(value)}</div>
          </div>
        );
      })}

      {/* Rerun Buttons */}
      {effectiveJob && effectiveJob.queueId && effectiveJob.id && (
        <div className="mt-6 pt-4 border-t border-gray-03 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRerun}
            className="text-blue-03 hover:bg-blue-03/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Kör om jobbet
          </Button>
          {isFollowUpScope12Job && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRerunAndSave("followUpScope12", ["scope1", "scope2"], "Scope 1+2")}
              className="text-green-03 hover:bg-green-03/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Kör om och spara Scope 1+2
            </Button>
          )}
          {isFollowUpScope1Job && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRerunAndSave("followUpScope1", ["scope1"], "Scope 1")}
              className="text-green-03 hover:bg-green-03/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Kör om och spara Scope 1
            </Button>
          )}
          {isFollowUpScope2Job && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRerunAndSave("followUpScope2", ["scope2"], "Scope 2")}
              className="text-green-03 hover:bg-green-03/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Kör om och spara Scope 2
            </Button>
          )}
          {isFollowUpScope3Job && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRerunAndSave("followUpScope3", ["scope3"], "Scope 3")}
              className="text-green-03 hover:bg-green-03/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Kör om och spara Scope 3
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
