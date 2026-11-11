import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Callout } from "@/ui/callout";
import { MethodologyPanel } from "./MethodologyPanel";
import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "../lib/explore-types";
import { namesMatch } from "../lib/municipality-names";
import {
  WEBSITE_KPI_PLAN,
  computeEmissionFocusGap,
  computeMainFocus,
  computeSincePlanTrend,
} from "../lib/website-kpis";

const FOCUS_MATCH_STYLE: Record<string, string> = {
  match: "bg-green-03/15 text-green-03 border-green-03/30",
  partial: "bg-orange-03/15 text-orange-03 border-orange-03/30",
  miss: "bg-pink-03/15 text-pink-03 border-pink-03/30",
  "not-assessable": "bg-gray-03/20 text-gray-02 border-gray-03/40",
};

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
  const places = useMemo(
    () =>
      [...records].map((r) => r.name).sort((a, b) => a.localeCompare(b, "sv")),
    [records],
  );
  const [localName, setLocalName] = useState<string | null>(null);
  const effectiveName =
    places.find((p) => namesMatch(p, selectedName ?? "")) ??
    places.find((p) => namesMatch(p, localName ?? "")) ??
    places[0] ??
    null;
  const selected =
    records.find((r) => namesMatch(r.name, effectiveName ?? "")) ?? null;

  const gap = useMemo(
    () =>
      selected ? computeEmissionFocusGap(selected, sectorEmissions) : null,
    [selected, sectorEmissions],
  );
  const focus = useMemo(
    () => (selected ? computeMainFocus(selected) : null),
    [selected],
  );
  const sincePlan = useMemo(
    () => (selected ? computeSincePlanTrend(selected, sectorEmissions) : null),
    [selected, sectorEmissions],
  );

  const coverage = useMemo(() => {
    const withMeasures = records.filter((r) => r.measures.length > 0).length;
    const withGap = records.filter(
      (r) => computeEmissionFocusGap(r, sectorEmissions).gapShare != null,
    ).length;
    return { total: records.length, withMeasures, withGap };
  }, [records, sectorEmissions]);

  return (
    <div className="space-y-5">
      <MethodologyPanel
        data="Prototype public KPIs for klimatkollen.se municipality/region overview + detail. Inputs: scored measures (gate domain + TEF matches), Unearth/SMHI sector emissions, adoption year from municipality sources. Prefer deduped climate commitment groups / measures over raw commitment counts."
        calculation="Emissions without measures = share of six mapped emission sectors with zero addressing measures. Main focus = rule-based template over TEF families, one vote per measure text (explicit hits preferred). Since-plan = territorial CAGR from adoption year when ≥3 SMHI years exist — descriptive only, never causal."
        extra="Multi-model product review (Claude / GPT / Grok) converged on: publish absence-framed alignment + templated focus sentences; keep TEF counts/scores internal; do not ship a composite ambition score; treat post-plan trends as context with a too-new null. Blockers before public: approved extracts, companion merge, gate-domain reruns, adoption-year audit, broader kommun coverage."
      />

      <Callout variant="info" title="Iterate here before the public site">
        <p className="text-sm text-gray-02 mt-1">
          This view is a staging surface for website copy and map encodings.
          Nothing here is published yet. Prefer reviewing KPI definitions and
          Swedish copy against live extracts before wiring{" "}
          <code className="font-mono text-xs">frontend</code>.
        </p>
      </Callout>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-01">
                Municipality card preview
              </h3>
              <p className="text-sm text-gray-02">
                Same shape as a public answer panel: chips + one sentence.
              </p>
            </div>
            <select
              value={effectiveName ?? ""}
              onChange={(e) => {
                setLocalName(e.target.value);
                onSelectName(e.target.value);
              }}
              className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
            >
              {places.length === 0 ? (
                <option value="">No extracts loaded</option>
              ) : (
                places.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
          </div>

          {selected && gap && focus && sincePlan ? (
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-gray-01">
                  {selected.name}
                </div>
                <div className="text-sm text-gray-02">
                  {selected.documentTitle ?? "Untitled plan"}
                  {selected.adoptedYear
                    ? ` · antagen ${selected.adoptedYear}`
                    : ""}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Utsläpp utan åtgärder"
                  value={
                    gap.gapShare == null
                      ? "—"
                      : `${Math.round(gap.gapShare * 100)}%`
                  }
                />
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                    FOCUS_MATCH_STYLE[gap.focusMatch],
                  )}
                >
                  Focus match: {gap.focusMatch}
                </span>
                <Chip
                  label="Sedan planen"
                  value={
                    sincePlan.annualChangePercent == null
                      ? sincePlan.status
                      : `${sincePlan.annualChangePercent.toFixed(1)}%/år`
                  }
                />
              </div>

              <p className="text-sm text-gray-01 leading-relaxed">
                {focus.sentenceSv ??
                  "För lite TEF-bevis för en tyngdpunktsmening ännu."}
              </p>
              <p className="text-sm text-gray-02 leading-relaxed">
                {gap.summarySv}
              </p>
              {sincePlan.status === "ok" ? (
                <p className="text-xs text-gray-02">
                  {sincePlan.fromYear}–{sincePlan.toYear}: observed territorial
                  change only. {sincePlan.noteEn}
                </p>
              ) : (
                <p className="text-xs text-gray-02">{sincePlan.noteEn}</p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-02 border-b border-gray-03/40">
                      <th className="py-2 pr-3 font-medium">Sector</th>
                      <th className="py-2 pr-3 font-medium">Emissions</th>
                      <th className="py-2 pr-3 font-medium">Measures</th>
                      <th className="py-2 font-medium">Addressed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gap.rows.map((row) => (
                      <tr
                        key={row.sectorId}
                        className="border-b border-gray-03/20"
                      >
                        <td className="py-2 pr-3 text-gray-01">{row.label}</td>
                        <td className="py-2 pr-3 tabular-nums text-gray-02">
                          {Math.round(row.emissionShare * 100)}%
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-gray-02">
                          {row.measureCount}
                        </td>
                        <td className="py-2 text-gray-01">
                          {row.addressed ? "yes" : "no"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-02">
              Load pipeline extracts to preview.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-4 space-y-2">
            <h3 className="text-base font-semibold text-gray-01">
              Coverage (this explore load)
            </h3>
            <p className="text-sm text-gray-02">
              {coverage.withMeasures} / {coverage.total} municipalities with
              scored measures · {coverage.withGap} with an assessable emissions
              gap.
            </p>
            <ul className="text-sm text-gray-02 list-disc pl-5 space-y-1">
              {WEBSITE_KPI_PLAN.blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-4 space-y-3">
            <h3 className="text-base font-semibold text-gray-01">
              Recommended MVP
            </h3>
            {WEBSITE_KPI_PLAN.mvpPublic.map((kpi) => (
              <div key={kpi.id} className="space-y-1">
                <div className="text-sm font-medium text-gray-01">
                  {kpi.nameSv}{" "}
                  <span className="text-gray-02 font-normal">({kpi.name})</span>
                </div>
                <p className="text-xs text-gray-02">
                  {kpi.rationale} · map:{" "}
                  {kpi.overviewMap ? "yes" : "detail only"} · {kpi.status}
                </p>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-03/30">
              <div className="text-sm font-medium text-gray-01 mb-1">
                Keep internal on Validate
              </div>
              <ul className="text-xs text-gray-02 list-disc pl-5 space-y-1">
                {WEBSITE_KPI_PLAN.keepInternal.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-4 space-y-2">
            <h3 className="text-base font-semibold text-gray-01">
              Data-use review notes
            </h3>
            <ul className="text-sm text-gray-02 list-disc pl-5 space-y-1.5">
              <li>
                TEF framework + website focus should count{" "}
                <strong className="font-medium text-gray-01">measures</strong>{" "}
                (and deduped climate commitment groups), not raw extracted
                commitments — duplicates inflate story.
              </li>
              <li>
                Map KPI “Extracted commitments” remains useful for extraction
                QA; prefer “Climate commitment groups” / “Scored measures” when
                talking about plan substance.
              </li>
              <li>
                Proposed STE catalogue shadows and runtime shadow gaps now
                appear in the TEF framework (filter by source). Public focus
                sentences ignore runtime shadows until promoted.
              </li>
              <li>
                Sector alignment uses gate domain when present, else TEF sector
                — older runs without gates understate coverage until rerun.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-03/40 bg-gray-05/40 px-3 py-1 text-xs text-gray-01">
      <span className="text-gray-02">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}
