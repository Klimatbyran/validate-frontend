import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  ClimatePlansTabId,
  EmissionsYearMode,
  ExploreViewId,
  MapGeoLevel,
  MapKpiId,
  TefFrameworkMetric,
  TefFrameworkScope,
} from "../lib/explore-types";
import { MAP_KPI_META } from "../lib/explore-aggregates";

const TABS: ClimatePlansTabId[] = ["measures", "taxonomy", "explore"];
const VIEWS: ExploreViewId[] = [
  "map",
  "alignment",
  "goals",
  "tef",
  "tef-framework",
  "anatomy",
];
const GEOS: MapGeoLevel[] = ["municipality", "region"];
const YEAR_MODES: EmissionsYearMode[] = ["latest", "plan"];
const TEF_SCOPES: TefFrameworkScope[] = ["all", "municipality", "region"];
const TEF_METRICS: TefFrameworkMetric[] = [
  "hits",
  "strength",
  "municipalities",
];
const KPIS = Object.keys(MAP_KPI_META) as MapKpiId[];

function pick<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function useClimatePlansExploreParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = pick(searchParams.get("tab"), TABS, "measures");
  const view = pick(searchParams.get("view"), VIEWS, "map");
  const kpi = pick(searchParams.get("kpi"), KPIS, "uniqueCommitments");
  const geo = pick(searchParams.get("geo"), GEOS, "municipality");
  const yearMode = pick(
    searchParams.get("emissionsYear"),
    YEAR_MODES,
    "latest",
  );
  const tefGroup = searchParams.get("tefGroup") || "all";
  const selectedName = searchParams.get("muni");
  const tefScope = pick(searchParams.get("tefScope"), TEF_SCOPES, "all");
  const tefMetric = pick(searchParams.get("tefMetric"), TEF_METRICS, "hits");
  const selectedTefId = searchParams.get("tefId");

  const patch = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value == null || value === "" || isDefault(key, value))
              next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    tab,
    view,
    kpi,
    geo,
    yearMode,
    tefGroup,
    selectedName,
    tefScope,
    tefMetric,
    selectedTefId,
    setTab: (value: ClimatePlansTabId) => patch({ tab: value }),
    setView: (value: ExploreViewId) => patch({ view: value }),
    setKpi: (value: MapKpiId) => patch({ kpi: value }),
    setGeo: (value: MapGeoLevel) => patch({ geo: value }),
    setYearMode: (value: EmissionsYearMode) => patch({ emissionsYear: value }),
    setTefGroup: (value: string) => patch({ tefGroup: value }),
    setSelectedName: (value: string) => patch({ muni: value }),
    setTefScope: (value: TefFrameworkScope) => patch({ tefScope: value }),
    setTefMetric: (value: TefFrameworkMetric) => patch({ tefMetric: value }),
    setSelectedTefId: (value: string) => patch({ tefId: value }),
  };
}

function isDefault(key: string, value: string): boolean {
  if (key === "tab" && value === "measures") return true;
  if (key === "view" && value === "map") return true;
  if (key === "kpi" && value === "uniqueCommitments") return true;
  if (key === "geo" && value === "municipality") return true;
  if (key === "emissionsYear" && value === "latest") return true;
  if (key === "tefGroup" && value === "all") return true;
  if (key === "tefScope" && value === "all") return true;
  if (key === "tefMetric" && value === "hits") return true;
  return false;
}
