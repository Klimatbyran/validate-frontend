import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
  TefFrameworkScope,
} from "./explore-types";
import { findSectorEmissions, pickEmissionsYear } from "./explore-alignment";
import { foldRegionName, namesMatch } from "./municipality-names";
import {
  emissionBucketForSectorLabel,
  type EmissionBucket,
} from "./tef-groups";
import {
  TEF_SECTORS,
  sectorIdFromGroup,
  sectorIdFromIndex,
  type TefSectorId,
} from "./tef-framework";

/** SMHI-style buckets that feed each TEF column header. */
export const TEF_SECTOR_EMISSION_BUCKETS: Record<
  TefSectorId,
  readonly EmissionBucket[]
> = {
  transport: ["transport"],
  industry: ["industry"],
  afolu: ["agriculture"],
  buildings: ["heating"],
  energy: ["energy"],
  waste: ["waste"],
};

export function filterRecordsByScope(
  records: ExploreMunicipalityRecord[],
  scope: TefFrameworkScope,
  placeName: string | null,
): ExploreMunicipalityRecord[] {
  if (scope === "all" || !placeName) return records;
  if (scope === "municipality") {
    return records.filter((r) => namesMatch(r.name, placeName));
  }
  const target = foldRegionName(placeName);
  return records.filter((r) => {
    const region = r.regionName ?? r.county;
    if (!region) return false;
    return foldRegionName(region) === target;
  });
}

/** Map pipeline gate-domain strings ("Waste", "T-6", "transport") to a TEF sector. */
export function tefSectorFromGateDomain(
  value: string | null | undefined,
): TefSectorId | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const indexMatch = trimmed.match(/^T-(\d)/i);
  if (indexMatch) {
    const id = sectorIdFromIndex(`T-${indexMatch[1]}`);
    return id === "other" ? null : id;
  }

  const fromGroup = sectorIdFromGroup(trimmed);
  if (fromGroup !== "other") return fromGroup;

  const key = trimmed.toLowerCase();
  for (const sector of TEF_SECTORS) {
    if (sector.label.toLowerCase() === key) return sector.id;
    if (sector.code.toLowerCase() === key) return sector.id;
  }
  return null;
}

export interface SectorEmissionShare {
  sectorId: TefSectorId;
  tonnes: number;
  /** Share of mapped (six-sector) tonnes in scope; 0 when total is 0. */
  share: number;
}

export function sectorEmissionSharesForScope(
  records: ExploreMunicipalityRecord[],
  sectorEmissions: SectorYearEmissions[],
  scope: TefFrameworkScope,
  placeName: string | null,
): { bySector: Record<TefSectorId, SectorEmissionShare>; totalTonnes: number } {
  const scoped = filterRecordsByScope(records, scope, placeName);
  const tonnesBySector = emptySectorTonnes();

  for (const record of scoped) {
    const row = findSectorEmissions(sectorEmissions, record.name);
    if (!row) continue;
    const year = pickEmissionsYear(row.byYear, "latest", record.adoptedYear);
    if (!year) continue;
    const sectors = row.byYear[year] ?? {};
    const bucketTonnes: Partial<Record<EmissionBucket, number>> = {};
    for (const [label, tonnes] of Object.entries(sectors)) {
      const bucket = emissionBucketForSectorLabel(label);
      bucketTonnes[bucket] = (bucketTonnes[bucket] ?? 0) + tonnes;
    }
    for (const sector of TEF_SECTORS) {
      for (const bucket of TEF_SECTOR_EMISSION_BUCKETS[sector.id]) {
        tonnesBySector[sector.id] += bucketTonnes[bucket] ?? 0;
      }
    }
  }

  const totalTonnes = TEF_SECTORS.reduce(
    (s, sector) => s + tonnesBySector[sector.id],
    0,
  );
  const bySector = Object.fromEntries(
    TEF_SECTORS.map((sector) => {
      const tonnes = tonnesBySector[sector.id];
      return [
        sector.id,
        {
          sectorId: sector.id,
          tonnes,
          share: totalTonnes <= 0 ? 0 : tonnes / totalTonnes,
        } satisfies SectorEmissionShare,
      ];
    }),
  ) as Record<TefSectorId, SectorEmissionShare>;

  return { bySector, totalTonnes };
}

export interface SectorGateMatchRate {
  sectorId: TefSectorId;
  /** Activity shifts gated to this top domain. */
  gated: number;
  /** Gated shifts with ≥1 confirmed TEF match. */
  matched: number;
  /** matched / gated, or null when gated is 0. */
  rate: number | null;
}

export function sectorGateMatchRates(
  records: ExploreMunicipalityRecord[],
  scope: TefFrameworkScope,
  placeName: string | null,
): {
  bySector: Record<TefSectorId, SectorGateMatchRate>;
  hasAnyGateData: boolean;
} {
  const scoped = filterRecordsByScope(records, scope, placeName);
  const gatedBySector = emptySectorCounts();
  const matchedBySector = emptySectorCounts();
  let hasAnyGateData = false;

  for (const record of scoped) {
    for (const measure of record.measures) {
      for (const shift of measure.activity_shifts ?? []) {
        const sectorId = tefSectorFromGateDomain(
          shift.transition_element_gate_domain,
        );
        if (!sectorId) continue;
        hasAnyGateData = true;
        gatedBySector[sectorId] += 1;
        if ((shift.transition_element_matches ?? []).length > 0) {
          matchedBySector[sectorId] += 1;
        }
      }
    }
  }

  const bySector = Object.fromEntries(
    TEF_SECTORS.map((sector) => {
      const gated = gatedBySector[sector.id];
      const matched = matchedBySector[sector.id];
      return [
        sector.id,
        {
          sectorId: sector.id,
          gated,
          matched,
          rate: gated === 0 ? null : matched / gated,
        } satisfies SectorGateMatchRate,
      ];
    }),
  ) as Record<TefSectorId, SectorGateMatchRate>;

  return { bySector, hasAnyGateData };
}

function emptySectorTonnes(): Record<TefSectorId, number> {
  return {
    transport: 0,
    industry: 0,
    afolu: 0,
    buildings: 0,
    energy: 0,
    waste: 0,
  };
}

function emptySectorCounts(): Record<TefSectorId, number> {
  return emptySectorTonnes();
}
