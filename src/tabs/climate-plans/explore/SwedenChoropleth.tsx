import { useEffect, useMemo, useState } from "react";
import { loadSwedenGeo, type GeoFeature } from "../lib/explore-geo";
import { foldRegionName, namesMatch } from "../lib/municipality-names";

const WIDTH = 420;
const HEIGHT = 920;

function lerpColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const stops: [number, number, number][] = [
    [55, 65, 81],
    [59, 130, 246],
    [16, 185, 129],
  ];
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = stops[i];
  const b = stops[i + 1];
  const rgb = a.map((c, idx) => Math.round(c + (b[idx] - c) * f));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function SwedenChoropleth({
  geo,
  values,
  selectedName,
  onSelect,
  booleanScale,
}: {
  geo: "municipality" | "region";
  values: Map<string, number | boolean | null>;
  selectedName: string | null;
  onSelect: (name: string) => void;
  booleanScale: boolean;
}) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSwedenGeo(geo, WIDTH, HEIGHT)
      .then((collection) => {
        if (!cancelled) setFeatures(collection.features);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Map failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [geo]);

  const numericValues = useMemo(() => {
    const nums: number[] = [];
    for (const value of values.values()) {
      if (typeof value === "number" && Number.isFinite(value)) nums.push(value);
    }
    return nums;
  }, [values]);

  const min = numericValues.length ? Math.min(...numericValues) : 0;
  const max = numericValues.length ? Math.max(...numericValues) : 1;
  const span = max - min || 1;

  function lookup(name: string): number | boolean | null | undefined {
    for (const [key, value] of values) {
      if (
        geo === "region"
          ? foldRegionName(key) === foldRegionName(name)
          : namesMatch(key, name)
      ) {
        return value;
      }
    }
    return undefined;
  }

  function fillFor(name: string): string {
    const value = lookup(name);
    if (value == null || value === undefined) return "rgba(75, 85, 99, 0.35)";
    if (booleanScale) {
      return value === true || value === 1
        ? "rgb(16, 185, 129)"
        : "rgb(244, 114, 182)";
    }
    if (typeof value !== "number") return "rgba(75, 85, 99, 0.35)";
    return lerpColor((value - min) / span);
  }

  if (error) {
    return <p className="text-sm text-pink-03/80">{error}</p>;
  }

  if (features.length === 0) {
    return (
      <p className="text-sm text-gray-02 py-16 text-center">Loading map…</p>
    );
  }

  const hoverValue = hover ? lookup(hover) : undefined;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto max-h-[min(78vh,860px)]"
        role="img"
        aria-label={`Sweden ${geo} map`}
      >
        {features.map((feature) => {
          const selected = selectedName
            ? geo === "region"
              ? foldRegionName(feature.name) === foldRegionName(selectedName)
              : namesMatch(feature.name, selectedName)
            : false;
          return (
            <path
              key={feature.id}
              d={feature.path}
              fill={fillFor(feature.name)}
              stroke={
                selected ? "rgb(249, 250, 251)" : "rgba(17, 24, 39, 0.55)"
              }
              strokeWidth={selected ? 1.8 : 0.4}
              className="cursor-pointer hover:opacity-90"
              onClick={() => onSelect(feature.name)}
              onMouseEnter={() => setHover(feature.name)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{feature.name}</title>
            </path>
          );
        })}
      </svg>
      {hover ? (
        <div className="absolute left-3 bottom-3 rounded-md bg-gray-05/95 border border-gray-03/40 px-2.5 py-1.5 text-xs text-gray-01">
          <span className="font-medium">{hover}</span>
          <span className="text-gray-02">
            {" · "}
            {hoverValue == null || hoverValue === undefined
              ? "no extract yet"
              : typeof hoverValue === "boolean"
                ? hoverValue
                  ? "yes"
                  : "no"
                : Number.isInteger(hoverValue)
                  ? String(hoverValue)
                  : hoverValue.toFixed(2)}
          </span>
        </div>
      ) : null}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-02">
        {booleanScale ? (
          <>
            <span className="inline-block w-3 h-3 rounded-sm bg-green-03" /> yes
            <span className="inline-block w-3 h-3 rounded-sm bg-pink-03" /> no
            <span className="inline-block w-3 h-3 rounded-sm bg-gray-03/50" />{" "}
            no data
          </>
        ) : (
          <>
            <span className="inline-block h-2 w-24 rounded-sm bg-gradient-to-r from-gray-03 via-blue-03 to-green-03" />
            <span className="tabular-nums">
              {min.toFixed(min >= 10 ? 0 : 2)} –{" "}
              {max.toFixed(max >= 10 ? 0 : 2)}
            </span>
            <span>grey = no extract</span>
          </>
        )}
      </div>
    </div>
  );
}
