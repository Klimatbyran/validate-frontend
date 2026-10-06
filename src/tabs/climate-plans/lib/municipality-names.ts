/** Fold Swedish place names so "Nässjö", "Nassjo", and "nassjo" match. */
export function foldPlaceName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** "Jönköpings län" and geojson "Jönköping" should collide. */
export function foldRegionName(value: string): string {
  const withoutLan = value
    .trim()
    .replace(/\s+län$/i, "")
    .replace(/\s+lan$/i, "");
  const folded = foldPlaceName(withoutLan);
  return folded.endsWith("s") && folded.length > 4
    ? folded.slice(0, -1)
    : folded;
}

export function namesMatch(a: string, b: string): boolean {
  const fa = foldPlaceName(a);
  const fb = foldPlaceName(b);
  if (fa === fb) return true;
  return foldRegionName(a) === foldRegionName(b);
}

const SCB_LAN_CODE_TO_REGION: Record<string, string> = {
  "01": "Stockholm",
  "03": "Uppsala",
  "04": "Södermanland",
  "05": "Östergötland",
  "06": "Jönköping",
  "07": "Kronoberg",
  "08": "Kalmar",
  "09": "Gotland",
  "10": "Blekinge",
  "12": "Skåne",
  "13": "Halland",
  "14": "Västra Götaland",
  "17": "Värmland",
  "18": "Örebro",
  "19": "Västmanland",
  "20": "Dalarna",
  "21": "Gävleborg",
  "22": "Västernorrland",
  "23": "Jämtland",
  "24": "Västerbotten",
  "25": "Norrbotten",
};

export function regionNameForLanCode(lanCode: string): string | null {
  return SCB_LAN_CODE_TO_REGION[lanCode] ?? null;
}

export function lookupByFoldedName<T>(
  items: T[],
  nameOf: (item: T) => string,
  query: string,
): T | undefined {
  const folded = foldPlaceName(query);
  const regionFolded = foldRegionName(query);
  return items.find((item) => {
    const name = nameOf(item);
    return (
      foldPlaceName(name) === folded || foldRegionName(name) === regionFolded
    );
  });
}
