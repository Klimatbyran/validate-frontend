type YearBadgeAccent = "green" | "blue" | "orange";

const ACCENT_CLASSES: Record<
  YearBadgeAccent,
  { wrapper: string; pill: string }
> = {
  green: {
    wrapper:
      "bg-green-03/15 rounded-lg px-4 py-2 w-fit border border-green-03/30",
    pill:
      "bg-green-03/30 text-green-03 text-xs font-semibold px-3 py-1 rounded-full ml-2 border border-green-03/40",
  },
  blue: {
    wrapper: "bg-blue-03/15 rounded-lg px-4 py-2 w-fit border border-blue-03/30",
    pill:
      "bg-blue-03/30 text-blue-03 text-xs font-semibold px-3 py-1 rounded-full ml-2 border border-blue-03/40",
  },
  orange: {
    wrapper:
      "bg-orange-03/15 rounded-lg px-4 py-2 w-fit border border-orange-03/30",
    pill:
      "bg-orange-03/30 text-orange-03 text-xs font-semibold px-3 py-1 rounded-full ml-2 border border-orange-03/40",
  },
};

interface YearBadgeProps {
  year: number;
  isLatest?: boolean;
  accent: YearBadgeAccent;
}

/**
 * Shared year label + optional "Senaste år" pill for scope sections (Economy, Scope12, Scope3).
 */
export function YearBadge({ year, isLatest = false, accent }: YearBadgeProps) {
  const classes = ACCENT_CLASSES[accent];
  return (
    <div className={`flex items-center mb-3 ${classes.wrapper}`}>
      <span className="text-2xl font-extrabold text-gray-01 mr-3">{year}</span>
      {isLatest && <span className={classes.pill}>Senaste år</span>}
    </div>
  );
}
