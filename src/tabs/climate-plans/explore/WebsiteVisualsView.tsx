import { useMemo, useState } from "react";
import { Callout } from "@/ui/callout";
import { ViewModePills } from "@/ui/view-mode-pills";
import { MethodologyPanel } from "./MethodologyPanel";
import {
  MunicipalityDetailMock,
  OverviewMock,
  RegionDetailMock,
} from "./website-visuals-mocks";
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
  | "muni-detail"
  | "region-detail"
  | "muni-overview"
  | "region-overview";

const SURFACE_OPTIONS: { value: WebsiteSurface; label: string }[] = [
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
  const [surface, setSurface] = useState<WebsiteSurface>("muni-detail");
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
        data="Website-layout mocks for klimatkollen.se using live explore extracts. Mirrors TerritoryOverviewLayout (chips → map + answer → topp/botten → table) and DetailHeader / LinkCard / DetailSection patterns from the public frontend."
        calculation="Emissions without measures = share of six mapped SMHI sectors with no addressing measures. Main focus = rule-based TEF-family sentence. Since plan = territorial CAGR only with ≥3 post-adoption years (grey null otherwise). Region gap = emissions-weighted municipal average."
        extra="Proposed placements: overview map chip for emission gap (not main-focus sentence). Detail: gap + since-plan in header stats; main focus as LinkCard-style text under Climate plan. Region detail has no climate LinkCards today — add gap/coverage in header and a merged focus sentence."
      />

      <Callout variant="info" title="Website mock surfaces">
        <p className="text-sm text-gray-02 mt-1">
          These panels are styled like klimatkollen.se (dark cards, DM Sans,
          blue/pink KPI colours) so we can review public placement before wiring{" "}
          <code className="font-mono text-xs">frontend</code>. Data is still
          from Validate extracts — coverage is incomplete on purpose.
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
              <span className="text-gray-01">Overview (map):</span> add chip
              “Emissions without measures” next to Emissions / Paris Agreement /
              Climate plans. Keep main-focus sentence off the map.
            </li>
            <li>
              <span className="text-gray-01">Municipality detail:</span> gap +
              since-plan as DetailHeader stats; Climate plan LinkCard stays; add
              Main focus as adjacent text card.
            </li>
            <li>
              <span className="text-gray-01">Region detail:</span> gap +
              coverage in header; merged main-focus paragraph; municipality list
              can show gap %.
            </li>
            <li>
              <span className="text-gray-01">Since 2015</span> stays the stable
              emissions overview KPI; since-plan stays detail-only with grey
              nulls.
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
