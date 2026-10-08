import type {
  ExploreMunicipalityRecord,
  TefFrameworkMetric,
  TefFrameworkScope,
  TefHit,
} from "./explore-types";
import { CONFIDENCE_WEIGHT } from "./tef-groups";
import { foldRegionName, namesMatch } from "./municipality-names";

export type { TefFrameworkMetric, TefFrameworkScope };

/** Top-level Transition Element Framework sectors (T-1 … T-6). */
export const TEF_SECTORS = [
  {
    id: "transport",
    code: "T-1",
    label: "Transport",
    aliases: ["transport"],
    /** Sector accent used for the filled heatmap cells. */
    rgb: [34, 197, 94] as const,
  },
  {
    id: "industry",
    code: "T-2",
    label: "Industry",
    aliases: ["industry"],
    rgb: [59, 130, 246] as const,
  },
  {
    id: "afolu",
    code: "T-3",
    label: "AFOLU",
    aliases: ["afolu", "agriculture"],
    rgb: [249, 115, 22] as const,
  },
  {
    id: "buildings",
    code: "T-4",
    label: "Buildings",
    aliases: ["buildings", "building"],
    rgb: [239, 68, 68] as const,
  },
  {
    id: "energy",
    code: "T-5",
    label: "Energy",
    aliases: ["energy"],
    rgb: [234, 179, 8] as const,
  },
  {
    id: "waste",
    code: "T-6",
    label: "Waste",
    aliases: ["waste"],
    rgb: [20, 184, 166] as const,
  },
] as const;

export type TefSectorId = (typeof TEF_SECTORS)[number]["id"];

export interface TefHitWithPlace extends TefHit {
  municipalityId: string;
  municipalityName: string;
  regionName: string | null;
}

export interface TefFrameworkCell {
  stableId: string;
  /** Catalogue index when present in short_label, e.g. T-1A1a-TE-6. */
  index: string | null;
  shortLabel: string;
  title: string;
  sectorPath: string;
  sectorId: TefSectorId | "other";
  sectorLabel: string;
  hitCount: number;
  municipalityCount: number;
  weightedStrength: number;
  hits: TefHitWithPlace[];
}

export interface TefFrameworkSectorColumn {
  sector: (typeof TEF_SECTORS)[number] | null;
  sectorId: TefSectorId | "other";
  label: string;
  code: string;
  rgb: readonly [number, number, number];
  cells: TefFrameworkCell[];
}

const TE_INDEX_RE = /\b(T-\d[A-Za-z0-9]*-TE-\d+)\b/i;

export function parseTefIndex(shortLabel: string): string | null {
  const match = shortLabel.match(TE_INDEX_RE);
  return match ? match[1] : null;
}

/** Prefer the human title after "T-… - ", else the whole short_label. */
export function tefTitleFromShortLabel(shortLabel: string): string {
  const split = shortLabel.split(/\s+-\s+/);
  if (split.length >= 2) return split.slice(1).join(" - ").trim();
  return shortLabel.trim();
}

export function sectorIdFromGroup(group: string): TefSectorId | "other" {
  const key = group.trim().toLowerCase();
  for (const sector of TEF_SECTORS) {
    if (sector.aliases.includes(key)) return sector.id;
  }
  return "other";
}

export function sectorIdFromIndex(index: string | null): TefSectorId | "other" {
  if (!index) return "other";
  const n = index.match(/^T-(\d)/i)?.[1];
  switch (n) {
    case "1":
      return "transport";
    case "2":
      return "industry";
    case "3":
      return "afolu";
    case "4":
      return "buildings";
    case "5":
      return "energy";
    case "6":
      return "waste";
    default:
      return "other";
  }
}

export function collectHitsWithPlace(
  records: ExploreMunicipalityRecord[],
): TefHitWithPlace[] {
  const out: TefHitWithPlace[] = [];
  for (const record of records) {
    for (const hit of record.tefHits) {
      out.push({
        ...hit,
        municipalityId: record.id,
        municipalityName: record.name,
        regionName: record.regionName ?? record.county,
      });
    }
  }
  return out;
}

export function filterHitsByScope(
  hits: TefHitWithPlace[],
  scope: TefFrameworkScope,
  placeName: string | null,
): TefHitWithPlace[] {
  if (scope === "all" || !placeName) return hits;
  if (scope === "municipality") {
    return hits.filter((hit) => namesMatch(hit.municipalityName, placeName));
  }
  const target = foldRegionName(placeName);
  return hits.filter((hit) => {
    if (!hit.regionName) return false;
    return foldRegionName(hit.regionName) === target;
  });
}

