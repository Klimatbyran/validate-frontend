import type { Company, ReportingPeriod } from "@/tabs/errors/types";
import { isProdReportingPeriodFullyVerified } from "@/tabs/errors/lib/verification";
import { getPeriodReportYear } from "@/tabs/editor/lib/reporting-period-ui";
import type { ArchiveRunSummary } from "@/tabs/jobbstatus/lib/archive-types";
import type { RegistryEntry } from "@/tabs/registry/lib/registry-types";
import { isWikidataIdPresent } from "@/tabs/registry/lib/registry-table-utils";
import {
  archiveRunHasFailedJobs,
  buildArchiveRunIndex,
  collectArchiveRunErrorLines,
  findLatestArchiveRunForRow,
  parseReportYearFromUrl,
  urlsLikelyMatch,
  type ArchiveRunIndex,
} from "./archive-run-match";
import type {
  OverviewRow,
  OverviewStats,
  OverviewStatusColumn,
  OverviewStatusDetail,
  OverviewStatusKind,
  OverviewViewMode,
} from "./overview-types";
import { overviewYearRange } from "./overview-types";
import {
  companyReportIdFromPeriods,
  rowMatchesGapFilters,
} from "./overview-row-gaps";

export type OverviewBuildInput = {
  registry: RegistryEntry[];
  archiveRuns: ArchiveRunSummary[];
  stageCompanies: Company[];
  prodCompanies: Company[];
};

function statusDetail(
  kind: OverviewStatusKind,
  summary: string,
  details: string[] = [],
  links?: OverviewStatusDetail["links"],
): OverviewStatusDetail {
  return { kind, summary, details, links };
}

function normalizeCompanyName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

export function companyRowKey(companyId: string, reportYear: string): string {
  return `company:${companyId}:${reportYear}`;
}

export function registryRowKey(entry: RegistryEntry): string {
  return `registry:${entry.id ?? entry.url}`;
}

function companyYearRowKey(
  wikidataId: string | null,
  companyName: string,
  reportYear: string,
): string {
  const idPart = isWikidataIdPresent(wikidataId)
    ? wikidataId!.trim().toUpperCase()
    : companyName.trim().toLowerCase() || "unknown";
  return `${idPart}:${reportYear}`;
}

