export type BadgeVariant = "blue" | "green" | "orange" | "default";

export const ACCOUNTING_TYPE_KEYS: Record<
  string,
  { labelKey: string; badgeKeys: string[] }
> = {
  territorial: {
    labelKey: "climate.compare.territorialOnly",
    badgeKeys: ["climate.compare.territorialBadge"],
  },
  consumption: {
    labelKey: "climate.compare.consumptionBasedOnly",
    badgeKeys: ["climate.compare.consumptionBasedBadge"],
  },
  both: {
    labelKey: "climate.compare.territorialAndConsumption",
    badgeKeys: [
      "climate.compare.territorialBadge",
      "climate.compare.consumptionBasedBadge",
    ],
  },
};

export const FOCUS_KEYS: Record<
  string,
  {
    labelKey: string;
    badges: { labelKey: string; variant: Exclude<BadgeVariant, "default"> }[];
  }
> = {
  mitigation: {
    labelKey: "climate.compare.mitigation",
    badges: [{ labelKey: "climate.compare.mitigation", variant: "green" }],
  },
  adaptation: {
    labelKey: "climate.compare.adaptation",
    badges: [{ labelKey: "climate.compare.adaptation", variant: "blue" }],
  },
  both: {
    labelKey: "climate.compare.mitigationAndAdaptation",
    badges: [
      { labelKey: "climate.compare.mitigation", variant: "green" },
      { labelKey: "climate.compare.adaptation", variant: "blue" },
    ],
  },
};

export const STRENGTH_KEYS: Record<
  string,
  { labelKey: string; variant: BadgeVariant }
> = {
  adopted_goal: { labelKey: "climate.compare.adoptedGoal", variant: "green" },
  political_commitment: {
    labelKey: "climate.compare.politicalCommitment",
    variant: "blue",
  },
  aspiration: { labelKey: "climate.compare.aspiration", variant: "orange" },
};

export const CONFIDENCE_STYLES: Record<
  string,
  { variant: BadgeVariant }
> = {
  high: { variant: "green" },
  medium: { variant: "orange" },
  low: { variant: "default" },
};

