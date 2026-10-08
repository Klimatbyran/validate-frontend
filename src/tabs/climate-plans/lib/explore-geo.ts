export interface GeoFeature {
  id: string;
  name: string;
  lanCode: string | null;
  path: string;
}

export interface GeoCollection {
  features: GeoFeature[];
  bounds: { minLon: number; minLat: number; maxLon: number; maxLat: number };
}

type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] };

interface RawFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: Geometry | null;
}

interface FeatureCollection {
  type: "FeatureCollection";
  features: RawFeature[];
}

const SWEDEN_BOUNDS = {
  minLon: 10.7,
  minLat: 55.2,
  maxLon: 24.3,
  maxLat: 69.15,
};

function project(
  lon: number,
  lat: number,
  width: number,
  height: number,
  pad = 8,
): [number, number] {
  const { minLon, minLat, maxLon, maxLat } = SWEDEN_BOUNDS;
  const x = pad + ((lon - minLon) / (maxLon - minLon)) * (width - pad * 2);
  const y = pad + ((maxLat - lat) / (maxLat - minLat)) * (height - pad * 2);
  return [x, y];
}

function ringPath(ring: Ring, width: number, height: number): string {
  return (
    ring
      .map((pt, i) => {
        const [x, y] = project(pt[0], pt[1], width, height);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + "Z"
  );
}

function geometryPath(
  geometry: Geometry,
  width: number,
  height: number,
): string {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) =>
      polygon.map((ring) => ringPath(ring, width, height)).join(" "),
    )
    .join(" ");
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function parseGeoCollection(
  raw: FeatureCollection,
  kind: "municipality" | "region",
  width: number,
  height: number,
): GeoCollection {
  const features: GeoFeature[] = [];
  for (const feature of raw.features) {
    if (!feature.geometry) continue;
    const name =
      kind === "municipality"
        ? asString(feature.properties.kom_namn)
        : asString(feature.properties.name);
    if (!name) continue;
    const lanCode =
      kind === "municipality" ? asString(feature.properties.lan_code) : null;
    const id =
      asString(feature.properties.id) ??
      (typeof feature.properties.l_id === "number"
        ? String(feature.properties.l_id)
        : name);
    features.push({
      id,
      name,
      lanCode,
      path: geometryPath(feature.geometry, width, height),
    });
  }
  return { features, bounds: SWEDEN_BOUNDS };
}

export async function loadSwedenGeo(
  kind: "municipality" | "region",
  width: number,
  height: number,
): Promise<GeoCollection> {
  const file =
    kind === "municipality"
      ? "/climate-plans/geo/swedish_municipalities.geojson"
      : "/climate-plans/geo/swedish_regions.geojson";
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Failed to load ${file}`);
  const raw = (await res.json()) as FeatureCollection;
  return parseGeoCollection(raw, kind, width, height);
}
