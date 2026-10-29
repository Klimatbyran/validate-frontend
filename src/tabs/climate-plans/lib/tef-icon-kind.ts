/**
 * Map a TEF title / sector path to a compact-cube icon kind.
 * Icons are original glyphs (not TEF website artwork).
 */

export const TEF_ICON_KINDS = [
  "car",
  "bus",
  "bike",
  "train",
  "plane",
  "ship",
  "truck",
  "wind",
  "solar",
  "hydro",
  "bio",
  "hydrogen",
  "heatPump",
  "districtEnergy",
  "fossil",
  "grid",
  "factory",
  "building",
  "cooking",
  "lighting",
  "recycle",
  "nature",
  "water",
  "food",
  "renewable",
  "planning",
  "resource",
  "generic",
] as const;

export type TefIconKind = (typeof TEF_ICON_KINDS)[number];

type Rule = { kind: TefIconKind; pattern: RegExp };

/** First match wins — keep more specific patterns above broader ones. */
const TITLE_RULES: Rule[] = [
  {
    kind: "bike",
    pattern: /\b(bike|bikes|cycling|walking|motorcycle|cargo\s*bike)\b/i,
  },
  { kind: "bus", pattern: /\b(bus|busses|buses)\b/i },
  { kind: "train", pattern: /\b(rail|railway)\b/i },
  {
    kind: "plane",
    pattern:
      /\b(airplane|airplanes|aviation|airfreight|air\s+(?:passenger|freight|travel)|kerosene)\b/i,
  },
  {
    kind: "ship",
    pattern: /\b(marine|lng\b|sea\b|freight.*\bsea|truck to sea)\b/i,
  },
  {
    kind: "truck",
    pattern: /\b(truck|trucks|load factor|mobile machinery|freight)\b/i,
  },
  {
    kind: "car",
    pattern:
      /\b(car|cars|vehicle|vehicles|ecodriving|journey sharing|shared mobility|remote working|online meeting)\b/i,
  },
  { kind: "wind", pattern: /\bwind\b/i },
  { kind: "solar", pattern: /\bsolar\b/i },
  // hydro / hydropower, but not hydrogen
  { kind: "hydro", pattern: /\bhydro(?:power)?\b/i },
  { kind: "hydrogen", pattern: /\b(hydrogen|electrolysis)\b/i },
  {
    kind: "bio",
    pattern: /\b(biomass|biofuel|biogas|chp from waste|chp from biomass)\b/i,
  },
  { kind: "heatPump", pattern: /\bheat\s*pump/i },
  // Stem match — do not require a word boundary after heat/cool (heating, cooling).
  {
    kind: "districtEnergy",
    pattern: /\bdistrict\s*(?:heat|cool)|residual\s*heat|\bchp\b/i,
  },
  // fossil-free before bare fossil
  {
    kind: "renewable",
    pattern: /renewable|fossil[_ -]?free|electricity[_ -]?generation/i,
  },
  {
    kind: "fossil",
    pattern: /\b(coal|oil power|gas power|natural gas|fossil)\b/i,
  },
  { kind: "grid", pattern: /\b(grid electricity|improved grid)\b/i },
  { kind: "cooking", pattern: /\bcooking\b/i },
  { kind: "lighting", pattern: /\b(lighting|street\s*light)/i },
  {
    kind: "recycle",
    pattern:
      /\b(?:recycl|reuse|compost|landfill|waste management|energy recovery from waste|food waste)/i,
  },
  {
    kind: "food",
    pattern: /\b(diet|food procurement|low-carbon food|food provision)\b/i,
  },
  {
    kind: "water",
    pattern: /\b(water|groundwater|aquifer)\b/i,
  },
  {
    kind: "nature",
    pattern:
      /\b(habitat|biodiversity|green space|agriculture|forestry|livestock|nature-based)\b/i,
  },
  {
    kind: "factory",
    pattern:
      /\belectricity in |cement|steel|glass|chemical|magnesium|lead industr|pulp|mineral industr|petroleum/i,
  },
  {
    kind: "building",
    pattern:
      /\b(retrofit|energy efficient|ac in |cooling|heating in|construction|housing|building|appliance)\b/i,
  },
  {
    kind: "planning",
    pattern:
      /\b(?:urban planning|transport planning|municipal facilit|utilisation of municipal)/i,
  },
  {
    kind: "resource",
    pattern: /\b(resource use|resource sharing|efficient resource)\b/i,
  },
  {
    kind: "recycle",
    pattern: /\bwaste\b/i,
  },
];

const PATH_RULES: Rule[] = [
  { kind: "bike", pattern: /\b(active|cycling|walking)\b/i },
  { kind: "train", pattern: /\brail\b/i },
  { kind: "plane", pattern: /\b(aviation|airplane|air)\b/i },
  { kind: "ship", pattern: /\b(marine|shipping)\b/i },
  { kind: "truck", pattern: /\b(freight|truck|machinery)\b/i },
  { kind: "car", pattern: /\b(road|light duty|mobility)\b/i },
  { kind: "wind", pattern: /\bwind\b/i },
  { kind: "solar", pattern: /\bsolar\b/i },
  { kind: "hydro", pattern: /\bhydro(?:power)?\b/i },
  { kind: "hydrogen", pattern: /\bhydrogen\b/i },
  { kind: "districtEnergy", pattern: /\b(heat|combined heat|district)\b/i },
  { kind: "recycle", pattern: /\b(?:waste|solid|recycl|compost)/i },
  { kind: "nature", pattern: /\b(?:afolu|agricultur|forest|livestock|land)/i },
  { kind: "factory", pattern: /\b(industry|metal|mineral|chemical)\b/i },
  { kind: "building", pattern: /\b(building|residential|non.?residential)\b/i },
  { kind: "grid", pattern: /\b(electricity|energy supply)\b/i },
  { kind: "water", pattern: /\bwater\b/i },
  { kind: "food", pattern: /\bfood\b/i },
];

function matchRules(text: string, rules: Rule[]): TefIconKind | null {
  for (const rule of rules) {
    if (rule.pattern.test(text)) return rule.kind;
  }
  return null;
}

/** Pick a compact-cube icon from TEF title, falling back to sector path. */
export function resolveTefIconKind(
  title: string,
  sectorPath?: string | null,
): TefIconKind {
  const fromTitle = matchRules(title, TITLE_RULES);
  if (fromTitle) return fromTitle;
  if (sectorPath) {
    const fromPath = matchRules(sectorPath, PATH_RULES);
    if (fromPath) return fromPath;
  }
  return "generic";
}
