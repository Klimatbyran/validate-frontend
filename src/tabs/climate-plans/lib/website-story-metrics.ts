/**
 * Programmable climate-plan story metrics for Website visuals → Story.
 * Always derived from live explore extracts + SMHI sector emissions — no fixtures.
 */

import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
  TefHit,
} from "./explore-types";
import {
  computeEmissionFocusGap,
  computeMainFocus,
  computeSincePlanTrend,
  conversationStartersEn,
  focusMatchPlainEn,
  measureCountsBySector,
  type EmissionFocusGapResult,
  type FocusMatchVerdict,
  type MainFocusResult,
  type SincePlanTrendResult,
} from "./website-kpis";
import {
  computePlanConcreteness,
  concretenessAskPromptEn,
  type PlanConcretenessResult,
} from "./plan-concreteness";
import {
  TEF_SECTORS,
  parseTefIndex,
  sectorIdFromGroup,
  sectorIdFromIndex,
  tefTitleFromShortLabel,
  type TefSectorId,
} from "./tef-framework";
import { findSectorEmissions } from "./explore-alignment";

export type StorySectorId = TefSectorId | "other";

export const STORY_SECTORS: Array<{
  id: StorySectorId;
  label: string;
  shortLabel: string;
  rgb: readonly [number, number, number];
}> = [
  ...TEF_SECTORS.map((s) => ({
    id: s.id as StorySectorId,
    label: s.label,
    shortLabel: s.label,
    rgb: s.rgb,
  })),
  {
    id: "other",
    label: "Other & cross-cutting",
    shortLabel: "Other",
    rgb: [148, 163, 184] as const,
  },
];

export interface StoryActionExample {
  title: string;
  municipalityName: string;
  measureText: string | null;
}

export interface StorySectorCell {
  id: StorySectorId;
  label: string;
  shortLabel: string;
  rgb: readonly [number, number, number];
  /** Municipalities with ≥1 measure in this sector (national view). */
  municipalitiesCovered: number;
  municipalityCoverageShare: number | null;
  measureCount: number;
  emissionShare: number | null;
  emissionTonnes: number;
  addressed: boolean;
  examples: StoryActionExample[];
}

export interface StoryPlaceMetrics {
  record: ExploreMunicipalityRecord;
  gap: EmissionFocusGapResult;
  focus: MainFocusResult;
  sincePlan: SincePlanTrendResult;
  plainFocus: ReturnType<typeof focusMatchPlainEn>;
  concreteness: PlanConcretenessResult;
  sectors: StorySectorCell[];
  otherMeasureCount: number;
  starters: string[];
  insightCards: Array<{ id: string; title: string; body: string }>;
}

export interface StoryNationalMetrics {
  municipalityCount: number;
  withMeasuresCount: number;
  withPlanYearCount: number;
  withGapCount: number;
  averageGapShare: number | null;
  averageBroadWordingShare: number | null;
  averageFullSpecShare: number | null;
  averageWhoRate: number | null;
  averageWhatRate: number | null;
  averageWhenRate: number | null;
  averageHowRate: number | null;
  focusMatchCounts: Record<FocusMatchVerdict, number>;
  sectorCells: StorySectorCell[];
  topThemes: Array<{ id: string; label: string; measureCount: number }>;
  medianAdoptedYear: number | null;
  places: StoryPlaceMetrics[];
  nationalStarters: string[];
  nationalInsights: Array<{ id: string; title: string; body: string }>;
}

function rgbCss(rgb: readonly [number, number, number], alpha = 1): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function storySectorColor(id: StorySectorId, alpha = 1): string {
  const sector = STORY_SECTORS.find((s) => s.id === id);
  return sector ? rgbCss(sector.rgb, alpha) : rgbCss([148, 163, 184], alpha);
}

function hitSectorId(hit: TefHit): StorySectorId {
  const fromIndex = sectorIdFromIndex(parseTefIndex(hit.shortLabel));
  if (fromIndex !== "other") return fromIndex;
  const fromGroup = sectorIdFromGroup(hit.group);
  return fromGroup === "other" ? "other" : fromGroup;
}

