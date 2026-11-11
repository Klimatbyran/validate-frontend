/**
 * Prototype public / website KPIs for the Explore → Website visuals tab.
 *
 * These are intentionally conservative: they prefer absence claims and
 * templated focus sentences over fragile "ambition" or causal post-plan scores.
 */

import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
  TefHit,
} from "./explore-types";
import { findSectorEmissions, pickEmissionsYear } from "./explore-alignment";
import {
  TEF_SECTOR_EMISSION_BUCKETS,
  tefSectorFromGateDomain,
} from "./tef-sector-signals";
import {
  emissionBucketForSectorLabel,
  type EmissionBucket,
} from "./tef-groups";
import {
  TEF_SECTORS,
  parseTefIndex,
  sectorIdFromGroup,
  sectorIdFromIndex,
  tefTitleFromShortLabel,
  type TefSectorId,
} from "./tef-framework";
import type { Measure } from "./measures-types";

export type FocusMatchVerdict = "match" | "partial" | "miss" | "not-assessable";

export interface SectorFocusRow {
  sectorId: TefSectorId;
  label: string;
  emissionShare: number;
  emissionTonnes: number;
  /** Distinct measures with a gate domain or TEF hit in this sector. */
  measureCount: number;
  addressed: boolean;
}

export interface EmissionFocusGapResult {
  /** Share of mapped six-sector emissions in sectors with no measures. Null if no emissions. */
  gapShare: number | null;
  totalMappedTonnes: number;
  missingSectors: TefSectorId[];
  rows: SectorFocusRow[];
  largestSectorId: TefSectorId | null;
  focusMatch: FocusMatchVerdict;
  summarySv: string;
  summaryEn: string;
}

export interface MainFocusResult {
  sentenceSv: string | null;
  sentenceEn: string | null;
  themes: Array<{ id: string; label: string; measureCount: number; share: number }>;
  eligibleMeasureCount: number;
}

export interface SincePlanTrendResult {
  annualChangePercent: number | null;
  fromYear: number | null;
  toYear: number | null;
  observationCount: number;
  status: "ok" | "too-new" | "no-plan-year" | "no-emissions";
  noteEn: string;
}

const PUBLIC_FOCUS_FAMILIES: {
  id: string;
  labelEn: string;
  labelSv: string;
  match: (title: string, sectorPath: string, sectorId: TefSectorId | "other") => boolean;
}[] = [
  {
    id: "electrified-vehicles",
    labelEn: "electrified vehicles",
    labelSv: "elektrifierade fordon",
    match: (title, path) =>
      /electric|battery|ev\b|ladd/i.test(title) ||
      /electric|battery/i.test(path),
  },
  {
    id: "public-active-transport",
    labelEn: "public transport, walking and cycling",
    labelSv: "kollektivtrafik, gång och cykel",
    match: (title, path) =>
      /bus|rail|train|cycling|bicycle|walk|public transport|transit|metro|tram/i.test(
        title,
      ) || /public|active|rail|bus|cycle|walk/i.test(path),
  },
  {
    id: "renewable-fuels",
    labelEn: "renewable fuels",
    labelSv: "förnybara drivmedel",
    match: (title) => /biofuel|biogas|hydrogen|renewable fuel|HVO|biodiesel/i.test(title),
  },
  {
    id: "fossil-free-heating",
    labelEn: "fossil-free heating",
    labelSv: "fossilfri uppvärmning",
    match: (title, path, sectorId) =>
      sectorId === "buildings" ||
      /heating|heat pump|district heat|uppvärm/i.test(title) ||
      /heating|hvac/i.test(path),
  },
  {
    id: "local-renewable-power",
    labelEn: "local renewable electricity",
    labelSv: "lokal förnybar el",
    match: (title, path, sectorId) =>
      (sectorId === "energy" && /solar|wind|renewable|electricity/i.test(title)) ||
      /solar|wind|photovolta/i.test(title) ||
      /solar|wind/i.test(path),
  },
  {
    id: "waste-circular",
    labelEn: "waste and circular materials",
    labelSv: "avfall och cirkulära material",
    match: (_t, _p, sectorId) => sectorId === "waste",
  },
  {
    id: "afolu-food-land",
    labelEn: "food, agriculture and land use",
    labelSv: "mat, jordbruk och markanvändning",
    match: (_t, _p, sectorId) => sectorId === "afolu",
  },
  {
    id: "industry",
    labelEn: "industry",
    labelSv: "industri",
    match: (_t, _p, sectorId) => sectorId === "industry",
  },
];

function emptySectorCounts(): Record<TefSectorId, number> {
  return {
    transport: 0,
    industry: 0,
    afolu: 0,
    buildings: 0,
    energy: 0,
    waste: 0,
  };
}

