import { useMemo, useState } from "react";
import { Callout } from "@/ui/callout";
import { ViewModePills } from "@/ui/view-mode-pills";
import { MethodologyPanel } from "./MethodologyPanel";
import {
  MunicipalityDetailMock,
  OverviewMock,
  RegionDetailMock,
} from "./website-visuals-mocks";
import { ClimatePlansStoryView } from "./story/ClimatePlansStoryView";
import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "../lib/explore-types";
import { namesMatch } from "../lib/municipality-names";
import { WEBSITE_KPI_PLAN } from "../lib/website-kpis";
import {
  buildPlaceKpiBundle,
  buildRegionKpiBundles,
} from "../lib/website-visuals-rollup";

type WebsiteSurface =
  | "story"
  | "muni-detail"
  | "region-detail"
  | "muni-overview"
  | "region-overview";

const SURFACE_OPTIONS: { value: WebsiteSurface; label: string }[] = [
  { value: "story", label: "Climate plans story" },
  { value: "muni-detail", label: "Municipality detail" },
  { value: "region-detail", label: "Region detail" },
  { value: "muni-overview", label: "Municipality overview" },
  { value: "region-overview", label: "Region overview" },
];

export function WebsiteVisualsView({
  records,
  sectorEmissions,
  selectedName,
  onSelectName,
}: {
  records: ExploreMunicipalityRecord[];
  sectorEmissions: SectorYearEmissions[];
  selectedName: string | null;
  onSelectName: (name: string) => void;
}) {
  const [surface, setSurface] = useState<WebsiteSurface>("story");
  const [overviewChip, setOverviewChip] = useState("emissionFocusGap");
  const [localName, setLocalName] = useState<string | null>(null);

  const places = useMemo(
    () =>
      [...records].map((r) => r.name).sort((a, b) => a.localeCompare(b, "sv")),
    [records],
  );

  const muniBundles = useMemo(
    () => records.map((r) => buildPlaceKpiBundle(r, sectorEmissions)),
    [records, sectorEmissions],
  );
  const regionBundles = useMemo(
    () => buildRegionKpiBundles(records, sectorEmissions),
    [records, sectorEmissions],
  );

  const effectiveMuniName =
    places.find((p) => namesMatch(p, selectedName ?? "")) ??
    places.find((p) => namesMatch(p, localName ?? "")) ??
    places[0] ??
    null;
  const selectedMuniBundle =
    muniBundles.find((b) =>
      namesMatch(b.record.name, effectiveMuniName ?? ""),
    ) ?? null;

  const regionNames = regionBundles.map((b) => b.record.name);
  const effectiveRegionName =
    regionNames.find((p) => namesMatch(p, selectedName ?? "")) ??
    regionNames.find((p) => namesMatch(p, localName ?? "")) ??
    regionNames[0] ??
    null;
  const selectedRegionBundle =
    regionBundles.find((b) =>
      namesMatch(b.record.name, effectiveRegionName ?? ""),
    ) ?? null;

  const muniMapValues = useMemo(() => {
    const map = new Map<string, number | boolean | null>();
    for (const bundle of muniBundles) {
      map.set(bundle.record.name, bundle.gap.gapShare);
    }
    return map;
  }, [muniBundles]);

  const regionMapValues = useMemo(() => {
    const map = new Map<string, number | boolean | null>();
    for (const bundle of regionBundles) {
      map.set(bundle.record.name, bundle.gap.gapShare);
    }
    return map;
  }, [regionBundles]);

  const coverage = useMemo(() => {
    const withMeasures = records.filter((r) => r.measures.length > 0).length;
    const withGap = muniBundles.filter((b) => b.gap.gapShare != null).length;
    return {
      total: records.length,
      withMeasures,
      withGap,
      regions: regionBundles.length,
    };
  }, [records, muniBundles, regionBundles]);

  return (
    <div className="space-y-5">
      <MethodologyPanel
        data="Website-layout mocks + a Climate plans story tab for klimatkollen.se, using live explore extracts only (no climate-plan fixtures). Audience: climate-interested citizens who want emissions, actions and trends for conversations or outreach — not TEF jargon."
        calculation="Story + detail KPIs: emissions with no measures in the plan; biggest-source yes/partly/not-really; sector table (six sectors + Other & cross-cutting) with example actions from TEF hits; focus themes; since-plan territorial change; national rollups then municipality drill-down."
        extra="Story tab mirrors /nation scrollytelling energy with plan-specific metaphors (sector periodic table, biggest-source orbit, leak/gap fill). Detail mocks keep Paris/emissions in the header and put plan insights in a separate Climate plan section."
      />

      <Callout variant="info" title="Website mock surfaces">
        <p className="text-sm text-gray-02 mt-1">
          Styled like klimatkollen.se so we can review public placement before
          wiring <code className="font-mono text-xs">frontend</code>. Climate
          plan numbers always come from pipeline extracts in this Explore load —
          empty load means empty story, not sample data.
        </p>
      </Callout>

      <div className="flex flex-wrap gap-3 items-center">
        <ViewModePills
          options={SURFACE_OPTIONS}
          value={surface}
          onValueChange={setSurface}
          ariaLabel="Website surface"
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
        {surface === "region-detail" ? (
          <select
            value={effectiveRegionName ?? ""}
            onChange={(e) => {
              setLocalName(e.target.value);
              onSelectName(e.target.value);
            }}
            className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
          >
            {regionNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
        <span className="text-xs text-gray-02">
          {coverage.withGap}/{coverage.total} municipalities with gap ·{" "}
          {coverage.regions} regions in load
        </span>
      </div>

      {surface === "story" ? (
        <ClimatePlansStoryView
          records={records}
          sectorEmissions={sectorEmissions}
          selectedName={effectiveMuniName}
          onSelectName={(name) => {
            setLocalName(name);
            onSelectName(name);
          }}
        />
      ) : null}
      {surface === "muni-detail" && selectedMuniBundle ? (
        <MunicipalityDetailMock bundle={selectedMuniBundle} />
      ) : null}
      {surface === "region-detail" && selectedRegionBundle ? (
        <RegionDetailMock
          bundle={selectedRegionBundle}
          sectorEmissions={sectorEmissions}
        />
      ) : null}
      {surface === "muni-overview" ? (
        <OverviewMock
          entityType="municipalities"
          bundles={muniBundles}
          mapValues={muniMapValues}
          selectedName={effectiveMuniName}
          onSelectName={(name) => {
            setLocalName(name);
            onSelectName(name);
          }}
          activeChip={overviewChip}
          onChipChange={setOverviewChip}
        />
      ) : null}
      {surface === "region-overview" ? (
        <OverviewMock
          entityType="regions"
          bundles={regionBundles}
          mapValues={regionMapValues}
          selectedName={effectiveRegionName}
          onSelectName={(name) => {
            setLocalName(name);
            onSelectName(name);
          }}
          activeChip={overviewChip}
          onChipChange={setOverviewChip}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-4 space-y-2">
          <h3 className="text-base font-semibold text-gray-01">
            Placement proposal
          </h3>
          <ul className="text-sm text-gray-02 list-disc pl-5 space-y-1.5">
            <li>
              <span className="text-gray-01">Climate plans story:</span>{" "}
              national→municipality scrollytelling (sector table + Other,
              biggest-source orbit, uncovered leak, themes, since-plan,
              takeaways). Live extracts only.
            </li>
            <li>
              <span className="text-gray-01">Overview (map):</span> chip “No
              measures in the plan” next to Emissions / Paris / Climate plans.
              Table column “Biggest source covered?” stays text, not map colour.
            </li>
            <li>
              <span className="text-gray-01">Municipality detail:</span> leave
              the header for Paris / emissions. Add a dedicated Climate plan
              section: biggest-source question, what the plan focuses on, gap %,
              since-plan trend, sector checklist, conversation starters.
            </li>
            <li>
              <span className="text-gray-01">Region detail:</span> same idea —
              Climate plans in the region section with roll-up gap + neighbour
              list (gap % and yes/partly/not-really).
            </li>
            <li>
              <span className="text-gray-01">Language:</span> drop “Focus match”
              / match|partial|miss. Prefer questions people can ask politicians.
            </li>
          </ul>
        </section>
        <section className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-4 space-y-2">
          <h3 className="text-base font-semibold text-gray-01">
            Still blocked for public
          </h3>
          <ul className="text-sm text-gray-02 list-disc pl-5 space-y-1">
            {WEBSITE_KPI_PLAN.blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