function countOtherMeasures(record: ExploreMunicipalityRecord): number {
  const mapped = measureCountsBySector(record.measures);
  const mappedTotal = Object.values(mapped).reduce((s, n) => s + n, 0);
  // Measures that never received a sector gate/TEF still count toward "other".
  const unmapped = Math.max(0, record.measures.length - mappedTotal);
  // Also count TEF hits classified as other.
  const otherHits = new Set(
    record.tefHits
      .filter((h) => hitSectorId(h) === "other")
      .map((h) => h.measureText || h.shortLabel),
  );
  return Math.max(unmapped, otherHits.size);
}

function examplesForSector(
  records: ExploreMunicipalityRecord[],
  sectorId: StorySectorId,
  limit = 3,
): StoryActionExample[] {
  const out: StoryActionExample[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    for (const hit of record.tefHits) {
      if ((hit.source ?? "official") === "runtime-shadow") continue;
      if (hitSectorId(hit) !== sectorId) continue;
      const title =
        tefTitleFromShortLabel(hit.shortLabel) ||
        hit.shortLabel ||
        hit.measureText ||
        "Action";
      const key = `${title}::${hit.measureText ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title,
        municipalityName: record.name,
        measureText: hit.measureText ?? null,
      });
      if (out.length >= limit) return out;
    }
  }
  if (out.length < limit) {
    for (const record of records) {
      const counts = measureCountsBySector(record.measures);
      if (sectorId !== "other" && counts[sectorId] <= 0) continue;
      if (sectorId === "other" && countOtherMeasures(record) <= 0) continue;
      for (const measure of record.measures) {
        const text = measure.measure_text?.trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);
        out.push({
          title: text.slice(0, 80),
          municipalityName: record.name,
          measureText: text,
        });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

function buildSectorCellsForPlace(
  record: ExploreMunicipalityRecord,
  gap: EmissionFocusGapResult,
): StorySectorCell[] {
  const otherCount = countOtherMeasures(record);
  return STORY_SECTORS.map((sector) => {
    if (sector.id === "other") {
      return {
        id: "other",
        label: sector.label,
        shortLabel: sector.shortLabel,
        rgb: sector.rgb,
        municipalitiesCovered: otherCount > 0 ? 1 : 0,
        municipalityCoverageShare: null,
        measureCount: otherCount,
        emissionShare: null,
        emissionTonnes: 0,
        addressed: otherCount > 0,
        examples: examplesForSector([record], "other"),
      };
    }
    const row = gap.rows.find((r) => r.sectorId === sector.id);
    return {
      id: sector.id,
      label: sector.label,
      shortLabel: sector.shortLabel,
      rgb: sector.rgb,
      municipalitiesCovered: row?.addressed ? 1 : 0,
      municipalityCoverageShare: null,
      measureCount: row?.measureCount ?? 0,
      emissionShare: row?.emissionShare ?? null,
      emissionTonnes: row?.emissionTonnes ?? 0,
      addressed: row?.addressed ?? false,
      examples: examplesForSector([record], sector.id),
    };
  });
}

function buildNationalSectorCells(
  places: StoryPlaceMetrics[],
  allRecords: ExploreMunicipalityRecord[],
): StorySectorCell[] {
  const n = places.length || 1;
  return STORY_SECTORS.map((sector) => {
    if (sector.id === "other") {
      const covered = places.filter((p) => p.otherMeasureCount > 0).length;
      const measureCount = places.reduce((s, p) => s + p.otherMeasureCount, 0);
      return {
        id: "other",
        label: sector.label,
        shortLabel: sector.shortLabel,
        rgb: sector.rgb,
        municipalitiesCovered: covered,
        municipalityCoverageShare: covered / n,
        measureCount,
        emissionShare: null,
        emissionTonnes: 0,
        addressed: covered > 0,
        examples: examplesForSector(allRecords, "other"),
      };
    }
    const covered = places.filter((p) =>
      p.gap.rows.some((r) => r.sectorId === sector.id && r.addressed),
    ).length;
    const measureCount = places.reduce((s, p) => {
      const row = p.gap.rows.find((r) => r.sectorId === sector.id);
      return s + (row?.measureCount ?? 0);
    }, 0);
    const tonnes = places.reduce((s, p) => {
      const row = p.gap.rows.find((r) => r.sectorId === sector.id);
      return s + (row?.emissionTonnes ?? 0);
    }, 0);
    const totalTonnes = places.reduce((s, p) => s + p.gap.totalMappedTonnes, 0);
    return {
      id: sector.id,
      label: sector.label,
      shortLabel: sector.shortLabel,
      rgb: sector.rgb,
      municipalitiesCovered: covered,
      municipalityCoverageShare: covered / n,
      measureCount,
      emissionShare: totalTonnes > 0 ? tonnes / totalTonnes : null,
      emissionTonnes: tonnes,
      addressed: covered > 0,
      examples: examplesForSector(allRecords, sector.id),
    };
  });
}

function insightCardsForPlace(place: StoryPlaceMetrics): Array<{
  id: string;
  title: string;
  body: string;
}> {
  const cards: Array<{ id: string; title: string; body: string }> = [];
  const name = place.record.name;
  cards.push({
    id: "plain-focus",
    title: place.plainFocus.question,
    body: place.plainFocus.answer,
  });
  if (place.gap.gapShare != null) {
    cards.push({
      id: "gap",
      title: "Emissions with no measures in the plan",
      body: place.gap.summaryEn,
    });
  }
  if (place.focus.sentenceEn) {
    cards.push({
      id: "focus",
      title: "What the plan focuses on",
      body: place.focus.sentenceEn,
    });
  }
  if (
    place.sincePlan.status === "ok" &&
    place.sincePlan.annualChangePercent != null
  ) {
    cards.push({
      id: "since",
      title: "What happened after the plan was adopted",
      body: `Territorial emissions changed about ${place.sincePlan.annualChangePercent > 0 ? "+" : ""}${place.sincePlan.annualChangePercent.toFixed(1)}% per year (${place.sincePlan.fromYear}–${place.sincePlan.toYear}). Correlation only — not proof the plan caused it.`,
    });
  } else if (place.record.adoptedYear) {
    cards.push({
      id: "age",
      title: "Plan age",
      body: `${name}’s climate plan was adopted in ${place.record.adoptedYear}.`,
    });
  }
  const missing = place.gap.rows.filter(
    (r) => !r.addressed && r.emissionTonnes > 0,
  );
  if (missing.length > 0) {
    cards.push({
      id: "missing",
      title: "Sectors with emissions but no measures",
      body: missing.map((m) => m.label).join(", "),
    });
  }
  if (place.otherMeasureCount > 0) {
    cards.push({
      id: "other",
      title: "Other & cross-cutting actions",
      body: `${place.otherMeasureCount} measure${place.otherMeasureCount === 1 ? "" : "s"} sit outside the six emission sectors (for example procurement or planning).`,
    });
  }
  cards.push({
    id: "concreteness",
    title: "How concrete is the plan wording?",
    body: place.concreteness.publicHeadlineEn,
  });
  if (place.concreteness.broadWordingShare != null) {
    cards.push({
      id: "broad",
      title: "Broad vs direct wording",
      body: `${place.concreteness.broadMeasureCount} of ${place.concreteness.judgedMeasureCount} judged measures are written broadly (could fit several kinds of action). Broad wording is not automatically a problem.`,
    });
  }
  return cards;
}

export function buildStoryPlaceMetrics(
  record: ExploreMunicipalityRecord,
  sectorEmissions: SectorYearEmissions[],
): StoryPlaceMetrics {
  const gap = computeEmissionFocusGap(record, sectorEmissions);
  const focus = computeMainFocus(record);
  const sincePlan = computeSincePlanTrend(record, sectorEmissions);
  const largestLabel =
    gap.rows.find((r) => r.sectorId === gap.largestSectorId)?.label ?? null;
  const plainFocus = focusMatchPlainEn(gap.focusMatch, largestLabel);
  const concreteness = computePlanConcreteness(record);
  const otherMeasureCount = countOtherMeasures(record);
  const place: StoryPlaceMetrics = {
    record,
    gap,
    focus,
    sincePlan,
    plainFocus,
    concreteness,
    sectors: [],
    otherMeasureCount,
    starters: conversationStartersEn({
      placeName: record.name,
      gap,
      sincePlan,
      focusSentenceEn: focus.sentenceEn,
      adoptedYear: record.adoptedYear,
    }),
    insightCards: [],
  };
  place.sectors = buildSectorCellsForPlace(record, gap);
  place.insightCards = insightCardsForPlace(place);
  // Prefer up to 6 explore prompts when exploring product direction.
  const extra: string[] = [];
  const concretenessPrompt = concretenessAskPromptEn(concreteness, record.name);
  if (concretenessPrompt) extra.push(concretenessPrompt);
  if (place.sectors.filter((s) => s.id !== "other" && s.addressed).length > 0) {
    const covered = place.sectors
      .filter((s) => s.id !== "other" && s.addressed)
      .map((s) => s.label);
    extra.push(
      `You could ask: the plan covers ${covered.slice(0, 3).join(", ")}${covered.length > 3 ? " and more" : ""} — which of these actions are funded this year?`,
    );
  }
  if (place.focus.themes[0]) {
    extra.push(
      `You could ask: many measures point to “${place.focus.themes[0].label}” — how will residents notice this in daily life?`,
    );
  }
  place.starters = [...place.starters, ...extra].slice(0, 6);
  return place;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

export function buildClimatePlansStoryMetrics(
  records: ExploreMunicipalityRecord[],
  sectorEmissions: SectorYearEmissions[],
): StoryNationalMetrics | null {
  if (records.length === 0) return null;

  const places = records
    .map((r) => buildStoryPlaceMetrics(r, sectorEmissions))
    .sort((a, b) => a.record.name.localeCompare(b.record.name, "sv"));

  const withMeasures = places.filter((p) => p.record.measures.length > 0);
  const withPlanYear = places.filter((p) => p.record.adoptedYear != null);
  const withGap = places.filter((p) => p.gap.gapShare != null);
  const averageGapShare =
    withGap.length === 0
      ? null
      : withGap.reduce((s, p) => s + (p.gap.gapShare ?? 0), 0) / withGap.length;
  const withBroad = places.filter(
    (p) => p.concreteness.broadWordingShare != null,
  );
  const averageBroadWordingShare =
    withBroad.length === 0
      ? null
      : withBroad.reduce(
          (s, p) => s + (p.concreteness.broadWordingShare ?? 0),
          0,
        ) / withBroad.length;
  const withFull = places.filter((p) => p.concreteness.fullSpecShare != null);
  const averageFullSpecShare =
    withFull.length === 0
      ? null
      : withFull.reduce((s, p) => s + (p.concreteness.fullSpecShare ?? 0), 0) /
        withFull.length;
  const avgRate = (
    pick: (p: StoryPlaceMetrics) => number | null,
  ): number | null => {
    const vals = places.map(pick).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };
  const averageWhoRate = avgRate((p) => p.concreteness.whoRate);
  const averageWhatRate = avgRate((p) => p.concreteness.whatRate);
  const averageWhenRate = avgRate((p) => p.concreteness.whenRate);
  const averageHowRate = avgRate((p) => p.concreteness.howRate);

  const focusMatchCounts: Record<FocusMatchVerdict, number> = {
    match: 0,
    partial: 0,
    miss: 0,
    "not-assessable": 0,
  };
  for (const place of places) {
    focusMatchCounts[place.gap.focusMatch] += 1;
  }

  const themeVotes = new Map<string, { label: string; measureCount: number }>();
  for (const place of places) {
    for (const theme of place.focus.themes) {
      const prev = themeVotes.get(theme.id) ?? {
        label: theme.label,
        measureCount: 0,
      };
      prev.measureCount += theme.measureCount;
      themeVotes.set(theme.id, prev);
    }
  }
  const topThemes = [...themeVotes.entries()]
    .map(([id, v]) => ({ id, label: v.label, measureCount: v.measureCount }))
    .sort((a, b) => b.measureCount - a.measureCount)
    .slice(0, 6);

  const sectorCells = buildNationalSectorCells(places, records);
  const weakestSector = [...sectorCells]
    .filter((s) => s.id !== "other")
    .sort(
      (a, b) =>
        (a.municipalityCoverageShare ?? 0) - (b.municipalityCoverageShare ?? 0),
    )[0];
  const strongestMissShare =
    places.filter((p) => p.gap.focusMatch === "miss").length / places.length;

  const nationalInsights: StoryNationalMetrics["nationalInsights"] = [
    {
      id: "coverage",
      title: "Plans we can read in this explore load",
      body: `${withMeasures.length} of ${places.length} municipalities have extractable measures; ${withGap.length} can be compared with emissions.`,
    },
    {
      id: "gap",
      title: "Average uncovered emissions",
      body:
        averageGapShare == null
          ? "Not enough paired plan + emissions data yet."
          : `On average, about ${Math.round(averageGapShare * 100)}% of mapped emissions sit in sectors with no measures in the plan.`,
    },
    {
      id: "biggest",
      title: "Biggest source coverage",
      body: `${focusMatchCounts.match} yes · ${focusMatchCounts.partial} partly · ${focusMatchCounts.miss} not really · ${focusMatchCounts["not-assessable"]} not enough data.`,
    },
  ];
  if (weakestSector) {
    nationalInsights.push({
      id: "weak-sector",
      title: `Least covered sector: ${weakestSector.label}`,
      body: `Only ${Math.round((weakestSector.municipalityCoverageShare ?? 0) * 100)}% of municipalities in this load have measures here.`,
    });
  }
  if (topThemes[0]) {
    nationalInsights.push({
      id: "theme",
      title: "Most common focus theme",
      body: `“${topThemes[0].label}” shows up most often across analysed measures.`,
    });
  }
  if (averageFullSpecShare != null) {
    nationalInsights.push({
      id: "concreteness",
      title: "Who / what / when / how in the text",
      body: `On average, about ${Math.round(averageFullSpecShare * 100)}% of analysed measures name who, what, when and how. Based on plan wording only.`,
    });
  }
  if (averageBroadWordingShare != null) {
    nationalInsights.push({
      id: "broad",
      title: "Broad wording across plans",
      body: `On average, about ${Math.round(averageBroadWordingShare * 100)}% of judged measures are written broadly (could fit several kinds of action). Broad is not automatically wrong.`,
    });
  }

  const nationalStarters = [
    averageGapShare != null
      ? `You could ask: across analysed municipalities, about ${Math.round(averageGapShare * 100)}% of emissions sit in sectors with no plan measures — how does our municipality compare?`
      : null,
    strongestMissShare >= 0.2
      ? `You could ask: in ${Math.round(strongestMissShare * 100)}% of analysed plans, the biggest emission source has no clear actions — is ours one of them?`
      : null,
    weakestSector
      ? `You could ask: ${weakestSector.label} is rarely covered in these plans — what is our municipality doing there?`
      : null,
    averageFullSpecShare != null
      ? `You could ask: only about ${Math.round(averageFullSpecShare * 100)}% of analysed measures name who, what, when and how — can our municipality clarify the rest?`
      : null,
    topThemes[0]
      ? `You could ask: many Swedish plans lean on “${topThemes[0].label}” — is that the right priority for us locally?`
      : null,
    `You could ask: which parts of our climate plan are funded and scheduled this year, and which are still only on paper?`,
  ].filter(Boolean) as string[];

  return {
    municipalityCount: places.length,
    withMeasuresCount: withMeasures.length,
    withPlanYearCount: withPlanYear.length,
    withGapCount: withGap.length,
    averageGapShare,
    averageBroadWordingShare,
    averageFullSpecShare,
    averageWhoRate,
    averageWhatRate,
    averageWhenRate,
    averageHowRate,
    focusMatchCounts,
    sectorCells,
    topThemes,
    medianAdoptedYear: median(
      withPlanYear
        .map((p) => p.record.adoptedYear)
        .filter((y): y is number => y != null),
    ),
    places,
    nationalStarters,
    nationalInsights,
  };
}

/** Resolve SMHI emissions presence for debugging empty story states. */
export function storyEmissionsCoverage(
  records: ExploreMunicipalityRecord[],
  sectorEmissions: SectorYearEmissions[],
): { matched: number; total: number } {
  let matched = 0;
  for (const record of records) {
    if (findSectorEmissions(sectorEmissions, record.name)) matched += 1;
  }
  return { matched, total: records.length };
}
