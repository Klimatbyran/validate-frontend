export type CoveragePercentTone = "high" | "medium" | "low";

export function coveragePercentTone(percent: number): CoveragePercentTone {
  if (percent >= 80) return "high";
  if (percent >= 50) return "medium";
  return "low";
}

/** Text color for a coverage percentage value. */
export function coveragePercentTextClass(percent: number): string {
  const tone = coveragePercentTone(percent);
  if (tone === "high") return "text-green-03";
  if (tone === "medium") return "text-yellow-400";
  return "text-orange-03";
}

/** Stat card colors for coverage percentage. */
export function coveragePercentCardClass(percent: number): string {
  const tone = coveragePercentTone(percent);
  if (tone === "high") {
    return "border-green-03/30 bg-green-03/10 text-green-03";
  }
  if (tone === "medium") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }
  return "border-orange-03/30 bg-orange-03/10 text-orange-03";
}

export const coverageMatchedTextClass =
  "text-green-03 font-medium tabular-nums";
export const coverageAmbiguousTextClass =
  "text-yellow-400 font-medium tabular-nums";
export const coverageMissingTextClass =
  "text-orange-03 font-medium tabular-nums";
export const coverageTotalTextClass = "text-gray-02 tabular-nums";