function sectorIdFromHit(hit: TefHit): TefSectorId | null {
  const fromIndex = sectorIdFromIndex(parseTefIndex(hit.shortLabel));
  if (fromIndex !== "other") return fromIndex;
  const fromGroup = sectorIdFromGroup(hit.group);
  return fromGroup === "other" ? null : fromGroup;
}

/** Count distinct measures that address each TEF sector via gate domain or TEF hit. */
export function measureCountsBySector(
  measures: Measure[],
): Record<TefSectorId, number> {
  const counts = emptySectorCounts();
  for (const measure of measures) {
    const sectors = new Set<TefSectorId>();
    for (const shift of measure.activity_shifts ?? []) {
      const gated = tefSectorFromGateDomain(shift.transition_element_gate_domain);
      if (gated) sectors.add(gated);
      for (const match of shift.transition_element_matches ?? []) {
        const fromIndex = sectorIdFromIndex(parseTefIndex(match.short_label));
        if (fromIndex !== "other") {
          sectors.add(fromIndex);
          continue;
        }
        const fromGroup = sectorIdFromGroup(
          match.sector_path.split(">")[0]?.trim() ?? "",
        );
        if (fromGroup !== "other") sectors.add(fromGroup);
      }
    }
    for (const sectorId of sectors) counts[sectorId] += 1;
  }
  return counts;
}

export function emissionSharesForRecord(
  record: ExploreMunicipalityRecord,
  emissions: SectorYearEmissions | undefined,
): {
  bySector: Record<TefSectorId, { tonnes: number; share: number }>;
  totalTonnes: number;
  year: string | null;
} {
  const tonnes = emptySectorCounts();
  if (!emissions) {
    return {
      bySector: Object.fromEntries(
        TEF_SECTORS.map((s) => [
          s.id,
          { tonnes: 0, share: 0 },
        ]),
      ) as Record<TefSectorId, { tonnes: number; share: number }>,
      totalTonnes: 0,
      year: null,
    };
  }
  const year = pickEmissionsYear(emissions.byYear, "latest", record.adoptedYear);
  if (!year) {
    return {
      bySector: Object.fromEntries(
        TEF_SECTORS.map((s) => [s.id, { tonnes: 0, share: 0 }]),
      ) as Record<TefSectorId, { tonnes: number; share: number }>,
      totalTonnes: 0,
      year: null,
    };
  }
  const sectors = emissions.byYear[year] ?? {};
  const bucketTonnes: Partial<Record<EmissionBucket, number>> = {};
  for (const [label, value] of Object.entries(sectors)) {
    const bucket = emissionBucketForSectorLabel(label);
    bucketTonnes[bucket] = (bucketTonnes[bucket] ?? 0) + value;
  }
  for (const sector of TEF_SECTORS) {
    for (const bucket of TEF_SECTOR_EMISSION_BUCKETS[sector.id]) {
      tonnes[sector.id] += bucketTonnes[bucket] ?? 0;
    }
  }
  const totalTonnes = TEF_SECTORS.reduce((s, sector) => s + tonnes[sector.id], 0);
  const bySector = Object.fromEntries(
    TEF_SECTORS.map((sector) => [
      sector.id,
      {
        tonnes: tonnes[sector.id],
        share: totalTonnes <= 0 ? 0 : tonnes[sector.id] / totalTonnes,
      },
    ]),
  ) as Record<TefSectorId, { tonnes: number; share: number }>;
  return { bySector, totalTonnes, year };
}

/**
 * Share of mapped emissions sitting in sectors with no measures (absence framing).
 * Prefer this over a binary "plan matches emissions" claim.
 */
