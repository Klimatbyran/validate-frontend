import {
  attachCompanyReportIdToPeriodPatch,
  resolveCompanyReportId,
} from "@/tabs/editor/lib/company-report-shells";
import type {
  GarboReportingPeriodSummary,
  ReportingPeriodWritePayload,
} from "@/tabs/editor/lib/types";
import { getPeriodDataYear } from "@/tabs/editor/lib/reporting-period-ui";
import { pickOnePeriodPerDataYear } from "@/tabs/editor/lib/reporting-period-public-read";
import {
  DATA_POINTS,
  type Company,
  type ReportingPeriod,
} from "@/tabs/errors/types";
import type { SuspicionFinding } from "../types";

/** Pipeline list periods are structurally the Editor period summary. */
function asEditorPeriod(period: ReportingPeriod): GarboReportingPeriodSummary {
  return period as GarboReportingPeriodSummary;
}

const EMISSION_UNIT = "tCO2e";

const SCOPE2_DATA_POINT_IDS = new Set([
  "scope2-mb",
  "scope2-lb",
  "scope2-unknown",
]);

export function parseInputNumber(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function isScope2DataPoint(dataPointId: string): boolean {
  return SCOPE2_DATA_POINT_IDS.has(dataPointId);
}

export function buildEmissionsPatch(
  dataPointId: string,
  value: number,
  verified = true,
): Record<string, unknown> | null {
  if (dataPointId === "scope1-total") {
    return { scope1: { total: value, unit: EMISSION_UNIT, verified } };
  }
  if (dataPointId === "scope2-mb") {
    return { scope2: { mb: value, unit: EMISSION_UNIT, verified } };
  }
  if (dataPointId === "scope2-lb") {
    return { scope2: { lb: value, unit: EMISSION_UNIT, verified } };
  }
  if (dataPointId === "scope2-unknown") {
    return { scope2: { unknown: value, unit: EMISSION_UNIT, verified } };
  }
  if (dataPointId === "stated-total") {
    return {
      statedTotalEmissions: { total: value, unit: EMISSION_UNIT, verified },
    };
  }
  if (dataPointId === "scope3-stated-total") {
    return {
      scope3: {
        statedTotalEmissions: { total: value, unit: EMISSION_UNIT, verified },
      },
    };
  }

  const dataPoint = DATA_POINTS.find((item) => item.id === dataPointId);
  if (dataPoint && "category" in dataPoint && dataPoint.category) {
    return {
      scope3: {
        categories: [
          {
            category: dataPoint.category,
            total: value,
            unit: EMISSION_UNIT,
            verified,
          },
        ],
      },
    };
  }

  return null;
}

export function isWritableDataPoint(dataPointId: string): boolean {
  return buildEmissionsPatch(dataPointId, 0) !== null;
}

export function findPeriodForFinding(
  companies: Company[],
  finding: Pick<SuspicionFinding, "companyId" | "dataYear">,
): ReportingPeriod | null {
  const company = companies.find((item) => item.id === finding.companyId);
  if (!company) return null;
  const periods = pickOnePeriodPerDataYear(company.reportingPeriods ?? []);
  return (
    periods.find(
      (period) => getPeriodDataYear(period) === String(finding.dataYear),
    ) ?? null
  );
}

export type ReportingPeriodWriteBody = {
  reportingPeriods: ReportingPeriodWritePayload[];
  companyReportId?: string;
  metadata?: { comment?: string };
};

/**
 * A correction flips the value's provenance to manually validated, which takes
 * it out of reach of the rules that flagged it, so the comment explaining the
 * change is required rather than defaulted.
 */
export function buildReportingPeriodWriteBody(
  period: ReportingPeriod,
  dataPointId: string,
  value: number,
  comment: string,
): ReportingPeriodWriteBody | null {
  const emissions = buildEmissionsPatch(dataPointId, value, true);
  if (!emissions || !period.startDate || !period.endDate) return null;

  const note = comment.trim();
  if (!note) return null;

  const editorPeriod = asEditorPeriod(period);
  const reportingPeriod = attachCompanyReportIdToPeriodPatch(editorPeriod, {
    startDate: period.startDate,
    endDate: period.endDate,
    ...(period.reportURL ? { reportURL: period.reportURL } : {}),
    emissions,
  });

  const companyReportId = resolveCompanyReportId(editorPeriod);

  return {
    ...(companyReportId ? { companyReportId } : {}),
    metadata: { comment: note },
    reportingPeriods: [reportingPeriod],
  };
}
