import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "./explore-types";
import { mergeRegionRecords } from "./explore-aggregates";
import { foldRegionName } from "./municipality-names";
import {
  computeEmissionFocusGap,
  computeMainFocus,
  computeSincePlanTrend,
  type EmissionFocusGapResult,
  type MainFocusResult,
  type SincePlanTrendResult,
} from "./website-kpis";

export interface PlaceKpiBundle {
  record: ExploreMunicipalityRecord;
  gap: EmissionFocusGapResult;
  focus: MainFocusResult;
  sincePlan: SincePlanTrendResult;
}

export interface RegionKpiBundle extends PlaceKpiBundle {
  municipalityCount: number;
  assessedCount: number;
  municipalities: ExploreMunicipalityRecord[];
}

export function buildPlaceKpiBundle(
  record: ExploreMunicipalityRecord,
  sectorEmissions: SectorYearEmissions[],
): PlaceKpiBundle {
  return {
    record,
    gap: computeEmissionFocusGap(record, sectorEmissions),
    focus: computeMainFocus(record),
    sincePlan: computeSincePlanTrend(record, sectorEmissions),
  };
}

export function groupRecordsByRegion(
  records: ExploreMunicipalityRecord[],
): Map<string, ExploreMunicipalityRecord[]> {
  const byRegion = new Map<string, ExploreMunicipalityRecord[]>();
  for (const record of records) {
    const region = record.regionName ?? record.county;
    if (!region) continue;
    const key = foldRegionName(region);
    const list = byRegion.get(key) ?? [];
    list.push(record);
    byRegion.set(key, list);
  }
  return byRegion;
}

export function buildRegionKpiBundles(
  records: ExploreMunicipalityRecord[],
  sectorEmissions: SectorYearEmissions[],
): RegionKpiBundle[] {
  const byRegion = groupRecordsByRegion(records);
  const out: RegionKpiBundle[] = [];
  for (const list of byRegion.values()) {
    const displayName =
      list[0]!.regionName?.replace(/\s+län$/i, "").trim() ??
      list[0]!.county?.replace(/\s+län$/i, "").trim() ??
      list[0]!.name;
    const merged = mergeRegionRecords(list, displayName);
    const gap = computeEmissionFocusGap(merged, sectorEmissions);
    // Prefer emissions-weighted average of municipal gaps when available.
    let weightedGap = 0;
    let weight = 0;
    let assessed = 0;
    for (const muni of list) {
      const muniGap = computeEmissionFocusGap(muni, sectorEmissions);
      if (muniGap.gapShare == null || muniGap.totalMappedTonnes <= 0) continue;
      assessed += 1;
      weightedGap += muniGap.gapShare * muniGap.totalMappedTonnes;
      weight += muniGap.totalMappedTonnes;
    }
    if (weight > 0) {
      gap.gapShare = weightedGap / weight;
    }
    out.push({
      record: merged,
      gap,
      focus: computeMainFocus(merged),
      sincePlan: computeSincePlanTrend(merged, sectorEmissions),
      municipalityCount: list.length,
      assessedCount: assessed,
      municipalities: list,
    });
  }
  return out.sort((a, b) => a.record.name.localeCompare(b.record.name, "sv"));
}

export function formatGapPercent(gapShare: number | null): string {
  if (gapShare == null) return "—";
  return `${Math.round(gapShare * 100)}%`;
}

export function gapValueClass(gapShare: number | null): string {
  if (gapShare == null) return "text-gray-02";
  if (gapShare <= 0.15) return "text-blue-03";
  if (gapShare <= 0.35) return "text-orange-02";
  return "text-pink-03";
}

export function formatSincePlan(sincePlan: SincePlanTrendResult): {
  value: string;
  className: string;
  caption: string;
} {
  if (sincePlan.status === "ok" && sincePlan.annualChangePercent != null) {
    const value = `${sincePlan.annualChangePercent > 0 ? "+" : ""}${sincePlan.annualChangePercent.toFixed(1)}%`;
    return {
      value,
      className:
        sincePlan.annualChangePercent > 0 ? "text-pink-03" : "text-orange-02",
      caption: `Sedan planen (${sincePlan.fromYear}–${sincePlan.toYear}). Ingen kausal tolkning.`,
    };
  }
  const captions: Record<SincePlanTrendResult["status"], string> = {
    ok: "",
    "too-new":
      "För få år efter antagande — visas som saknad data, inte misslyckande.",
    "no-plan-year": "Saknar antagandeår.",
    "no-emissions": "Saknar utsläppserie.",
  };
  return {
    value: "—",
    className: "text-gray-02",
    caption: captions[sincePlan.status],
  };
}

export function rankByGap(
  bundles: PlaceKpiBundle[],
  direction: "best" | "worst",
  limit = 3,
): PlaceKpiBundle[] {
  const scored = bundles.filter((b) => b.gap.gapShare != null);
  scored.sort((a, b) =>
    direction === "best"
      ? (a.gap.gapShare ?? 1) - (b.gap.gapShare ?? 1)
      : (b.gap.gapShare ?? 0) - (a.gap.gapShare ?? 0),
  );
  return scored.slice(0, limit);
}
