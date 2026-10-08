import type {
  AlignmentRow,
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "./explore-types";
import {
  EMISSION_BUCKET_LABEL,
  emissionBucketForSectorLabel,
  emissionBucketForTefGroup,
  type EmissionBucket,
} from "./tef-groups";
import { namesMatch } from "./municipality-names";

export function pickEmissionsYear(
  byYear: Record<string, Record<string, number>>,
  mode: "latest" | "plan",
  planYear: number | null,
): string | null {
  const years = Object.keys(byYear)
    .map((y) => Number.parseInt(y, 10))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
  if (years.length === 0) return null;
  if (mode === "latest") return String(years[years.length - 1]);
  if (planYear == null) return String(years[years.length - 1]);
  const atOrBefore = [...years].reverse().find((y) => y <= planYear);
  return String(atOrBefore ?? years[0]);
}

function sharesFromCounts(
  counts: Record<string, number>,
): Record<string, number> {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total <= 0) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    out[key] = value / total;
  }
  return out;
}

export function alignmentRows(
  record: ExploreMunicipalityRecord,
  emissions: SectorYearEmissions | undefined,
  yearMode: "latest" | "plan",
): { year: string | null; rows: AlignmentRow[]; note: string } {
  if (!emissions) {
    return {
      year: null,
      rows: [],
      note: "No territorial sector emissions matched this municipality (Unearth / SMHI series).",
    };
  }

  const planYear = record.adoptedYear ?? parseYearLoose(record.adoptionDate);
  const year = pickEmissionsYear(emissions.byYear, yearMode, planYear);
  if (!year) {
    return {
      year: null,
      rows: [],
      note: "Sector emissions object had no year keys.",
    };
  }

  const sectors = emissions.byYear[year] ?? {};
  const emissionCounts: Record<EmissionBucket, number> = {
    transport: 0,
    industry: 0,
    energy: 0,
    heating: 0,
    agriculture: 0,
    machinery: 0,
    waste: 0,
    product: 0,
    other: 0,
  };
  for (const [label, tonnes] of Object.entries(sectors)) {
    emissionCounts[emissionBucketForSectorLabel(label)] += tonnes;
  }

  const tefCounts: Record<EmissionBucket, number> = {
    transport: 0,
    industry: 0,
    energy: 0,
    heating: 0,
    agriculture: 0,
    machinery: 0,
    waste: 0,
    product: 0,
    other: 0,
  };
  for (const hit of record.tefHits) {
    tefCounts[emissionBucketForTefGroup(hit.group)] += 1;
  }

  const emissionShares = sharesFromCounts(emissionCounts);
  const tefShares = sharesFromCounts(tefCounts);
  const buckets = Object.keys(EMISSION_BUCKET_LABEL) as EmissionBucket[];
  const rows: AlignmentRow[] = buckets
    .map((bucket) => {
      const emissionShare = emissionShares[bucket] ?? 0;
      const tefShare = tefShares[bucket] ?? 0;
      return { bucket, emissionShare, tefShare, gap: tefShare - emissionShare };
    })
    .filter((row) => row.emissionShare > 0 || row.tefShare > 0)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  return {
    year,
    rows,
    note:
      yearMode === "plan"
        ? `Using SMHI-style territorial sector totals for ${year} (closest year at or before plan year ${planYear ?? "unknown"}).`
        : `Using the latest available territorial sector totals (${year}).`,
  };
}

function parseYearLoose(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(19|20)\d{2}/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function findSectorEmissions(
  all: SectorYearEmissions[],
  municipalityName: string,
): SectorYearEmissions | undefined {
  return all.find((row) => namesMatch(row.municipalityName, municipalityName));
}

export function misalignmentScore(rows: AlignmentRow[]): number | null {
  if (rows.length === 0) return null;
  const sum = rows.reduce((s, row) => s + Math.abs(row.gap), 0);
  return sum / 2;
}