function mergeCompanies(stageCompanies: Company[], prodCompanies: Company[]) {
  const byId = new Map<string, Company>();
  for (const company of [...stageCompanies, ...prodCompanies]) {
    const existing = byId.get(company.id);
    if (!existing) {
      byId.set(company.id, company);
      continue;
    }
    byId.set(company.id, {
      ...existing,
      ...company,
      tags: Array.from(
        new Set([...(existing.tags ?? []), ...(company.tags ?? [])]),
      ),
      reportingPeriods: [
        ...(existing.reportingPeriods ?? []),
        ...(company.reportingPeriods ?? []),
      ],
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function findGarboCompanyById(
  companies: Company[],
  companyId: string,
): Company | undefined {
  return companies.find((company) => company.id === companyId);
}

function periodsForReportYear(
  company: Company | undefined,
  reportYear: string,
): ReportingPeriod[] {
  if (!company?.reportingPeriods?.length) return [];
  return company.reportingPeriods.filter(
    (period) => getPeriodReportYear(period) === reportYear,
  );
}

function findRegistryEntryForCompanyYear(
  registry: RegistryEntry[],
  wikidataId: string | null,
  companyName: string,
  reportYear: string,
): RegistryEntry | null {
  if (isWikidataIdPresent(wikidataId)) {
    const wikidataMatch = registry.find(
      (entry) =>
        entry.wikidataId?.trim().toUpperCase() ===
          wikidataId!.trim().toUpperCase() &&
        entry.reportYear?.trim() === reportYear,
    );
    if (wikidataMatch) return wikidataMatch;
  }

  const normalizedName = normalizeCompanyName(companyName);
  return (
    registry.find(
      (entry) =>
        entry.reportYear?.trim() === reportYear &&
        normalizeCompanyName(entry.companyName) === normalizedName,
    ) ?? null
  );
}

function periodReportUrls(period: ReportingPeriod): string[] {
  return [
    (period as { reportURL?: string | null }).reportURL,
    (period as { s3Url?: string | null }).s3Url,
    (period as { reportS3Url?: string | null }).reportS3Url,
  ].filter((url): url is string => Boolean(url));
}

function resolveCompanyReportLink(
  entry: RegistryEntry,
  stageCompanies: Company[],
  prodCompanies: Company[],
): {
  companyReportId: string | null;
  companyId: string | null;
  details: string[];
} {
  const entryUrls = [entry.url, entry.s3Url].filter(Boolean);
  const reportYear = entry.reportYear?.trim() ?? null;
  const details: string[] = [];

  for (const companies of [prodCompanies, stageCompanies]) {
    for (const company of companies) {
      const wikidataMatches =
        isWikidataIdPresent(entry.wikidataId) &&
        company.wikidataId?.trim().toUpperCase() ===
          entry.wikidataId!.trim().toUpperCase();
      const nameMatches =
        normalizeCompanyName(company.name) ===
        normalizeCompanyName(entry.companyName);

      if (!wikidataMatches && !nameMatches) continue;

      for (const period of company.reportingPeriods ?? []) {
        const periodYear = getPeriodReportYear(period);
        if (reportYear && periodYear && periodYear !== reportYear) continue;

        const urlMatch = entryUrls.some((entryUrl) =>
          periodReportUrls(period).some((periodUrl) =>
            urlsLikelyMatch(entryUrl, periodUrl),
          ),
        );
        const yearMatch =
          Boolean(reportYear && periodYear && periodYear === reportYear) &&
          wikidataMatches;

        if (!urlMatch && !yearMatch) continue;

        const companyReportId =
          period.companyReportId ?? period.companyReport?.id ?? null;
        if (companyReportId) {
          details.push(
            `Linked via ${urlMatch ? "report URL" : "wikidata + report year"}.`,
            `CompanyReport ID: ${companyReportId}`,
            `Garbo company: ${company.name} (${company.id})`,
          );
          return {
            companyReportId,
            companyId: company.id,
            details,
          };
        }

        details.push(
          `Matched Garbo company ${company.name} but reporting period has no CompanyReport ID yet.`,
        );
      }
    }
  }

  return {
    companyReportId: null,
    companyId: null,
    details: details.length
      ? details
      : ["No CompanyReport link found in stage or prod data."],
  };
}

function summarizeArchiveRun(run: ArchiveRunSummary | null): {
  kind: OverviewStatusKind;
  summary: string;
  details: string[];
  hasErrors: boolean;
  errorDetails: string[];
} {
  if (!run) {
    return {
      kind: "missing",
      summary: "Not run",
      details: ["No archived pipeline run found for this report."],
      hasErrors: false,
      errorDetails: ["Pipeline has not been run (or run is not yet archived)."],
    };
  }

  const batchLabel = run.batch?.batchName
    ? `Batch: ${run.batch.batchName}`
    : null;
  const baseDetails = [
    `Thread: ${run.threadId}`,
    `Started: ${run.startedAt}`,
    `Updated: ${run.updatedAt}`,
    batchLabel,
    run.pdfUrl ? `PDF: ${run.pdfUrl}` : null,
  ].filter((line): line is string => Boolean(line));

  const errorLines = collectArchiveRunErrorLines(run);
  const hasErrors = archiveRunHasFailedJobs(run);

  if (hasErrors) {
    return {
      kind: "error",
      summary: "Failed",
      details: baseDetails,
      hasErrors: true,
      errorDetails: errorLines.length
        ? errorLines.slice(0, 8)
        : [`Run ${run.threadId} failed.`],
    };
  }

  if (run.status.toLowerCase() === "running") {
    return {
      kind: "progress",
      summary: "Running",
      details: baseDetails,
      hasErrors: false,
      errorDetails: ["Pipeline run is still in progress."],
    };
  }

  if (run.status.toLowerCase() === "completed") {
    return {
      kind: "ok",
      summary: "Completed",
      details: baseDetails,
      hasErrors: false,
      errorDetails: ["No pipeline errors in the archived run."],
    };
  }

  return {
    kind: "partial",
    summary: run.status,
    details: baseDetails,
    hasErrors: false,
    errorDetails: ["No explicit pipeline errors in the archived run."],
  };
}

function buildReportStatus(entry: RegistryEntry | null): OverviewStatusDetail {
  if (!entry) {
    return statusDetail("missing", "No report", [
      "No registry entry for this company and report year.",
    ]);
  }

  const links: OverviewStatusDetail["links"] = [];
  if (entry.url) {
    links.push({ label: "Report URL", href: entry.url, external: true });
  }
  if (entry.s3Url) {
    links.push({ label: "S3 file", href: entry.s3Url, external: true });
  }

  return statusDetail(
    entry.url || entry.s3Url ? "ok" : "warning",
    entry.url || entry.s3Url ? "In registry" : "Incomplete entry",
    [
      entry.url ? `URL: ${entry.url}` : "No URL on registry entry.",
      entry.s3Url ? `S3: ${entry.s3Url}` : "No cached S3 file.",
    ],
    links.length ? links : undefined,
  );
}

function buildRegistryFileStatus(entry: RegistryEntry): OverviewStatusDetail {
  const links: OverviewStatusDetail["links"] = [];
  if (entry.url) {
    links.push({ label: "Report URL", href: entry.url, external: true });
  }
  if (entry.s3Url) {
    links.push({ label: "S3 file", href: entry.s3Url, external: true });
  }

  if (!entry.url && !entry.s3Url) {
    return statusDetail("warning", "No file URLs", [
      "Registry entry exists but has no report URL or S3 file.",
    ]);
  }

  return statusDetail(
    "ok",
    "File saved",
    [
      entry.url ? `URL: ${entry.url}` : "No source URL.",
      entry.s3Url ? `S3: ${entry.s3Url}` : "No S3 cache.",
      entry.sha256 ? `SHA256: ${entry.sha256}` : "No file hash recorded.",
    ],
    links.length ? links : undefined,
  );
}

function buildWikidataStatus(
  wikidataId: string | null | undefined,
): OverviewStatusDetail {
  if (isWikidataIdPresent(wikidataId)) {
    return statusDetail("ok", "Present", [
      `Wikidata ID: ${wikidataId!.trim()}`,
    ]);
  }
  return statusDetail("warning", "Missing", [
    "Registry entry has no Wikidata ID — harder to match to Garbo companies and company-year coverage.",
  ]);
}

function buildCompanyReportStatus(link: {
  companyReportId: string | null;
  companyId: string | null;
  details: string[];
}): OverviewStatusDetail {
  const links: OverviewStatusDetail["links"] = [];
  if (link.companyId) {
    links.push({
      label: "Open editor",
      href: `/editor/company/${encodeURIComponent(link.companyId)}`,
    });
  }

  if (link.companyReportId) {
    return statusDetail(
      "ok",
      "Linked",
      [`CompanyReport ID: ${link.companyReportId}`, ...link.details],
      links.length ? links : undefined,
    );
  }

  return statusDetail(
    "missing",
    "Not linked",
    link.details,
    links.length ? links : undefined,
  );
}

function buildDataPresenceStatus(
  periods: ReportingPeriod[],
  environment: "stage" | "prod",
): OverviewStatusDetail {
  if (periods.length === 0) {
    return statusDetail("missing", `Not in ${environment}`, [
      `No reporting periods in ${environment} for this report year.`,
    ]);
  }

  const dataYears = [
    ...new Set(
      periods
        .map((period) => period.year ?? period.endDate?.slice(0, 4))
        .filter(Boolean),
    ),
  ];

  return statusDetail("ok", `In ${environment}`, [
    `${periods.length} reporting period(s) in ${environment}.`,
    dataYears.length
      ? `Data years: ${dataYears.join(", ")}`
      : "Data years not listed on periods.",
  ]);
}

function buildProdVerifiedStatus(
  periods: ReportingPeriod[],
): OverviewStatusDetail {
  if (periods.length === 0) {
    return statusDetail("missing", "No prod data", [
      "Cannot verify emissions without prod reporting periods.",
    ]);
  }

  const withEmissions = periods.filter((period) => Boolean(period.emissions));
  if (withEmissions.length === 0) {
    return statusDetail("missing", "No emissions", [
      "Prod periods exist but contain no emissions data.",
    ]);
  }

  const verifiedCount = withEmissions.filter((period) =>
    isProdReportingPeriodFullyVerified(period),
  ).length;

  if (verifiedCount === withEmissions.length) {
    return statusDetail("ok", "Verified", [
      `All ${withEmissions.length} prod period(s) with emissions are verified.`,
    ]);
  }

  if (verifiedCount === 0) {
    return statusDetail("warning", "Unverified", [
      `${withEmissions.length} prod period(s) with emissions, none fully verified.`,
    ]);
  }

  return statusDetail("partial", "Partly verified", [
    `${verifiedCount} of ${withEmissions.length} prod period(s) fully verified.`,
  ]);
}

function pipelineLinks(
  companyId: string | null,
): OverviewStatusDetail["links"] {
  const links: OverviewStatusDetail["links"] = [
    { label: "Open job status archive", href: "/jobbstatus?source=archive" },
  ];
  if (companyId) {
    links.unshift({
      label: "Open editor",
      href: `/editor/company/${encodeURIComponent(companyId)}`,
    });
  }
  return links;
}

function buildPipelineErrorsStatus(
  archiveRun: ArchiveRunSummary | null,
  links: OverviewStatusDetail["links"],
): OverviewStatusDetail {
  if (!archiveRun) {
    return statusDetail(
      "missing",
      "Not assessed",
      [
        "No archived pipeline run for this company and report year.",
        "Errors are only shown after a run exists in the queue archive.",
      ],
      links,
    );
  }

  const runStatus = archiveRun.status.toLowerCase();
  if (runStatus === "running") {
    return statusDetail(
      "missing",
      "Run in progress",
      ["Pipeline is still running — job outcomes are not final yet."],
      links,
    );
  }

  const jobs = archiveRun.jobs ?? [];
  if (jobs.length === 0) {
    return statusDetail(
      "missing",
      "No jobs",
      [
        "Archived run exists but has no job records for this report.",
        "Cannot confirm a clean pipeline pass without jobs.",
      ],
      links,
    );
  }

  if (archiveRunHasFailedJobs(archiveRun)) {
    const errorLines = collectArchiveRunErrorLines(archiveRun);
    return statusDetail(
      "error",
      "Errors found",
      errorLines.length
        ? errorLines.slice(0, 8)
        : [`Run ${archiveRun.threadId} failed.`],
      links,
    );
  }

  const allJobsCompleted = jobs.every(
    (job) => job.status.toLowerCase() === "completed",
  );
  if (allJobsCompleted) {
    return statusDetail(
      "ok",
      "No errors",
      [`All ${jobs.length} archived job(s) completed successfully.`],
      links,
    );
  }

  return statusDetail(
    "warning",
    "Incomplete",
    ["Some archived jobs are not in a completed state."],
    links,
  );
}

function buildPipelineStatuses(
  archiveRun: ArchiveRunSummary | null,
  companyId: string | null,
): Pick<OverviewRow["statuses"], "pipeline" | "pipelineErrors"> {
  const pipelineSummary = summarizeArchiveRun(archiveRun);
  const links = pipelineLinks(companyId);

  return {
    pipeline: statusDetail(
      pipelineSummary.kind,
      pipelineSummary.summary,
      pipelineSummary.details,
      links,
    ),
    pipelineErrors: buildPipelineErrorsStatus(archiveRun, links),
  };
}

export function buildCompanyYearRows(input: OverviewBuildInput): OverviewRow[] {
  const archiveIndex = buildArchiveRunIndex(input.archiveRuns);
  const companies = mergeCompanies(input.stageCompanies, input.prodCompanies);
  const years = overviewYearRange();
  const rows: OverviewRow[] = [];

  for (const company of companies) {
    for (const reportYear of years) {
      const registryEntry = findRegistryEntryForCompanyYear(
        input.registry,
        company.wikidataId ?? null,
        company.name,
        reportYear,
      );
      const rowKey = companyRowKey(company.id, reportYear);
      const archiveLookupKey = companyYearRowKey(
        company.wikidataId ?? null,
        company.name,
        reportYear,
      );
      const archiveRun = findLatestArchiveRunForRow({
        index: archiveIndex,
        rowKey: archiveLookupKey,
        registryUrl: registryEntry?.url,
        runUrl: registryEntry?.url ?? null,
      });

      const stagePeriods = periodsForReportYear(
        findGarboCompanyById(input.stageCompanies, company.id),
        reportYear,
      );
      const prodPeriods = periodsForReportYear(
        findGarboCompanyById(input.prodCompanies, company.id),
        reportYear,
      );
      const companyReportId =
        companyReportIdFromPeriods(prodPeriods) ??
        companyReportIdFromPeriods(stagePeriods);

      rows.push({
        key: rowKey,
        viewMode: "companyYears",
        companyName: company.name,
        wikidataId: isWikidataIdPresent(company.wikidataId)
          ? company.wikidataId!.trim()
          : null,
        companyId: company.id,
        reportYear,
        companyReportId,
        tags: company.tags ?? [],
        registryEntry,
        runUrl: registryEntry?.url ?? null,
        statuses: {
          report: buildReportStatus(registryEntry),
          ...buildPipelineStatuses(archiveRun, company.id),
          stageData: buildDataPresenceStatus(stagePeriods, "stage"),
          prodData: buildDataPresenceStatus(prodPeriods, "prod"),
          prodVerified: buildProdVerifiedStatus(prodPeriods),
        },
      });
    }
  }

  return rows.sort((a, b) => {
    const nameCompare = a.companyName.localeCompare(b.companyName);
    if (nameCompare !== 0) return nameCompare;
    return (b.reportYear ?? "").localeCompare(a.reportYear ?? "");
  });
}

export function buildRegistryReportRows(
  input: OverviewBuildInput,
): OverviewRow[] {
  const archiveIndex = buildArchiveRunIndex(input.archiveRuns);

  return input.registry
    .map((entry) => {
      const reportYear = entry.reportYear?.trim() || null;
      const companyReportLink = resolveCompanyReportLink(
        entry,
        input.stageCompanies,
        input.prodCompanies,
      );
      const archiveLookupKey =
        reportYear && /^\d{4}$/.test(reportYear)
          ? companyYearRowKey(
              entry.wikidataId ?? null,
              entry.companyName ?? "",
              reportYear,
            )
          : (entry.id ?? entry.url);
      const archiveRun = findLatestArchiveRunForRow({
        index: archiveIndex,
        rowKey: archiveLookupKey,
        registryUrl: entry.url,
        runUrl: entry.url ?? entry.s3Url ?? null,
      });

      const companyId = companyReportLink.companyId;
      const tags =
        companyId != null
          ? [
              ...new Set([
                ...(findGarboCompanyById(input.prodCompanies, companyId)
                  ?.tags ?? []),
                ...(findGarboCompanyById(input.stageCompanies, companyId)
                  ?.tags ?? []),
              ]),
            ]
          : [];

      return {
        key: registryRowKey(entry),
        viewMode: "registryReports" as const,
        companyName: (entry.companyName ?? "").trim() || "Unknown company",
        wikidataId: isWikidataIdPresent(entry.wikidataId)
          ? entry.wikidataId!.trim()
          : null,
        companyId,
        reportYear,
        companyReportId: companyReportLink.companyReportId,
        tags,
        registryEntry: entry,
        runUrl: entry.url ?? null,
        statuses: {
          wikidata: buildWikidataStatus(entry.wikidataId),
          registryFile: buildRegistryFileStatus(entry),
          companyReport: buildCompanyReportStatus(companyReportLink),
          ...buildPipelineStatuses(archiveRun, companyId),
        },
      };
    })
    .sort((a, b) => {
      const nameCompare = a.companyName.localeCompare(b.companyName);
      if (nameCompare !== 0) return nameCompare;
      return (b.reportYear ?? "").localeCompare(a.reportYear ?? "");
    });
}

export function computeOverviewStats(
  rows: OverviewRow[],
  viewMode: OverviewViewMode,
): OverviewStats {
  const pipelineCompleted = rows.filter(
    (row) => row.statuses.pipeline?.kind === "ok",
  ).length;
  const pipelineFailed = rows.filter(
    (row) => row.statuses.pipeline?.kind === "error",
  ).length;

  if (viewMode === "registryReports") {
    return {
      totalRows: rows.length,
      missingWikidata: rows.filter(
        (row) => row.statuses.wikidata?.kind !== "ok",
      ).length,
      linkedCompanyReport: rows.filter(
        (row) => row.statuses.companyReport?.kind === "ok",
      ).length,
      pipelineCompleted,
      pipelineFailed,
    };
  }

  return {
    totalRows: rows.length,
    withReport: rows.filter((row) => row.statuses.report?.kind === "ok").length,
    inStage: rows.filter((row) => row.statuses.stageData?.kind === "ok").length,
    inProd: rows.filter((row) => row.statuses.prodData?.kind === "ok").length,
    prodVerified: rows.filter((row) => row.statuses.prodVerified?.kind === "ok")
      .length,
    pipelineCompleted,
    pipelineFailed,
  };
}

export function rowMatchesOverviewFilters(
  row: OverviewRow,
  filters: {
    searchQuery: string;
    reportYears: string[];
    tagSlugs: string[];
    statusFilters: OverviewStatusColumn[];
    missingRegistryOnly: boolean;
    missingCompanyReportOnly: boolean;
    notRunInPipelineOnly: boolean;
  },
): boolean {
  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    const haystack = [
      row.companyName,
      row.wikidataId ?? "",
      row.companyId ?? "",
      row.reportYear ?? "",
      row.companyReportId ?? "",
      row.registryEntry?.url ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (
    filters.reportYears.length > 0 &&
    row.reportYear &&
    !filters.reportYears.includes(row.reportYear)
  ) {
    return false;
  }

  if (filters.tagSlugs.length > 0) {
    const tagSet = new Set(row.tags.map((tag) => tag.toLowerCase()));
    const selected = filters.tagSlugs.map((tag) => tag.toLowerCase());
    if (!selected.some((tag) => tagSet.has(tag))) return false;
  }

  if (filters.statusFilters.length > 0) {
    const matchesAny = filters.statusFilters.some((column) => {
      const kind = row.statuses[column]?.kind;
      return kind === "warning" || kind === "error" || kind === "missing";
    });
    if (!matchesAny) return false;
  }

  if (!rowMatchesGapFilters(row, filters)) {
    return false;
  }

  return true;
}
