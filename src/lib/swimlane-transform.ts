/**
 * Data transformation utilities for swimlane queue status
 * Converts API company data to swimlane format
 */

import type {
  CustomAPICompany,
  SwimlaneCompany,
  SwimlaneYearData,
} from "./types";
import { getJobStatus as getJobStatusFromUtils } from "./workflow-utils";

/**
 * Convert CustomAPICompany array to SwimlaneCompany array
 */
export function convertCompaniesToSwimlaneFormat(
  companies: CustomAPICompany[],
): SwimlaneCompany[] {
  if (!companies || companies.length === 0) {
    return [];
  }

  const getCompanyLatestTimestamp = (company: {
    years?: Array<{ latestTimestamp?: number }>;
  }): number => {
    if (!company.years || company.years.length === 0) return 0;
    return Math.max(...company.years.map((year) => year.latestTimestamp || 0));
  };

  const converted = companies
    .map((company) => {
      const companyName =
        company.company || company.processes?.[0]?.company || "Unknown";

      // Safety check: ensure processes array exists
      if (!company.processes || !Array.isArray(company.processes)) {
        console.warn(
          "SwimlaneQueueStatus - company missing processes array:",
          companyName,
          company,
        );
        return null;
      }

      const processesByYear = company.processes.reduce(
        (acc, process) => {
          const year = process.year || new Date().getFullYear();
          if (!acc[year]) {
            acc[year] = [];
          }
          acc[year].push(process);
          return acc;
        },
        {} as Record<number, typeof company.processes>,
      );

      const getProcessTimestamp = (
        process: (typeof company.processes)[0],
      ): number => {
        if (process.startedAt) return process.startedAt;
        if (process.finishedAt) return process.finishedAt;
        if (process.jobs && process.jobs.length > 0) {
          const latestJobTimestamp = Math.max(
            ...process.jobs.map((job) => job.timestamp || 0),
          );
          if (latestJobTimestamp > 0) return latestJobTimestamp;
        }
        return 0;
      };

      const years: SwimlaneYearData[] = [];
      Object.entries(processesByYear).forEach(([yearStr, yearProcesses]) => {
        const year = parseInt(yearStr);
        const sortedProcesses = [...yearProcesses].sort(
          (a, b) => getProcessTimestamp(b) - getProcessTimestamp(a),
        );

        sortedProcesses.forEach((process, index) => {
          const threadId =
            process.id ||
            (process as any)?.threadId ||
            (process as any)?.processId;

          const yearData: SwimlaneYearData & {
            threadId?: string;
            runIndex?: number;
            isLatestRun?: boolean;
          } = {
            year,
            attempts: yearProcesses.length,
            fields: {},
            jobs: (process.jobs || []).map((job) => {
              const convertedJob = {
                ...job,
                queueId: job.queue,
                opts: { attempts: (job as any).attemptsMade ?? 0 },
                threadId:
                  (job as any)?.threadId ?? (job as any)?.processId ?? threadId,
                data: {
                  ...job.data,
                  company: companyName,
                  companyName: companyName,
                  year: year,
                  threadId:
                    (job as any)?.threadId ??
                    (job as any)?.processId ??
                    threadId ??
                    (job as any)?.data?.threadId,
                  approved: job.approval?.approved || false,
                  autoApprove: job.autoApprove,
                  approval: job.approval || (job as any)?.data?.approval,
                },
                isFailed: job.status === "failed",
                finishedOn: job.finishedOn,
                processedOn: job.processedBy ? job.timestamp : undefined,
                timestamp: job.timestamp,
                returnvalue: job.returnvalue,
                attempts: job.attemptsMade,
                stacktrace: job.stacktrace || [],
              };

              return convertedJob;
            }),
            latestTimestamp: getProcessTimestamp(process),
            threadId: threadId,
            runIndex: index,
            isLatestRun: index === 0,
          };
          years.push(yearData);
        });
      });

      years.sort((a, b) => {
        if (a.year !== b.year) {
          const aHasApproval = (a.jobs || []).some((job) => {
            const status = getJobStatusFromUtils(job);
            return status === "needs_approval";
          });
          const bHasApproval = (b.jobs || []).some((job) => {
            const status = getJobStatusFromUtils(job);
            return status === "needs_approval";
          });

          if (aHasApproval && !bHasApproval) return -1;
          if (!aHasApproval && bHasApproval) return 1;

          return b.year - a.year;
        }

        const aRunIndex = (a as any).runIndex ?? 0;
        const bRunIndex = (b as any).runIndex ?? 0;
        return aRunIndex - bRunIndex;
      });

      const companyId =
        company.company ||
        company.wikidataId ||
        company.processes?.[0]?.id ||
        `${companyName}-${company.processes?.[0]?.startedAt || Date.now()}`;

      return {
        id: companyId,
        name: companyName,
        wikidataId: company.wikidataId,
        years,
      };
    })
    .filter((company): company is SwimlaneCompany => {
      // Filter out null companies (those missing processes)
      if (!company) return false;

      const hasValidYears = company.years && company.years.length > 0;
      if (!hasValidYears) {
        console.warn(
          "SwimlaneQueueStatus - filtering out company with no years:",
          company.name,
          company.id,
        );
      }
      return hasValidYears;
    })
    .sort((a, b) => {
      const aLatest = getCompanyLatestTimestamp(a);
      const bLatest = getCompanyLatestTimestamp(b);
      return bLatest - aLatest;
    });

  return converted;
}
