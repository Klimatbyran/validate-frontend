/**
 * Website visuals v2 KPI helpers: unique measures + exact (non-implied) TEF lists.
 */

import type { ExploreMunicipalityRecord, TefHit } from "./explore-types";
import type { Measure } from "./measures-types";
import {
  parseTefIndex,
  sectorIdFromGroup,
  sectorIdFromIndex,
  TEF_SECTORS,
  type TefSectorId,
} from "./tef-framework";
import { computeActionConcreteness } from "./action-concreteness-score";
import {
  computeEmissionFocusGap,
  type EmissionFocusGapResult,
  type FocusMatchVerdict,
} from "./website-kpis";
import type { SectorYearEmissions } from "./explore-types";

export interface WebsiteV2PlaceBundle {
  record: ExploreMunicipalityRecord;
  concreteness: ReturnType<typeof computeActionConcreteness>;
  gap: EmissionFocusGapResult;
  /** Pipeline-deduped climate measures (ExtractedMeasure rows). */
  uniqueMeasureCount: number;
  exactTefHits: TefHit[];
  exactTefCount: number;
}

/** Unique climate-related measures = pipeline measure rows (already similar-group deduped). */
export function uniqueMeasureCount(record: ExploreMunicipalityRecord): number {
  return record.measures.length;
}

/**
 * Exact TEF matches for the expandable panel: explicit === true only.
 * Includes official + proposed catalogue sources; drops implied and
 * runtime-shadow gap attachments.
 */
export function exactTefHits(record: ExploreMunicipalityRecord): TefHit[] {
  const seen = new Set<string>();
  const out: TefHit[] = [];
  for (const hit of record.tefHits) {
    if (hit.explicit !== true) continue;
    if ((hit.source ?? "official") === "runtime-shadow") continue;
    const key = `${hit.stableId}::${(hit.measureText ?? "").trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

export function sectorIdForHit(hit: TefHit): TefSectorId | "other" {
  const index = parseTefIndex(hit.shortLabel);
  if (index) {
    const fromIndex = sectorIdFromIndex(index);
    if (fromIndex !== "other") return fromIndex;
  }
  return sectorIdFromGroup(hit.group);
}

export function sectorLabel(id: TefSectorId | "other"): string {
  if (id === "other") return "Other / cross-cutting";
  return TEF_SECTORS.find((s) => s.id === id)?.label ?? id;
}

export interface MeasureBrowseRow {
  measure: Measure;
  sectors: Array<TefSectorId | "other">;
  exactTefLabels: string[];
  impliedTefCount: number;
}

export function browseMeasures(
  record: ExploreMunicipalityRecord,
): MeasureBrowseRow[] {
  return record.measures.map((measure) => {
    const text = measure.measure_text?.trim() ?? "";
    const hits = record.tefHits.filter(
      (h) => (h.measureText ?? "").trim() === text,
    );
    const sectors = new Set<TefSectorId | "other">();
    const exactTefLabels: string[] = [];
    let impliedTefCount = 0;
    for (const hit of hits) {
      if ((hit.source ?? "official") === "runtime-shadow") continue;
      sectors.add(sectorIdForHit(hit));
      if (hit.explicit === true) {
        exactTefLabels.push(hit.shortLabel);
      } else if (hit.explicit === false) {
        impliedTefCount += 1;
      }
    }
    return {
      measure,
      sectors: [...sectors],
      exactTefLabels,
      impliedTefCount,
    };
  });
}

export function groupExactTefsBySector(
  hits: TefHit[],
): Array<{ sectorId: TefSectorId | "other"; label: string; hits: TefHit[] }> {
  const buckets = new Map<TefSectorId | "other", TefHit[]>();
  for (const hit of hits) {
    const id = sectorIdForHit(hit);
    const list = buckets.get(id) ?? [];
    list.push(hit);
    buckets.set(id, list);
  }
  const order: Array<TefSectorId | "other"> = [
    ...TEF_SECTORS.map((s) => s.id),
    "other",
  ];
  return order
    .filter((id) => (buckets.get(id)?.length ?? 0) > 0)
    .map((id) => ({
      sectorId: id,
      label: sectorLabel(id),
      hits: (buckets.get(id) ?? [])
        .slice()
        .sort((a, b) => a.shortLabel.localeCompare(b.shortLabel, "sv")),
    }));
}

export function groupMeasuresBySector(rows: MeasureBrowseRow[]): Array<{
  sectorId: TefSectorId | "other";
  label: string;
  rows: MeasureBrowseRow[];
}> {
  const buckets = new Map<TefSectorId | "other", MeasureBrowseRow[]>();
  for (const row of rows) {
    const ids = row.sectors.length > 0 ? row.sectors : (["other"] as const);
    // Place each measure once — prefer first TEF sector, else Other.
    const id = ids[0]!;
    const list = buckets.get(id) ?? [];
    list.push(row);
    buckets.set(id, list);
  }
  const order: Array<TefSectorId | "other"> = [
    ...TEF_SECTORS.map((s) => s.id),
    "other",
  ];
  return order
    .filter((id) => (buckets.get(id)?.length ?? 0) > 0)
    .map((id) => ({
      sectorId: id,
      label: sectorLabel(id),
      rows: buckets.get(id) ?? [],
    }));
}

export function buildWebsiteV2PlaceBundle(
  record: ExploreMunicipalityRecord,
  sectorEmissions: SectorYearEmissions[],
): WebsiteV2PlaceBundle {
  const exact = exactTefHits(record);
  return {
    record,
    concreteness: computeActionConcreteness(record),
    gap: computeEmissionFocusGap(record, sectorEmissions),
    uniqueMeasureCount: uniqueMeasureCount(record),
    exactTefHits: exact,
    exactTefCount: exact.length,
  };
}

/** Encode focus match for choropleth: match=1, partial=0.5, miss=0, else null. */
export function focusMatchMapValue(verdict: FocusMatchVerdict): number | null {
  switch (verdict) {
    case "match":
      return 1;
    case "partial":
      return 0.5;
    case "miss":
      return 0;
    case "not-assessable":
      return null;
  }
}

export function focusMatchChipLabel(verdict: FocusMatchVerdict): string {
  switch (verdict) {
    case "match":
      return "Match";
    case "partial":
      return "Partial";
    case "miss":
      return "No match";
    case "not-assessable":
      return "No data";
  }
}