export function buildTefFrameworkCells(
  hits: TefHitWithPlace[],
): TefFrameworkCell[] {
  const byId = new Map<string, TefHitWithPlace[]>();
  for (const hit of hits) {
    const list = byId.get(hit.stableId) ?? [];
    list.push(hit);
    byId.set(hit.stableId, list);
  }

  return [...byId.entries()]
    .map(([stableId, groupHits]) => {
      const sample = groupHits[0];
      const index = parseTefIndex(sample.shortLabel);
      const fromIndex = sectorIdFromIndex(index);
      const sectorId =
        fromIndex !== "other" ? fromIndex : sectorIdFromGroup(sample.group);
      const sector =
        TEF_SECTORS.find((s) => s.id === sectorId) ??
        ({
          id: "other" as const,
          code: "T-?",
          label: "Other",
          rgb: [107, 114, 128] as const,
        } as const);
      const weightSum = groupHits.reduce(
        (sum, hit) => sum + CONFIDENCE_WEIGHT[hit.confidence],
        0,
      );
      const maxWeight = groupHits.length * CONFIDENCE_WEIGHT.high;
      return {
        stableId,
        index,
        shortLabel: sample.shortLabel,
        title: tefTitleFromShortLabel(sample.shortLabel),
        sectorPath: sample.sectorPath,
        sectorId: sector.id as TefSectorId | "other",
        sectorLabel: sector.label,
        hitCount: groupHits.length,
        municipalityCount: new Set(groupHits.map((h) => h.municipalityId)).size,
        weightedStrength: maxWeight === 0 ? 0 : weightSum / maxWeight,
        hits: groupHits,
      };
    })
    .sort((a, b) => {
      if (a.sectorId !== b.sectorId) {
        const ai = TEF_SECTORS.findIndex((s) => s.id === a.sectorId);
        const bi = TEF_SECTORS.findIndex((s) => s.id === b.sectorId);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }
      if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
      return (a.index ?? a.stableId).localeCompare(b.index ?? b.stableId);
    });
}

export function groupCellsBySector(
  cells: TefFrameworkCell[],
): TefFrameworkSectorColumn[] {
  const columns: TefFrameworkSectorColumn[] = TEF_SECTORS.map((sector) => ({
    sector,
    sectorId: sector.id,
    label: sector.label,
    code: sector.code,
    rgb: sector.rgb,
    cells: cells.filter((c) => c.sectorId === sector.id),
  }));
  const other = cells.filter((c) => c.sectorId === "other");
  if (other.length > 0) {
    columns.push({
      sector: null,
      sectorId: "other",
      label: "Other",
      code: "T-?",
      rgb: [107, 114, 128],
      cells: other,
    });
  }
  return columns;
}

export function cellMetricValue(
  cell: TefFrameworkCell,
  metric: TefFrameworkMetric,
): number {
  switch (metric) {
    case "hits":
      return cell.hitCount;
    case "strength":
      return cell.weightedStrength;
    case "municipalities":
      return cell.municipalityCount;
  }
}

/** Blend sector accent toward a dark muted base by intensity 0–1. */
export function tefCellFill(
  rgb: readonly [number, number, number],
  intensity: number,
): string {
  const t = Math.min(1, Math.max(0, intensity));
  const base = [31, 41, 55] as const;
  const mix = base.map((c, i) =>
    Math.round(c + (rgb[i] - c) * (0.25 + t * 0.75)),
  );
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

export function listScopePlaces(
  records: ExploreMunicipalityRecord[],
  scope: TefFrameworkScope,
): string[] {
  if (scope === "municipality") {
    return records
      .filter((r) => r.tefHits.length > 0)
      .map((r) => r.name)
      .sort((a, b) => a.localeCompare(b, "sv"));
  }
  if (scope === "region") {
    const names = new Set<string>();
    for (const record of records) {
      if (record.tefHits.length === 0) continue;
      const region = record.regionName ?? record.county;
      if (region) names.add(region.replace(/\s+län$/i, "").trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b, "sv"));
  }
  return [];
}

/** Pack cells into column-major grids so each sector looks like a tall strip. */
export function packIntoColumns<T>(
  items: T[],
  preferredColumns: number,
): T[][] {
  if (items.length === 0) return [];
  const cols = Math.min(
    preferredColumns,
    Math.max(1, Math.ceil(Math.sqrt(items.length))),
  );
  const columns: T[][] = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => {
    columns[i % cols].push(item);
  });
  return columns;
}
