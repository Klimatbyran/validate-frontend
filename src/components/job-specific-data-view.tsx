import React from "react";
import { QueueJob } from "@/lib/types";
import { MarkdownVectorPagesDisplay } from "./ui/markdown-display";
import { isMarkdown, isJsonString, getWikidataInfo } from "@/lib/utils";
import { FiscalYearDisplay } from "./ui/fiscal-year-display";
import { ScopeEmissionsDisplay } from "./scope-emissions-display";
import { MetadataDisplay } from "./ui/metadata-display";
import { ScreenshotSlideshow } from "./screenshot-slideshow";
import { CollapsibleSection } from "./ui/collapsible-section";
import { Image } from "lucide-react";
import { Scope3EmissionsDisplay } from "@/components/scope-emissions-display";

interface JobSpecificDataViewProps {
  data: any;
  job?: QueueJob;
}

// Utility function to parse return value data from job
function parseReturnValueData(job?: QueueJob): any {
  if (!job?.returnValue) return null;

  if (typeof job.returnValue === "string" && isJsonString(job.returnValue)) {
    try {
      return JSON.parse(job.returnValue);
    } catch (e) {
      return null;
    }
  } else if (typeof job.returnValue === "object") {
    // If returnValue.value exists, use it as the main return value
    if ("value" in job.returnValue && job.returnValue.value) {
      return job.returnValue.value;
    } else {
      return job.returnValue;
    }
  }
  return null;
}

// Helper function to get scope data from various sources
function getScopeData(processedData: any, returnValueData: any): any {
  const hasScopeData =
    (processedData.scope12 && Array.isArray(processedData.scope12)) ||
    (returnValueData &&
      typeof returnValueData === "object" &&
      Array.isArray(returnValueData.scope12)) ||
    (returnValueData &&
      typeof returnValueData === "object" &&
      returnValueData.value &&
      Array.isArray(returnValueData.value.scope12));

  if (!hasScopeData) return null;

  // Get scope data from any possible source
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

export function JobSpecificDataView({ data, job }: JobSpecificDataViewProps) {
  const [detailed, setDetailed] = React.useState<any | null>(null);
  const [, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    let aborted = false;
    async function loadDetails() {
      if (!job || job.returnValue) return;
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
  }, [job?.id, job?.queueId, Boolean(job?.returnValue)]);

  const effectiveJob = React.useMemo(() => {
    if (!job) return undefined;
    if (!detailed) return job;
    return {
      ...job,
      returnValue: detailed.returnvalue ?? job.returnValue,
      // Merge both shapes from details: base on original, then detailed.data, then detailed.jobData
      data: { ...(job.data || {}), ...(detailed as any)?.data, ...(detailed as any)?.jobData },
      progress: detailed.progress ?? job.progress,
      failedReason: detailed.failedReason ?? (job as any).failedReason,
      stacktrace: detailed.stacktrace || job.stacktrace,
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
  const wikidataId: string | undefined = React.useMemo(() => {
    const fromJob = getWikidataInfo(effectiveJob as any)?.node;
    const fromProcessed = (processedData as any)?.wikidataId || (processedData as any)?.wikidata?.node;
    const candidate = fromJob || fromProcessed;
    if (!candidate) return undefined;
    const id = typeof candidate === 'string' ? candidate : String(candidate);
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [effectiveJob, processedData]);

  React.useEffect(() => {
    try {
      console.log('[JobSpecificDataView] scope3 panel context', {
        jobId: job?.id,
        queueId: job?.queueId,
        hasReturnValue: !!job?.returnValue,
        derivedWikidataId: wikidataId,
        hasScope3Data: !!scope3Data,
      });
      console.log('[JobSpecificDataView] threadId sources', {
        dataThreadId: (job as any)?.data?.threadId,
        jobDataThreadId: (job as any)?.jobData?.threadId,
        effectiveDataThreadId: (effectiveJob as any)?.data?.threadId,
        detailedKeys: detailed ? Object.keys(detailed) : [],
        detailedDataKeys: (detailed as any)?.data ? Object.keys((detailed as any).data) : [],
        detailedJobDataKeys: (detailed as any)?.jobData ? Object.keys((detailed as any).jobData) : [],
      });
    } catch (_) {}
  }, [job?.id, job?.queueId, Boolean(job?.returnValue), wikidataId, Boolean(scope3Data), effectiveJob, detailed]);

  return (
    <div className="space-y-3 text-sm">
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

      {/* Show metadata if available (from returnValueData) */}
      {returnValueData &&
        typeof returnValueData === "object" &&
        "metadata" in returnValueData &&
        returnValueData.metadata && (
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
          key === "scope12"
        )
          return null;

        return (
          <div key={key} className="bg-gray-03/20 rounded-lg p-3">
            <div className="font-medium text-gray-01 mb-1">{key}</div>
            <div className="text-gray-02">{renderValue(value)}</div>
          </div>
        );
      })}
    </div>
  );
}