export function computeEmissionFocusGap(
  record: ExploreMunicipalityRecord,
  allEmissions: SectorYearEmissions[],
): EmissionFocusGapResult {
  const emissions = findSectorEmissions(allEmissions, record.name);
  const { bySector, totalTonnes } = emissionSharesForRecord(record, emissions);
  const measureCounts = measureCountsBySector(record.measures);

  const rows: SectorFocusRow[] = TEF_SECTORS.map((sector) => {
    const measureCount = measureCounts[sector.id];
    return {
      sectorId: sector.id,
      label: sector.label,
      emissionShare: bySector[sector.id].share,
      emissionTonnes: bySector[sector.id].tonnes,
      measureCount,
      addressed: measureCount > 0,
    };
  });

  const missing = rows.filter((r) => !r.addressed && r.emissionTonnes > 0);
  const gapShare =
    totalTonnes <= 0
      ? null
      : missing.reduce((s, r) => s + r.emissionShare, 0);

  const largest =
    totalTonnes <= 0
      ? null
      : [...rows].sort(
          (a, b) =>
            b.emissionTonnes - a.emissionTonnes ||
            a.sectorId.localeCompare(b.sectorId),
        )[0] ?? null;

  let focusMatch: FocusMatchVerdict = "not-assessable";
  if (largest && totalTonnes > 0 && record.measures.length > 0) {
    if (largest.addressed) {
      const focusShares = rows
        .filter((r) => r.measureCount > 0)
        .map((r) => ({
          id: r.sectorId,
          share:
            rows.reduce((s, x) => s + x.measureCount, 0) === 0
              ? 0
              : r.measureCount / rows.reduce((s, x) => s + x.measureCount, 0),
        }))
        .sort((a, b) => b.share - a.share);
      const top = focusShares[0];
      focusMatch =
        top && top.id === largest.sectorId && top.share >= 0.25
          ? "match"
          : "partial";
    } else {
      focusMatch = "miss";
    }
  }

  const missingLabels = missing.map((m) => m.label);
  const summaryEn =
    gapShare == null
      ? "Not assessable yet (missing emissions or measures)."
      : missingLabels.length === 0
        ? "Every mapped emission sector has at least one measure."
        : `Plan lacks measures for ${missingLabels.join(", ")}, covering ${Math.round(gapShare * 100)}% of mapped emissions.`;
  const summarySv =
    gapShare == null
      ? "Kan inte bedömas ännu (saknar utsläpp eller åtgärder)."
      : missingLabels.length === 0
        ? "Alla kartlagda utsläppssektorer har minst en åtgärd."
        : `Planen saknar åtgärder för ${missingLabels.join(", ")}, som står för ${Math.round(gapShare * 100)} % av kartlagda utsläpp.`;

  return {
    gapShare,
    totalMappedTonnes: totalTonnes,
    missingSectors: missing.map((m) => m.sectorId),
    rows,
    largestSectorId: largest?.sectorId ?? null,
    focusMatch,
    summarySv,
    summaryEn,
  };
}

/**
 * Rule-based "tyngdpunkt" sentence from TEF hits (deduped by measure text).
 * Abstains when too little evidence.
 */
export function computeMainFocus(record: ExploreMunicipalityRecord): MainFocusResult {
  const officialHits = record.tefHits.filter(
    (hit) => (hit.source ?? "official") !== "runtime-shadow",
  );
  // One vote per measure text × family.
  const familyMeasures = new Map<string, Set<string>>();
  for (const hit of officialHits) {
    if (hit.explicit === false) continue;
    const sectorId = sectorIdFromHit(hit) ?? "other";
    const title = tefTitleFromShortLabel(hit.shortLabel);
    for (const family of PUBLIC_FOCUS_FAMILIES) {
      if (!family.match(title, hit.sectorPath, sectorId)) continue;
      const set = familyMeasures.get(family.id) ?? new Set<string>();
      set.add(hit.measureText);
      familyMeasures.set(family.id, set);
    }
  }

  const totalMeasures = new Set(officialHits.map((h) => h.measureText)).size;
  const themes = PUBLIC_FOCUS_FAMILIES.map((family) => {
    const measureCount = familyMeasures.get(family.id)?.size ?? 0;
    return {
      id: family.id,
      label: family.labelEn,
      labelSv: family.labelSv,
      measureCount,
      share: totalMeasures === 0 ? 0 : measureCount / totalMeasures,
    };
  })
    .filter((t) => t.measureCount > 0)
    .sort(
      (a, b) =>
        b.measureCount - a.measureCount || a.label.localeCompare(b.label),
    );

  if (totalMeasures < 5 || themes.length === 0) {
    return {
      sentenceSv: null,
      sentenceEn: null,
      themes: themes.map(({ id, label, measureCount, share }) => ({
        id,
        label,
        measureCount,
        share,
      })),
      eligibleMeasureCount: totalMeasures,
    };
  }

  const top = themes.filter(
    (t) => t.measureCount >= 3 && t.share >= 0.15,
  );
  if (top.length === 0) {
    return {
      sentenceSv: "Åtgärderna är spridda över flera områden.",
      sentenceEn: "Measures are spread across several areas.",
      themes: themes.map(({ id, label, measureCount, share }) => ({
        id,
        label,
        measureCount,
        share,
      })),
      eligibleMeasureCount: totalMeasures,
    };
  }

  const lead = top.slice(0, 2);
  const enLabels = lead.map((t) => t.label);
  const svLabels = lead.map(
    (t) => PUBLIC_FOCUS_FAMILIES.find((f) => f.id === t.id)?.labelSv ?? t.label,
  );
  const sentenceEn =
    lead.length === 1
      ? `The plan focuses mainly on ${enLabels[0]}.`
      : `The plan focuses mainly on ${enLabels[0]} and ${enLabels[1]}.`;
  const sentenceSv =
    lead.length === 1
      ? `Planens tyngdpunkt: ${svLabels[0]}.`
      : `Planens tyngdpunkt: ${svLabels[0]} och ${svLabels[1]}.`;

  return {
    sentenceSv,
    sentenceEn,
    themes: themes.map(({ id, label, measureCount, share }) => ({
      id,
      label,
      measureCount,
      share,
    })),
    eligibleMeasureCount: totalMeasures,
  };
}

