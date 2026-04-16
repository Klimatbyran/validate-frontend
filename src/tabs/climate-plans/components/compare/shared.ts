export const scopeTKey: Record<string, string> = {
  municipal_territory: "climate.compare.municipalTerritory",
  municipal_operations: "climate.compare.municipalOperations",
  whole_municipality: "climate.compare.wholeMunicipality",
  geographic_area: "climate.compare.geographicArea",
};

export const MUNICIPALITY_COLORS = [
  {
    bg: "bg-blue-03",
    text: "text-blue-03",
    bgFaint: "bg-blue-03/20",
    border: "border-blue-03",
  },
  {
    bg: "bg-orange-03",
    text: "text-orange-03",
    bgFaint: "bg-orange-03/20",
    border: "border-orange-03",
  },
  {
    bg: "bg-green-03",
    text: "text-green-03",
    bgFaint: "bg-green-03/20",
    border: "border-green-03",
  },
  {
    bg: "bg-pink-03",
    text: "text-pink-03",
    bgFaint: "bg-pink-03/20",
    border: "border-pink-03",
  },
] as const;

