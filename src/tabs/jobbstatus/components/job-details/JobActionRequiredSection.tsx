/**
 * Staff action UI for pipeline jobs — shown above dialog tabs so actions are
 * visible on both Overview and Technical details.
 */

import React from "react";
import type { DetailedJobResponse, QueueJob } from "@/lib/types";
import { getJobStatus, isResolvableCompanyName } from "@/lib/workflow-utils";
import {
  getCompanyLinkApprovalData,
  getWikidataApprovalData,
  hasPendingStructuredApproval,
} from "../../lib/job-specific-data-parsing";
import { useJobRerunActions } from "../../hooks/useJobRerunActions";
import { JobApprovalPanels } from "./JobApprovalPanels";

interface JobActionRequiredSectionProps {
  job?: QueueJob;
  detailed: DetailedJobResponse | null;
  onDetailedChange: React.Dispatch<
    React.SetStateAction<DetailedJobResponse | null>
  >;
}

function companyNameFromJob(
  effectiveJob?: QueueJob,
  job?: QueueJob,
): string | undefined {
  const name =
    effectiveJob?.data?.companyName ||
    job?.data?.companyName ||
    effectiveJob?.data?.company ||
    job?.data?.company;
  if (!name) return undefined;
  const nameString = typeof name === "string" ? name : String(name);
  const trimmed = nameString.trim();
  return isResolvableCompanyName(trimmed) ? trimmed : undefined;
}

export function JobActionRequiredSection({
  job,
  detailed,
  onDetailedChange,
}: JobActionRequiredSectionProps) {
  const effectiveJob = React.useMemo(() => {
    if (!job) return undefined;
    if (!detailed) return job;
    return {
      ...job,
      status: (detailed as { status?: string }).status ?? job.status,
      data: {
        ...(job.data || {}),
        ...(detailed as { data?: Record<string, unknown> })?.data,
      },
      failedReason:
        (detailed as { failedReason?: string }).failedReason ??
        (job as { failedReason?: string }).failedReason,
    } as QueueJob;
  }, [job, detailed]);

  const {
    handleWikidataApprove,
    handleWikidataOverride,
    handleCompanyLinkApprove,
    handleCompanyNameOverride,
  } = useJobRerunActions({
    job,
    effectiveJob,
    detailed,
    setDetailed: onDetailedChange,
  });

  const companyLinkApprovalData = getCompanyLinkApprovalData(job, effectiveJob);
  const wikidataApprovalData = getWikidataApprovalData(job, effectiveJob);
  const pendingStructuredApproval = hasPendingStructuredApproval(
    effectiveJob?.data,
  );
  const showUnresolvedApprovalHint =
    pendingStructuredApproval &&
    !wikidataApprovalData &&
    !companyLinkApprovalData;
  const isLoadingApprovalDetails =
    pendingStructuredApproval && !detailed && Boolean(job?.queueId && job?.id);

  const companyName = companyNameFromJob(effectiveJob, job);

  const showCompanyNameOverride = React.useMemo(() => {
    if (!effectiveJob || effectiveJob.queueId !== "precheck") return false;

    const status = getJobStatus(effectiveJob);
    if (status === "completed") return true;

    const waitingForCompanyName =
      effectiveJob.data?.waitingForCompanyName === true;
    const isDelayed = effectiveJob.status === "delayed";
    const hasNoStructuredApproval = !hasPendingStructuredApproval(
      effectiveJob.data,
    );

    if (
      waitingForCompanyName &&
      (isDelayed || status === "waiting") &&
      hasNoStructuredApproval
    ) {
      return true;
    }

    if (
      isDelayed &&
      hasNoStructuredApproval &&
      !isResolvableCompanyName(companyName) &&
      !effectiveJob.data?.approval
    ) {
      return true;
    }

    if (status === "failed") {
      const failedReason = String(
        (effectiveJob as { failedReason?: string }).failedReason ?? "",
      );
      return (
        failedReason.includes("Could not identify company name") ||
        failedReason.includes("companyName provided in job data")
      );
    }

    return false;
  }, [effectiveJob, companyName]);

  return (
    <JobApprovalPanels
      companyLinkApprovalData={companyLinkApprovalData}
      wikidataApprovalData={wikidataApprovalData}
      showCompanyNameOverride={showCompanyNameOverride}
      companyName={companyName}
      missingCompanyNameForOverride={!companyName}
      showUnresolvedApprovalHint={showUnresolvedApprovalHint}
      isLoadingApprovalDetails={isLoadingApprovalDetails}
      onCompanyLinkApprove={handleCompanyLinkApprove}
      onWikidataApprove={handleWikidataApprove}
      onWikidataOverride={handleWikidataOverride}
      onCompanyNameOverride={handleCompanyNameOverride}
    />
  );
}