/**
 * Descriptive post-adoption territorial CAGR. Never presented as causal impact.
 * Requires ≥3 complete years after adoption.
 */
export function computeSincePlanTrend(
  record: ExploreMunicipalityRecord,
  allEmissions: SectorYearEmissions[],
): SincePlanTrendResult {
  if (record.adoptedYear == null) {
    return {
      annualChangePercent: null,
      fromYear: null,
      toYear: null,
      observationCount: 0,
      status: "no-plan-year",
      noteEn: "No audited adoption year on the explore record.",
    };
  }
  const emissions = findSectorEmissions(allEmissions, record.name);
  if (!emissions) {
    return {
      annualChangePercent: null,
      fromYear: null,
      toYear: null,
      observationCount: 0,
      status: "no-emissions",
      noteEn: "No Unearth / SMHI sector series for this municipality.",
    };
  }

  const yearlyTotals = Object.entries(emissions.byYear)
    .map(([year, sectors]) => ({
      year: Number.parseInt(year, 10),
      total: Object.values(sectors).reduce((s, v) => s + v, 0),
    }))
    .filter((row) => Number.isFinite(row.year) && row.total > 0)
    .sort((a, b) => a.year - b.year);

  const after = yearlyTotals.filter((row) => row.year >= record.adoptedYear!);
  if (after.length < 3) {
    return {
      annualChangePercent: null,
      fromYear: after[0]?.year ?? null,
      toYear: after[after.length - 1]?.year ?? null,
      observationCount: after.length,
      status: "too-new",
      noteEn:
        "Fewer than three complete SMHI years after adoption — show as too new, not as low ambition.",
    };
  }

  const first = after[0]!;
  const last = after[after.length - 1]!;
  const years = last.year - first.year;
  if (years <= 0) {
    return {
      annualChangePercent: null,
      fromYear: first.year,
      toYear: last.year,
      observationCount: after.length,
      status: "too-new",
      noteEn: "Need a multi-year span after adoption.",
    };
  }
  const annualChangePercent =
    (Math.pow(last.total / first.total, 1 / years) - 1) * 100;

  return {
    annualChangePercent,
    fromYear: first.year,
    toYear: last.year,
    observationCount: after.length,
    status: "ok",
    noteEn:
      "Observed territorial change after adoption only — no causal claim that the plan caused it.",
  };
}

export const WEBSITE_KPI_PLAN = {
  mvpPublic: [
    {
      id: "emissionFocusGap",
      name: "Emissions without measures",
      nameSv: "Utsläpp utan åtgärder i planen",
      overviewMap: true,
      status: "prototype",
      rationale:
        "Absence framing is more stable than yes/no alignment across thresholds. Lower is better.",
    },
    {
      id: "mainFocus",
      name: "Main plan focus",
      nameSv: "Tyngdpunkt",
      overviewMap: false,
      status: "prototype",
      rationale:
        "Rule-based sentence from TEF families (deduped measures). Detail page only.",
    },
    {
      id: "historicalEmissionChange",
      name: "Emissions change since 2015",
      nameSv: "Utsläppsförändring sedan 2015",
      overviewMap: true,
      status: "already-on-site",
      rationale:
        "Already on klimatkollen.se. Keep clearly separate from plan-content KPIs.",
    },
  ],
  keepInternal: [
    "TEF hit counts / strength / shadow hits",
    "Average intervention or activity-shift scores as 'ambition'",
    "Raw commitment counts (pre-dedupe)",
    "Causal 'since the plan' success/fail colouring",
    "Binary focus-match without a publish gate",
  ],
  blockers: [
    "Canonical plan + companion åtgärdsplan merge per municipality",
    "Approved / reviewed extracts only for public export",
    "Rerun older plans missing gate domains",
    "Audited adoption year reconciliation (source sheet vs ClimatePlan.adoptedAt)",
    "Coverage: far fewer than 290 kommuner extracted today",
  ],
} as const;
