import { useState, useMemo } from "react";
import { Callout } from "@/ui/callout";
import { ViewModePills } from "@/ui/view-mode-pills";
import { useMeasures } from "./hooks/useMeasures";
import { useClimatePlansExploreParams } from "./hooks/useClimatePlansExploreParams";
import { ExploreDataView } from "./components/ExploreDataView";
import { RankedList, ScoreDistribution } from "./components/RankedList";
import { TaxonomyView } from "./components/TaxonomyView";

export function ClimatePlansExplorer() {
  const { data, isLoading, error } = useMeasures();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useClimatePlansExploreParams();
  const topView = params.tab;

  const municipality = useMemo(
    () =>
      data.length === 0
        ? null
        : (data.find((d) => d.id === selectedId) ?? data[0]),
    [data, selectedId],
  );

  if (isLoading && topView !== "explore") {
    return (
      <div className="flex items-center justify-center py-24 text-gray-02">
        Loading measures data…
      </div>
    );
  }

  if (error && topView !== "explore") {
    return (
      <Callout variant="error" title="Failed to load measures">
        <p className="text-sm text-pink-03/80 mt-1">{error}</p>
      </Callout>
    );
  }

  if (data.length === 0 && topView !== "explore") {
    return (
      <Callout variant="info" title="No data found">
        <p className="text-sm text-blue-03/80 mt-1">
          Add municipality measures JSON files to{" "}
          <code className="font-mono text-sm">
            public/climate-plans/measures/
          </code>
          .
        </p>
      </Callout>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-01">
            Climate Plan Measures
          </h1>
          <p className="text-sm text-gray-02 mt-1">
            {topView === "measures"
              ? "Ranked by activity shift clarity and intervention specificity (1–7 scale)"
              : topView === "taxonomy"
                ? "Browse taxonomy transition elements across all municipalities"
                : "Aggregated map, alignment, and tracking views over the extracts we have so far"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ViewModePills
            options={[
              { value: "measures", label: "By measure" },
              { value: "taxonomy", label: "By taxonomy" },
              { value: "explore", label: "Explore data" },
            ]}
            value={topView}
            onValueChange={params.setTab}
            ariaLabel="Climate plan views"
          />

          {topView === "measures" &&
            (data.length > 1 ? (
              <select
                value={municipality?.id ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2 hover:border-gray-03 focus:outline-none focus:border-blue-03/50"
              >
                {data.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-gray-01 bg-gray-04 border border-gray-03/30 rounded px-3 py-2">
                {data[0].name}
              </span>
            ))}
        </div>
      </div>

      {topView === "explore" ? (
        <ExploreDataView params={params} />
      ) : topView === "taxonomy" ? (
        <TaxonomyView data={data} />
      ) : municipality ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            {(["activity", "intervention"] as const).map((dim) => {
              const count = municipality.measures.filter(
                (m) =>
                  (dim === "activity"
                    ? m.activity_shift_score
                    : m.intervention_score) > 1,
              ).length;
              return (
                <div
                  key={dim}
                  className="bg-gray-04/80 rounded-lg border border-gray-03/30 px-5 py-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-02 uppercase tracking-wide">
                      {dim === "activity" ? "Activity Shifts" : "Interventions"}
                    </span>
                    <span className="text-sm text-gray-02">
                      {count}/{municipality.measures.length} present
                    </span>
                  </div>
                  <ScoreDistribution
                    measures={municipality.measures}
                    dimension={dim}
                  />
                </div>
              );
            })}
          </div>

          <RankedList
            title="Activity Shifts"
            subtitle="How clearly the measure identifies what activity changes and how"
            measures={municipality.measures}
            dimension="activity"
            defaultSort="desc"
          />
          <RankedList
            title="Interventions"
            subtitle="How specifically the measure defines who does what, when, and how"
            measures={municipality.measures}
            dimension="intervention"
            defaultSort="desc"
          />
        </>
      ) : null}
    </div>
  );
}
