import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  ClimatePlansTabId,
  ExploreViewId,
  GoalsGroupById,
  GoalsLayoutId,
  MapGeoLevel,
  MapKpiId,
  ShiftsLayoutId,
  TefFrameworkHeightMode,
  TefFrameworkLayout,
  TefFrameworkMetric,
  TefFrameworkScope,
} from "../lib/explore-types";
import { MAP_KPI_META } from "../lib/explore-aggregates";

const TABS: ClimatePlansTabId[] = ["explore", "measures", "taxonomy"];
const VIEWS: ExploreViewId[] = [
  "map",
  "goals",
  "shifts",
  "tef-framework",
  "anatomy",
];
const GEOS: MapGeoLevel[] = ["municipality", "region"];
const TEF_SCOPES: TefFrameworkScope[] = ["all", "municipality", "region"];
const TEF_METRICS: TefFrameworkMetric[] = [
  "hits",
  "strength",
  "municipalities",
];
const TEF_LAYOUTS: TefFrameworkLayout[] = ["3d", "grid"];
const TEF_HEIGHT_MODES: TefFrameworkHeightMode[] = ["share", "tonnes"];
const GOALS_LAYOUTS: GoalsLayoutId[] = ["list", "atlas"];
const GOALS_GROUP_BY: GoalsGroupById[] = [
  "reduction",
  "status",
  "deadline",
  "paris",
  "scope",
];
const GOALS_ATLAS_SCOPES = ["selected", "all"] as const;
const SHIFTS_LAYOUTS: ShiftsLayoutId[] = ["compare", "flows", "types"];
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

  const tab = pick(searchParams.get("tab"), TABS, "explore");
  const view = pick(searchParams.get("view"), VIEWS, "map");
  const kpi = pick(searchParams.get("kpi"), KPIS, "uniqueCommitments");
  const geo = pick(searchParams.get("geo"), GEOS, "municipality");
  const tefGroup = searchParams.get("tefGroup") || "all";
  const selectedName = searchParams.get("muni");
  const tefScope = pick(searchParams.get("tefScope"), TEF_SCOPES, "all");
  const tefMetric = pick(searchParams.get("tefMetric"), TEF_METRICS, "hits");
  const tefEmissions = searchParams.get("tefEmissions") === "1";
  const tefLayout = pick(searchParams.get("tefLayout"), TEF_LAYOUTS, "3d");
  const tefHeight = pick(
    searchParams.get("tefHeight"),
    TEF_HEIGHT_MODES,
    "share",
  );
  const goalsLayout = pick(
    searchParams.get("goalsLayout"),
    GOALS_LAYOUTS,
    "list",
  );
  const goalsGroupBy = pick(
    searchParams.get("goalsGroupBy"),
    GOALS_GROUP_BY,
    "reduction",
  );
  const goalsAtlasScope = pick(
    searchParams.get("goalsAtlasScope"),
    GOALS_ATLAS_SCOPES,
    "all",
  );
  const shiftsLayout = pick(
    searchParams.get("shiftsLayout"),
    SHIFTS_LAYOUTS,
    "compare",
  );
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
    tefGroup,
    selectedName,
    tefScope,
    tefMetric,
    tefEmissions,
    tefLayout,
    tefHeight,
    goalsLayout,
    goalsGroupBy,
    goalsAtlasScope,
    shiftsLayout,
    selectedTefId,
    setTab: (value: ClimatePlansTabId) => patch({ tab: value }),
    setView: (value: ExploreViewId) => patch({ view: value }),
    setKpi: (value: MapKpiId) => patch({ kpi: value }),
    setGeo: (value: MapGeoLevel) => patch({ geo: value }),
    setTefGroup: (value: string) => patch({ tefGroup: value }),
    setSelectedName: (value: string) => patch({ muni: value }),
    setTefScope: (value: TefFrameworkScope) => patch({ tefScope: value }),
    setTefMetric: (value: TefFrameworkMetric) => patch({ tefMetric: value }),
    setTefEmissions: (value: boolean) =>
      patch({ tefEmissions: value ? "1" : null }),
    setTefLayout: (value: TefFrameworkLayout) => patch({ tefLayout: value }),
    setTefHeight: (value: TefFrameworkHeightMode) =>
      patch({ tefHeight: value }),
    setGoalsLayout: (value: GoalsLayoutId) => patch({ goalsLayout: value }),
    setGoalsGroupBy: (value: GoalsGroupById) => patch({ goalsGroupBy: value }),
    setGoalsAtlasScope: (value: "selected" | "all") =>
      patch({ goalsAtlasScope: value }),
    setShiftsLayout: (value: ShiftsLayoutId) => patch({ shiftsLayout: value }),
    setSelectedTefId: (value: string) => patch({ tefId: value }),
  };
}

function isDefault(key: string, value: string): boolean {
  if (key === "tab" && value === "explore") return true;
  if (key === "view" && value === "map") return true;
  if (key === "kpi" && value === "uniqueCommitments") return true;
  if (key === "geo" && value === "municipality") return true;
  if (key === "tefGroup" && value === "all") return true;
  if (key === "tefScope" && value === "all") return true;
  if (key === "tefMetric" && value === "hits") return true;
  if (key === "tefLayout" && value === "3d") return true;
  if (key === "tefHeight" && value === "share") return true;
  if (key === "goalsLayout" && value === "list") return true;
  if (key === "goalsGroupBy" && value === "reduction") return true;
  if (key === "goalsAtlasScope" && value === "all") return true;
  if (key === "shiftsLayout" && value === "compare") return true;
  return false;
}
