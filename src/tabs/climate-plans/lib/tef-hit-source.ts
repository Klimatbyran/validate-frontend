/**
 * Classify TEF hits for Explore visuals.
 *
 * - official: active catalogue TEFs (T-…-TE-…)
 * - proposed: catalogue shadow proposals (STE-*) already integrated into the
 *   matcher snapshot so they can be assigned like ordinary TEFs
 * - runtime-shadow: second-pass ShadowTransitionElement gaps (DB), before we
 *   decide whether to promote them into the catalogue
 */

export type TefHitSource = "official" | "proposed" | "runtime-shadow";

export type TefSourceFilter = "all" | TefHitSource;

const STE_INDEX_RE = /\b(STE-\d+)\b/i;

export function isCatalogueProposedTef(input: {
  stableId: string;
  shortLabel: string;
  sectorPath: string;
}): boolean {
  if (input.stableId.startsWith("shadow_")) return true;
  if (STE_INDEX_RE.test(input.shortLabel)) return true;
  if (input.sectorPath.trim().toLowerCase().startsWith("shadow proposals")) {
    return true;
  }
  return false;
}

export function classifyCatalogueTefHit(input: {
  stableId: string;
  shortLabel: string;
  sectorPath: string;
}): Exclude<TefHitSource, "runtime-shadow"> {
  return isCatalogueProposedTef(input) ? "proposed" : "official";
}

export function runtimeShadowStableId(shadowElementId: string): string {
  return `runtime-shadow:${shadowElementId}`;
}

export function parseRuntimeShadowId(stableId: string): string | null {
  if (!stableId.startsWith("runtime-shadow:")) return null;
  return stableId.slice("runtime-shadow:".length) || null;
}

export function parseSteIndex(shortLabel: string): string | null {
  const match = shortLabel.match(STE_INDEX_RE);
  return match ? match[1].toUpperCase() : null;
}

export function filterHitsBySource<T extends { source?: TefHitSource }>(
  hits: T[],
  filter: TefSourceFilter,
): T[] {
  if (filter === "all") return hits;
  return hits.filter((hit) => (hit.source ?? "official") === filter);
}

export function dominantHitSource(
  hits: Array<{ source?: TefHitSource }>,
): TefHitSource {
  if (hits.length === 0) return "official";
  const counts: Record<TefHitSource, number> = {
    official: 0,
    proposed: 0,
    "runtime-shadow": 0,
  };
  for (const hit of hits) {
    counts[hit.source ?? "official"] += 1;
  }
  return (Object.entries(counts) as [TefHitSource, number][]).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0]![0];
}

export const TEF_SOURCE_LABEL: Record<TefHitSource, string> = {
  official: "Official",
  proposed: "Proposed (STE)",
  "runtime-shadow": "Shadow gap",
};

export const TEF_SOURCE_FILTER_OPTIONS: {
  value: TefSourceFilter;
  label: string;
}[] = [
  { value: "all", label: "All sources" },
  { value: "official", label: "Official" },
  { value: "proposed", label: "Proposed STE" },
  { value: "runtime-shadow", label: "Shadow gaps" },
];
