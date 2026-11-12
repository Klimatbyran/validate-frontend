import { useMemo, useState } from "react";
import { Callout } from "@/ui/callout";
import { ViewModePills } from "@/ui/view-mode-pills";
import { MethodologyPanel } from "./MethodologyPanel";
import {
  MunicipalityDetailV2,
  MunicipalityOverviewV2,
  type OverviewKpi,
} from "./website-visuals-v2-mocks";
import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "../lib/explore-types";
import { namesMatch } from "../lib/municipality-names";
import { buildWebsiteV2PlaceBundle } from "../lib/website-v2-kpis";
import { ACTION_CONCRETENESS_METHOD_VERSION } from "../lib/action-concreteness-score";
import {
  WEBSITE_V2_DEMO_EMISSIONS,
  WEBSITE_V2_DEMO_RECORDS,
} from "../lib/website-v2-demo-fixture";

type V2Surface = "muni-detail" | "muni-overview";

const SURFACE_OPTIONS: { value: V2Surface; label: string }[] = [
  { value: "muni-overview", label: "Municipality overview" },
  { value: "muni-detail", label: "Municipality detail" },
];

export function WebsiteVisualsV2View({
  records,
  sectorEmissions,
  selectedName,
  onSelectName,
  demo = false,
}: {
  records: ExploreMunicipalityRecord[];
  sectorEmissions: SectorYearEmissions[];
  selectedName: string | null;
  onSelectName: (name: string) => void;
  /** Local demo fixture when APIs are empty / unreachable (`?demo=1`). */
  demo?: boolean;
}) {
  const [surface, setSurface] = useState<V2Surface>("muni-overview");
  const [overviewKpi, setOverviewKpi] = useState<OverviewKpi>("concreteness");
  const [localName, setLocalName] = useState<string | null>(null);

  // Force with ?demo=1; in local Vite also fall back when the explore load is empty.
  const useDemo =
    demo || (Boolean(import.meta.env.DEV) && records.length === 0);
  const effectiveRecords = useDemo ? WEBSITE_V2_DEMO_RECORDS : records;
  const effectiveEmissions = useDemo
    ? WEBSITE_V2_DEMO_EMISSIONS
    : sectorEmissions;

  const places = useMemo(
    () =>
      [...effectiveRecords]
        .map((r) => r.name)
        .sort((a, b) => a.localeCompare(b, "sv")),
    [effectiveRecords],
  );

  const bundles = useMemo(
    () =>
      effectiveRecords.map((r) =>
        buildWebsiteV2PlaceBundle(r, effectiveEmissions),
      ),
    [effectiveRecords, effectiveEmissions],
  );

  const effectiveMuniName =
    places.find((p) => namesMatch(p, selectedName ?? "")) ??
    places.find((p) => namesMatch(p, localName ?? "")) ??
    places[0] ??
    null;

  const selectedBundle =
    bundles.find((b) => namesMatch(b.record.name, effectiveMuniName ?? "")) ??
    null;

  const coverage = useMemo(() => {
    const withMeasures = bundles.filter((b) => b.uniqueMeasureCount > 0).length;
    const withScore = bundles.filter(
      (b) => b.concreteness.score != null,
    ).length;
    const withMatch = bundles.filter(
      (b) => b.gap.focusMatch !== "not-assessable",
    ).length;
    return { total: bundles.length, withMeasures, withScore, withMatch };
  }, [bundles]);

  return (
    <div className="space-y-5">
      <MethodologyPanel
        data="Website visuals v2 — municipality overview + detail only. Live explore extracts (plan actions, clear vs broad framework matches, Unearth sector emissions). Old Website visuals tab kept for reference."
        calculation={`Three public views (${ACTION_CONCRETENESS_METHOD_VERSION}): (1) plan action detail = weighted who/what/when/how × broad-wording 0.85 trim, municipal mean; (2) biggest-source fit = sector bars / yes-partly-not-really; (3) actions in the plan = unique extracted actions + expandable matched-theme list.`}
        extra="Skipped on purpose: climate-plans story, region detail, region overview. Matched-theme panel = clearly stated matches only (standard + new framework items; broad matches and experimental gaps excluded)."
      />

      <Callout variant="info" title="Website visuals v2 (plain-language draft)">
        <p className="text-sm text-gray-02 mt-1">
          Staging surface for three public views: how specific the plan is,
          whether it fits local emissions, and how many actions it names — with
          an expandable look inside the plan. Leave the original Website visuals
          tab open while we compare.
        </p>
      </Callout>

      {useDemo ? (
        <Callout variant="warning" title="Demo fixture active">
          <p className="text-sm text-orange-02/90 mt-1">
            Live explore load is empty or{" "}
            <code className="font-mono text-xs">demo=1</code> is set — showing
            three sample municipalities (Umeå, Skellefteå, Lycksele) so the
            layout can be reviewed. Remove{" "}
            <code className="font-mono text-xs">demo=1</code> once pipeline
            extracts load.
          </p>
        </Callout>
      ) : null}

      <div className="flex flex-wrap gap-3 items-center">
        <ViewModePills
          options={SURFACE_OPTIONS}
          value={surface}
          onValueChange={setSurface}
          ariaLabel="Website v2 surface"
          className="rounded-lg"
        />
        {surface === "muni-detail" ? (
          <select
            value={effectiveMuniName ?? ""}
            onChange={(e) => {
              setLocalName(e.target.value);
              onSelectName(e.target.value);
            }}
            className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
          >
            {places.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
        <span className="text-xs text-gray-02">
          {coverage.withScore}/{coverage.total} scored · {coverage.withMatch}{" "}
          comparable on biggest source · {coverage.withMeasures} with actions
        </span>
      </div>

      {surface === "muni-overview" ? (
        <MunicipalityOverviewV2
          bundles={bundles}
          selectedName={effectiveMuniName}
          onSelectName={(name) => {
            setLocalName(name);
            onSelectName(name);
          }}
          activeKpi={overviewKpi}
          onKpiChange={setOverviewKpi}
        />
      ) : null}

      {surface === "muni-detail" && selectedBundle ? (
        <MunicipalityDetailV2 bundle={selectedBundle} />
      ) : null}
    </div>
  );
}
