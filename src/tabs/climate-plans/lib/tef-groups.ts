import type { MatchConfidence } from "./measures-types";

export const CONFIDENCE_WEIGHT: Record<MatchConfidence, number> = {
  high: 3,
  mid: 2,
  low: 1,
};

export const CONFIDENCE_CLASSES: Record<MatchConfidence, string> = {
  high: "bg-green-03/20 text-green-03 border-green-03/30",
  mid: "bg-blue-03/20 text-blue-03 border-blue-03/30",
  low: "bg-orange-03/20 text-orange-03 border-orange-03/30",
};

export function inferMatchConfidence(
  value: string | undefined,
  score: number | undefined,
): MatchConfidence {
  if (value === "high" || value === "mid" || value === "low") return value;
  if (score == null || Number.isNaN(score)) return "mid";
  if (score >= 0.55) return "high";
  if (score >= 0.4) return "mid";
  return "low";
}

/** First segment of a taxonomy `sector_path`, e.g. "Transport > Mobility > Road". */
export function tefGroupFromSectorPath(sectorPath: string): string {
  const first = sectorPath.split(">")[0]?.trim() ?? "";
  return first || "Unclassified";
}

export type EmissionBucket =
  | "transport"
  | "industry"
  | "energy"
  | "heating"
  | "agriculture"
  | "machinery"
  | "waste"
  | "product"
  | "other";

const TEF_GROUP_TO_BUCKET: Record<string, EmissionBucket> = {
  transport: "transport",
  mobility: "transport",
  industry: "industry",
  industrial: "industry",
  manufacturing: "industry",
  energy: "energy",
  power: "energy",
  electricity: "energy",
  buildings: "heating",
  building: "heating",
  "built environment": "heating",
  heating: "heating",
  agriculture: "agriculture",
  afolu: "agriculture",
  forest: "agriculture",
  forestry: "agriculture",
  wood: "agriculture",
  "land use": "agriculture",
  waste: "waste",
  circular: "waste",
};

export function emissionBucketForTefGroup(group: string): EmissionBucket {
  const key = group.trim().toLowerCase();
  return TEF_GROUP_TO_BUCKET[key] ?? "other";
}

export function emissionBucketForSectorLabel(label: string): EmissionBucket {
  const key = label.trim().toLowerCase();
  if (key.includes("transport") || key.includes("transporter"))
    return "transport";
  if (key.includes("industri")) return "industry";
  if (
    key.includes("fjärrvärme") ||
    key.includes("fjarrvarme") ||
    key.includes("el och")
  ) {
    return "energy";
  }
  if (key.includes("electric") || key === "el") return "energy";
  if (
    key.includes("uppvärmning") ||
    key.includes("uppvaermning") ||
    key.includes("heating")
  ) {
    return "heating";
  }
  if (
    key.includes("jordbruk") ||
    key.includes("agriculture") ||
    key.includes("skog") ||
    key.includes("land use")
  ) {
    return "agriculture";
  }
  if (key.includes("arbetsmaskin") || key.includes("machinery"))
    return "machinery";
  if (
    key.includes("avfall") ||
    key.includes("waste") ||
    key.includes("avlopp")
  ) {
    return "waste";
  }
  if (key.includes("produkt") || key.includes("solvent")) return "product";
  return "other";
}

export const EMISSION_BUCKET_LABEL: Record<EmissionBucket, string> = {
  transport: "Transport",
  industry: "Industry",
  energy: "Electricity & district heat",
  heating: "Buildings / own heating",
  agriculture: "Agriculture, forest & land",
  machinery: "Working machinery",
  waste: "Waste & sewage",
  product: "Product use",
  other: "Other / unmapped",
};
