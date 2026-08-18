import { getPeriodDataYear } from "@/tabs/editor/lib/reporting-period-ui";
import { pickOnePeriodPerDataYear } from "@/tabs/editor/lib/reporting-period-public-read";
import type { ReportingPeriod } from "../types";
import {
  getCrossEnvPeriodShellKey,
  getPeriodIdentityKeys,
  resolveSlotCompanyReportId,
  resolveCompanyReportSourceUrl,
} from "./cross-env-report-shell";
import { getPeriodReportYearFromApi } from "./emissions";
import { UnionFind } from "./union-find";

export type ReportingPeriodComparisonSlot = {
  shellKey: string;
  /** Every identity key (sha256/url/fallback) any member of this shell carries - use this,
   * not `shellKey` alone, to look the shell back up in the *other* env's periods. */
  identityKeys: string[];
  companyReportId: string | null;
  reportYear: number | null;
  reportUrl: string | null;
  stagePeriod: ReportingPeriod | null;
  prodPeriod: ReportingPeriod | null;
};

function periodMatchesDataYear(
  period: ReportingPeriod,
  dataYear: number,
): boolean {
  const dataYearKey = getPeriodDataYear(period);
  if (!dataYearKey) return false;
  const parsed = Number(dataYearKey);
  return Number.isFinite(parsed) && parsed === dataYear;
}

function periodMatchesReportYearFilter(
  period: ReportingPeriod,
  reportYear: number | null,
): boolean {
  if (reportYear == null) return true;
  return getPeriodReportYearFromApi(period) === reportYear;
}

/**
 * All reporting periods matching data year and optional PDF report year,
 * collapsed to one per data year - a company can have two CompanyReport
 * shells covering the same data year (e.g. a re-processed duplicate); this
 * picks the same one the public API would serve (`pickOnePeriodPerDataYear`),
 * so stage/prod comparisons never show a value as missing when it's really
 * just stranded on a losing duplicate shell.
 */
export function pickReportingPeriodsForFilters(
  reportingPeriods: ReportingPeriod[] | undefined,
  dataYear: number,
  reportYear?: number | null,
): ReportingPeriod[] {
  if (!reportingPeriods?.length) return [];
  const reportYearFilter = reportYear ?? null;
  const matched = reportingPeriods.filter(
    (period) =>
      periodMatchesDataYear(period, dataYear) &&
      periodMatchesReportYearFilter(period, reportYearFilter),
  );
  return pickOnePeriodPerDataYear(matched);
}

type ComparisonEnv = "stage" | "prod";
type ComparisonNodeId = `${ComparisonEnv}:${number}`;

/**
 * One period per CompanyReport shell, unioned across stage and prod.
 *
 * Pairing uses every identity key a period carries (sha256 *and* url), not just each
 * period's single preferred key - so a shell still pairs when only one side has a
 * populated `Report.sha256` (e.g. right after a report is reprocessed on stage but
 * prod's row predates the sha256 column). Matching on a single preferred key per side
 * would otherwise split one real report into two unpaired "stage-only"/"prod-only"
 * slots the moment the two sides' preferred keys diverge.
 */
export function buildReportingPeriodComparisonSlots(
  stagePeriods: ReportingPeriod[] | undefined,
  prodPeriods: ReportingPeriod[] | undefined,
  dataYear: number,
  reportYear: number | null,
): ReportingPeriodComparisonSlot[] {
  const stageMatched = pickReportingPeriodsForFilters(
    stagePeriods,
    dataYear,
    reportYear,
  );
  const prodMatched = pickReportingPeriodsForFilters(
    prodPeriods,
    dataYear,
    reportYear,
  );

  const uf = new UnionFind<ComparisonNodeId>();
  const nodePeriod = new Map<ComparisonNodeId, ReportingPeriod>();
  const keyToNodes = new Map<string, ComparisonNodeId[]>();

  const register = (env: ComparisonEnv, periods: ReportingPeriod[]) => {
    periods.forEach((period, index) => {
      const id: ComparisonNodeId = `${env}:${index}`;
      uf.add(id);
      nodePeriod.set(id, period);
      for (const key of getPeriodIdentityKeys(period)) {
        const nodes = keyToNodes.get(key) ?? [];
        nodes.push(id);
        keyToNodes.set(key, nodes);
      }
    });
  };

  register("stage", stageMatched);
  register("prod", prodMatched);

  for (const nodes of keyToNodes.values()) {
    for (let i = 1; i < nodes.length; i++) {
      uf.union(nodes[0]!, nodes[i]!);
    }
  }

  const slots = Array.from(uf.groups().values()).map((members) => {
    const stage = members.find((id) => id.startsWith("stage:"));
    const prod = members.find((id) => id.startsWith("prod:"));
    const stagePeriod = stage ? (nodePeriod.get(stage) ?? null) : null;
    const prodPeriod = prod ? (nodePeriod.get(prod) ?? null) : null;

    const identityKeys = Array.from(
      new Set(
        members.flatMap((id) => getPeriodIdentityKeys(nodePeriod.get(id)!)),
      ),
    );

    const anchor = stagePeriod ?? prodPeriod;
    const shellKey = anchor
      ? getCrossEnvPeriodShellKey(anchor)
      : (identityKeys[0] ?? "");
    const reportUrl = anchor ? resolveCompanyReportSourceUrl(anchor) : null;

    return {
      shellKey,
      identityKeys,
      companyReportId: resolveSlotCompanyReportId(shellKey, anchor),
      reportYear: anchor ? getPeriodReportYearFromApi(anchor) : null,
      reportUrl,
      stagePeriod,
      prodPeriod,
    };
  });

  return slots.sort((a, b) => {
    const yearA = a.reportYear ?? 0;
    const yearB = b.reportYear ?? 0;
    if (yearA !== yearB) return yearB - yearA;
    return (a.companyReportId ?? "").localeCompare(b.companyReportId ?? "");
  });
}

export function findReportingPeriodForShell(
  reportingPeriods: ReportingPeriod[] | undefined,
  dataYear: number,
  reportYear: number | null,
  identityKeys: string[],
): ReportingPeriod | null {
  const keySet = new Set(identityKeys);
  return (
    pickReportingPeriodsForFilters(reportingPeriods, dataYear, reportYear).find(
      (period) => getPeriodIdentityKeys(period).some((key) => keySet.has(key)),
    ) ?? null
  );
}
