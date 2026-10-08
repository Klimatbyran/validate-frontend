import { Callout } from "@/ui/callout";
import { ViewModePills } from "@/ui/view-mode-pills";
import { useExploreDataset } from "../hooks/useExploreDataset";
import type { ExploreViewId } from "../lib/explore-types";
import { MapKpiView } from "./MapKpiView";
import { AlignmentView } from "./AlignmentView";
import { GoalTrackingView } from "./GoalTrackingView";
import { TefLandscapeView } from "./TefLandscapeView";
import { TefFrameworkView } from "./TefFrameworkView";
import { PlanAnatomyView } from "./PlanAnatomyView";
import type { useClimatePlansExploreParams } from "../hooks/useClimatePlansExploreParams";

const VIEW_OPTIONS: { value: ExploreViewId; label: string }[] = [
  { value: "map", label: "KPI map" },
  { value: "alignment", label: "Emissions vs TEFs" },
  { value: "goals", label: "Goal tracking" },
  { value: "tef-framework", label: "TEF framework" },
  { value: "tef", label: "TEF landscape" },
  { value: "anatomy", label: "Plan anatomy" },
];

export function ExploreDataView({
  params,
}: {
  params: ReturnType<typeof useClimatePlansExploreParams>;
}) {
  const { data, isLoading, error } = useExploreDataset(true);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-02">
        Loading extracts, targets, and emissions…
      </div>
    );
  }

  if (error && !data) {
    return (
      <Callout variant="error" title="Could not load explore data">
        <p className="text-sm text-pink-03/80 mt-1">{error}</p>
      </Callout>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-02 max-w-3xl">
        Internal reading views over whatever extracts we have so far. Grey map
        cells and empty tables are expected until more climate plans are run.
        Each view states the exact fields and formulas it uses so we can argue
        about the story, not the arithmetic.
      </p>
      <ViewModePills
        options={VIEW_OPTIONS}
        value={params.view}
        onValueChange={params.setView}
        ariaLabel="Explore views"
      />
      {params.view === "map" ? (
        <MapKpiView
          records={data.municipalities}
          geo={params.geo}
          onGeoChange={params.setGeo}
          kpi={params.kpi}
          onKpiChange={params.setKpi}
          tefGroup={params.tefGroup}
          onTefGroupChange={params.setTefGroup}
          selectedName={params.selectedName}
          onSelectName={params.setSelectedName}
        />
      ) : null}
      {params.view === "alignment" ? (
        <AlignmentView
          dataset={data}
          selectedName={params.selectedName}
          onSelectName={params.setSelectedName}
          yearMode={params.yearMode}
          onYearModeChange={params.setYearMode}
        />
      ) : null}
      {params.view === "goals" ? (
        <GoalTrackingView
          dataset={data}
          selectedName={params.selectedName}
          onSelectName={params.setSelectedName}
        />
      ) : null}
      {params.view === "tef-framework" ? (
        <TefFrameworkView
          records={data.municipalities}
          scope={params.tefScope}
          onScopeChange={params.setTefScope}
          placeName={params.selectedName}
          onPlaceNameChange={params.setSelectedName}
          metric={params.tefMetric}
          onMetricChange={params.setTefMetric}
          selectedTefId={params.selectedTefId}
          onSelectTefId={params.setSelectedTefId}
        />
      ) : null}
      {params.view === "tef" ? (
        <TefLandscapeView records={data.municipalities} />
      ) : null}
      {params.view === "anatomy" ? (
        <PlanAnatomyView records={data.municipalities} />
      ) : null}
    </div>
  );
}
