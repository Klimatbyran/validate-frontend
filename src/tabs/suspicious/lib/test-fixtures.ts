import type { Company, ReportingPeriod } from "@/tabs/errors/types";

/** Emissions overrides accepted by `makePeriod`, in the prod API's shape. */
export interface PeriodInput {
  dataYear: number;
  reportYear?: number;
  scope1?: number | null;
  scope2mb?: number | null;
  scope2lb?: number | null;
  scope3StatedTotal?: number | null;
  statedTotal?: number | null;
  categories?: Record<number, number>;
  /** Data point ids that carry a `verifiedBy`, i.e. manually validated. */
  verified?: string[];
}

const GARBO_USER = { name: "Garbo (Klimatkollen)" };

function metadataFor(dataPointId: string, verified: string[] | undefined) {
  return verified?.includes(dataPointId)
    ? { verifiedBy: { name: "Reviewer" }, user: { name: "Reviewer" } }
    : { verifiedBy: null, user: GARBO_USER };
}

export function makePeriod(input: PeriodInput): ReportingPeriod {
  const { verified } = input;

  const categories = Object.entries(input.categories ?? {}).map(
    ([category, total]) => ({
      category: Number(category),
      total,
      metadata: metadataFor(`cat-${category}`, verified),
    }),
  );

  return {
    startDate: `${input.dataYear}-01-01`,
    endDate: `${input.dataYear}-12-31`,
    year: String(input.dataYear),
    companyReportId: `report-${input.dataYear}`,
    companyReport: {
      id: `report-${input.dataYear}`,
      reportYear: String(input.reportYear ?? input.dataYear),
      report: { url: `https://example.com/${input.dataYear}.pdf` },
    },
    emissions: {
      scope1:
        input.scope1 == null
          ? null
          : {
              total: input.scope1,
              metadata: metadataFor("scope1-total", verified),
            },
      scope2:
        input.scope2mb == null && input.scope2lb == null
          ? null
          : {
              mb: input.scope2mb ?? null,
              lb: input.scope2lb ?? null,
              metadata: metadataFor("scope2-mb", verified),
            },
      statedTotalEmissions:
        input.statedTotal == null
          ? null
          : {
              total: input.statedTotal,
              metadata: metadataFor("stated-total", verified),
            },
      scope3: {
        statedTotalEmissions:
          input.scope3StatedTotal == null
            ? null
            : {
                total: input.scope3StatedTotal,
                metadata: metadataFor("scope3-stated-total", verified),
              },
        categories,
      },
    },
  };
}

export function makeCompany(
  name: string,
  periods: PeriodInput[],
  options: { tags?: string[]; id?: string } = {},
): Company {
  return {
    id: options.id ?? `company-${name.toLowerCase().replace(/\s+/g, "-")}`,
    wikidataId: `Q${name.length}${periods.length}`,
    name,
    tags: options.tags ?? [],
    reportingPeriods: periods.map(makePeriod),
  };
}

/**
 * A peer group large enough to clear `minPeerCount`, all reporting the same
 * data point at a similar magnitude so an injected outlier stands out.
 */
export function makePeerGroup(
  count: number,
  dataYear: number,
  category: number,
  baseValue: number,
): Company[] {
  return Array.from({ length: count }, (_, index) =>
    makeCompany(`Peer ${index}`, [
      {
        dataYear,
        categories: { [category]: baseValue * (1 + (index % 5) * 0.05) },
      },
    ]),
  );
}
