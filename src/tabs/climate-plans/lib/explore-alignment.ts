import type { SectorYearEmissions } from "./explore-types";
import { namesMatch } from "./municipality-names";

export function pickEmissionsYear(
  byYear: Record<string, Record<string, number>>,
  mode: "latest" | "plan",
  planYear: number | null,
): string | null {
  const years = Object.keys(byYear)
    .map((y) => Number.parseInt(y, 10))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
  if (years.length === 0) return null;
  if (mode === "latest") return String(years[years.length - 1]);
  if (planYear == null) return String(years[years.length - 1]);
  const atOrBefore = [...years].reverse().find((y) => y <= planYear);
  return String(atOrBefore ?? years[0]);
}

export function findSectorEmissions(
  all: SectorYearEmissions[],
  municipalityName: string,
): SectorYearEmissions | undefined {
  return all.find((row) => namesMatch(row.municipalityName, municipalityName));
}
