import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SwedenChoropleth } from "./SwedenChoropleth";
import {
  SiteMockShell,
  MockChipRow,
  MockAnswerCard,
  MockDetailHeader,
} from "./website-visuals-mocks";
import {
  ACTION_CONCRETENESS_METHODOLOGY,
  WEBSITE_V2_KPI_READING_GUIDE,
  concretenessBandLabel,
  evidenceVolumeLabel,
  formatConcretenessScore,
  formatSharePercent,
  type ActionConcretenessResult,
} from "../lib/action-concreteness-score";
import {
  browseMeasures,
  focusMatchChipLabel,
  focusMatchMapValue,
  groupExactTefsBySector,
  groupMeasuresByActivityFlow,
  groupMeasuresBySector,
  type WebsiteV2PlaceBundle,
} from "../lib/website-v2-kpis";
import {
  focusMatchValueClass,
  formatGapPercent,
  gapValueClass,
  plainFocusMatch,
} from "../lib/website-visuals-rollup";

type OverviewKpi = "concreteness" | "emissionsMatch" | "uniqueMeasures";
type ExpandMode = "measures" | "exact-tefs";
type BrowseLayout = "sectors" | "flows" | "list";

const BROWSE_LAYOUT_CYCLE: BrowseLayout[] = ["sectors", "flows", "list"];
const BROWSE_LAYOUT_LABEL: Record<BrowseLayout, string> = {
  sectors: "by sector",
  flows: "by activity flow",
  list: "flat list",
};

function Meter({
  score,
  provisional,
}: {
  score: number | null;
  provisional?: boolean;
}) {
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score));
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div
          className={cn(
            "text-5xl md:text-6xl font-medium tabular-nums leading-none",
            score == null
              ? "text-gray-02"
              : score >= 70
                ? "text-blue-03"
                : score >= 35
                  ? "text-orange-02"
                  : "text-pink-03",
          )}
        >
          {formatConcretenessScore(score)}
          {score != null ? (
            <span className="text-xl text-gray-02 font-normal">/100</span>
          ) : null}
        </div>
        {provisional ? (
          <span className="text-[10px] uppercase tracking-wide text-orange-02 border border-orange-03/40 rounded-full px-2 py-0.5">
            Early estimate
          </span>
        ) : null}
      </div>
      <div className="h-2.5 rounded-full bg-gray-03/80 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            score == null
              ? "bg-gray-03"
              : score >= 70
                ? "bg-blue-03/80"
                : score >= 35
                  ? "bg-orange-02/80"
                  : "bg-pink-03/70",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-gray-02">
        <span>Few details</span>
        <span>Most details</span>
      </div>
    </div>
  );
}

function SlotBars({ result }: { result: ActionConcretenessResult }) {
  const rows = [
    {
      key: "what",
      label: "What",
      weight: "35%",
      points: result.slotPoints.what,
    },
    { key: "how", label: "How", weight: "25%", points: result.slotPoints.how },
    { key: "who", label: "Who", weight: "20%", points: result.slotPoints.who },
    {
      key: "when",
      label: "When",
      weight: "20%",
      points: result.slotPoints.when,
    },
  ] as const;
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const pts = row.points ?? 0;
        const max = row.key === "what" ? 35 : row.key === "how" ? 25 : 20;
        return (
          <div key={row.key} className="flex items-center gap-3 text-sm">
            <div className="w-14 text-gray-01">{row.label}</div>
            <div className="flex-1 h-2 rounded-full bg-gray-03/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-03/70"
                style={{ width: `${max === 0 ? 0 : (pts / max) * 100}%` }}
              />
            </div>
            <div className="w-20 text-right tabular-nums text-gray-02 text-xs">
              {row.points == null ? "—" : `${pts.toFixed(1)} pts`}
            </div>
            <div className="w-10 text-right text-[10px] text-gray-02">
              {row.weight}
            </div>
          </div>
        );
      })}
      {result.broadnessPointsLost != null &&
      result.broadnessPointsLost > 0.05 ? (
        <p className="text-xs text-orange-02 pt-1">
          Experimental combined score is −
          {result.broadnessPointsLost.toFixed(1)} pts vs primary (implied-only
          trim)
        </p>
      ) : null}
    </div>
  );
}

export function MethodologyDeepDive({
  result,
}: {
  result?: ActionConcretenessResult | null;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-[24px] border border-gray-03/40 bg-gray-05/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <div className="text-[11px] uppercase tracking-wide text-blue-03">
            Method notes
          </div>
          <h3 className="text-base font-semibold text-gray-01 mt-0.5">
            {ACTION_CONCRETENESS_METHODOLOGY.title}
          </h3>
          <p className="text-[11px] text-gray-02 mt-0.5">
            Version {ACTION_CONCRETENESS_METHODOLOGY.version}
          </p>
        </div>
        <span className="text-xs text-gray-02 shrink-0">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-03/30 pt-4">
          <p className="text-sm text-gray-02 leading-relaxed">
            {ACTION_CONCRETENESS_METHODOLOGY.shortEn}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-gray-01 font-medium mb-2">
                What it measures
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-02">
                {ACTION_CONCRETENESS_METHODOLOGY.whatItMeasures.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm text-gray-01 font-medium mb-2">
                What it does not measure
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-02">
                {ACTION_CONCRETENESS_METHODOLOGY.whatItDoesNotMeasure.map(
                  (c) => (
                    <li key={c}>{c}</li>
                  ),
                )}
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-orange-03/25 bg-orange-03/5 px-4 py-3 space-y-3">
            <div>
              <div className="text-sm text-gray-01 font-medium">
                Reading with the other Website visuals KPIs
              </div>
              <p className="text-sm text-gray-02 mt-1 leading-relaxed">
                {ACTION_CONCRETENESS_METHODOLOGY.readingWithOtherKpis}
              </p>
            </div>
            <div>
              <div className="text-sm text-gray-01 font-medium">
                {WEBSITE_V2_KPI_READING_GUIDE.biggestSourceMethod.title}
              </div>
              <p className="text-sm text-gray-02 mt-1 leading-relaxed">
                {WEBSITE_V2_KPI_READING_GUIDE.biggestSourceMethod.body}
              </p>
            </div>
          </div>
          {result && result.measureCount > 0 ? (
            <div className="rounded-xl border border-blue-03/25 bg-blue-03/5 px-4 py-3 space-y-3">
              <div className="text-xs uppercase tracking-wide text-gray-02">
                This municipality — primary score breakdown
              </div>
              <SlotBars result={result} />
            </div>
          ) : null}
          <ol className="space-y-3">
            {ACTION_CONCRETENESS_METHODOLOGY.steps.map((step) => (
              <li key={step.title} className="text-sm">
                <div className="text-gray-01 font-medium">{step.title}</div>
                <p className="text-gray-02 mt-1 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
          <div>
            <div className="text-sm text-gray-01 font-medium mb-2">Caveats</div>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-02">
              {ACTION_CONCRETENESS_METHODOLOGY.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm text-gray-01 font-medium mb-2">
              Alternatives we rejected
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-02">
              {ACTION_CONCRETENESS_METHODOLOGY.rejectedAlternatives.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ExpandableCatalogue({ bundle }: { bundle: WebsiteV2PlaceBundle }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ExpandMode>("measures");
  const [layout, setLayout] = useState<BrowseLayout>("sectors");

  const measureRows = useMemo(
    () => browseMeasures(bundle.record),
    [bundle.record],
  );
  const measureGroups = useMemo(
    () => groupMeasuresBySector(measureRows),
    [measureRows],
  );
  const flowGroups = useMemo(
    () => groupMeasuresByActivityFlow(measureRows),
    [measureRows],
  );
  const tefGroups = useMemo(
    () => groupExactTefsBySector(bundle.exactTefHits),
    [bundle.exactTefHits],
  );

  const cycleLayout = () => {
    const i = BROWSE_LAYOUT_CYCLE.indexOf(layout);
    setLayout(BROWSE_LAYOUT_CYCLE[(i + 1) % BROWSE_LAYOUT_CYCLE.length]!);
  };

  return (
    <section className="rounded-[24px] border border-gray-03/40 bg-gray-05/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-05/50"
      >
        <div>
          <div className="text-[11px] uppercase tracking-wide text-orange-02">
            Details
          </div>
          <h3 className="text-lg text-gray-01 font-medium mt-0.5">
            See what&apos;s in the plan
          </h3>
          <p className="text-sm text-gray-02 mt-1">
            {bundle.uniqueMeasureCount} actions in the plan ·{" "}
            {bundle.exactTefCount} clearly named themes we could match
          </p>
        </div>
        <span className="text-sm text-blue-03 shrink-0">
          {open ? "Hide details" : "Show details"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-gray-03/30 px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["measures", "Actions found"],
                ["exact-tefs", "Themes named directly"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border",
                  mode === id
                    ? "bg-blue-03/20 text-blue-03 border-blue-03/40"
                    : "bg-gray-03/40 text-gray-02 border-transparent",
                )}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={cycleLayout}
              className="ml-auto px-3 py-1.5 rounded-full text-xs border border-gray-03/50 text-gray-02"
            >
              Layout: {BROWSE_LAYOUT_LABEL[layout]}
            </button>
          </div>

          {mode === "measures" ? (
            layout === "list" ? (
              <ul className="space-y-2">
                {measureRows.map((row) => (
                  <li key={row.measure.measure_text}>
                    <MeasureTile row={row} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-5">
                {(layout === "flows" ? flowGroups : measureGroups).map(
                  (group) => (
                    <SectorBlock
                      key={"sectorId" in group ? group.sectorId : group.flowId}
                      title={group.label}
                      count={group.rows.length}
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.rows.map((row) => (
                          <MeasureTile
                            key={row.measure.measure_text}
                            row={row}
                          />
                        ))}
                      </div>
                    </SectorBlock>
                  ),
                )}
              </div>
            )
          ) : null}

          {mode === "exact-tefs" ? (
            layout === "list" ? (
              <div className="flex flex-wrap gap-2">
                {bundle.exactTefHits.length === 0 ? (
                  <p className="text-sm text-gray-02">
                    No clearly named themes matched in this plan extract yet.
                  </p>
                ) : (
                  bundle.exactTefHits.map((hit) => (
                    <TefChip
                      key={`${hit.stableId}-${hit.measureText}`}
                      label={hit.shortLabel}
                      source={hit.source}
                      measureText={hit.measureText}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {tefGroups.length === 0 ? (
                  <p className="text-sm text-gray-02">
                    No clearly named themes matched in this plan extract yet.
                  </p>
                ) : (
                  tefGroups.map((group) => (
                    <SectorBlock
                      key={group.sectorId}
                      title={group.label}
                      count={group.hits.length}
                    >
                      <div className="flex flex-wrap gap-2">
                        {group.hits.map((hit) => (
                          <TefChip
                            key={`${hit.stableId}-${hit.measureText}`}
                            label={hit.shortLabel}
                            source={hit.source}
                            measureText={hit.measureText}
                          />
                        ))}
                      </div>
                    </SectorBlock>
                  ))
                )}
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SectorBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h4 className="text-sm font-medium text-gray-01">{title}</h4>
        <span className="text-xs text-gray-02 tabular-nums">{count}</span>
      </div>
      {/* Periodictable-ish strip accent */}
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-03 via-orange-02 to-pink-03/80" />
      {children}
    </div>
  );
}

function MeasureTile({
  row,
}: {
  row: ReturnType<typeof browseMeasures>[number];
}) {
  const m = row.measure;
  const slots = [
    ["Who", m.intervention_who],
    ["What", m.intervention_what],
    ["When", m.intervention_when],
    ["How", m.intervention_how],
  ] as const;
  return (
    <article className="rounded-2xl border border-gray-03/40 bg-gray-04/60 px-3.5 py-3 space-y-2">
      <p className="text-sm text-gray-01 leading-snug">{m.measure_text}</p>
      <div className="flex flex-wrap gap-1.5">
        {slots.map(([label, value]) => {
          const filled =
            Boolean(value?.trim()) && value.trim().toLowerCase() !== "none";
          return (
            <span
              key={label}
              className={cn(
                "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md border",
                filled
                  ? "border-blue-03/40 text-blue-03 bg-blue-03/10"
                  : "border-gray-03/40 text-gray-02",
              )}
              title={filled ? value : "Missing"}
            >
              {label}
              {filled ? " ·" : ""}
            </span>
          );
        })}
      </div>
      {row.activityFlows.length > 0 ? (
        <p className="text-[11px] text-gray-02">
          Activity flow: {row.activityFlows.slice(0, 2).join(" · ")}
          {row.activityFlows.length > 2
            ? ` +${row.activityFlows.length - 2}`
            : ""}
        </p>
      ) : null}
      {row.exactTefLabels.length > 0 ? (
        <p className="text-[11px] text-gray-02 truncate">
          Matched theme: {row.exactTefLabels.slice(0, 2).join(" · ")}
          {row.exactTefLabels.length > 2
            ? ` +${row.exactTefLabels.length - 2}`
            : ""}
        </p>
      ) : row.impliedTefCount > 0 ? (
        <p className="text-[11px] text-orange-02">
          Only indirect theme matches
        </p>
      ) : null}
    </article>
  );
}

function TefChip({
  label,
  source,
  measureText,
}: {
  label: string;
  source: string;
  measureText: string;
}) {
  return (
    <div
      className="max-w-full rounded-xl border border-gray-03/50 bg-gray-05/70 px-3 py-2 text-left"
      title={measureText}
    >
      <div className="text-sm text-gray-01 leading-snug">{label}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-02 mt-1">
        {source === "proposed"
          ? "New framework item"
          : source === "official"
            ? "Standard framework"
            : source}{" "}
        · clearly stated
      </div>
    </div>
  );
}

function KpiReadingGuide() {
  return (
    <section className="rounded-[24px] border border-gray-03/40 bg-gray-05/30 px-5 py-4 space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-gray-02">
          Reading guide
        </div>
        <h3 className="text-base text-gray-01 font-medium mt-0.5">
          {WEBSITE_V2_KPI_READING_GUIDE.title}
        </h3>
        <p className="text-sm text-gray-02 mt-1 leading-relaxed">
          {WEBSITE_V2_KPI_READING_GUIDE.shortEn}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {WEBSITE_V2_KPI_READING_GUIDE.points.map((point) => (
          <div
            key={point.label}
            className="rounded-2xl border border-gray-03/40 bg-gray-04/40 px-3.5 py-3"
          >
            <div className="text-sm text-gray-01 font-medium">
              {point.label}
            </div>
            <p className="text-xs text-gray-02 mt-1 leading-snug">
              {point.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreSeparationCompare({
  result,
}: {
  result: ActionConcretenessResult;
}) {
  const rows = [
    {
      key: "spec",
      label: "Specification (primary)",
      value: formatConcretenessScore(result.score),
      hint: "Who / what / when / how only",
      primary: true,
    },
    {
      key: "direct",
      label: "Framework directness",
      value: formatSharePercent(result.directWordingShare),
      hint: "Share of labelled actions that name the matched theme in their own text",
      primary: false,
    },
    {
      key: "combined",
      label: "Combined (internal comparison)",
      value: formatConcretenessScore(result.combinedScore),
      hint: "Slots × 0.85 when every judged match is implied-only — not a public KPI",
      primary: false,
    },
  ] as const;

  return (
    <section className="rounded-[24px] border border-gray-03/40 bg-gray-05/40 px-5 py-5 space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-gray-02">
          Score separation · internal impact check
        </div>
        <h3 className="text-lg text-gray-01 mt-1">
          Primary specification vs theme directness vs old combined trim
        </h3>
        <p className="text-sm text-gray-02 mt-1 max-w-3xl">
          Implied TEF matches often mean the plan text is broader than a
          catalogue entry — or that the text names a category with many sibling
          themes. That is related to, but not the same as, missing who / what /
          when / how. We show all three so the trim&apos;s ranking impact is
          visible.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className={cn(
              "rounded-2xl border px-4 py-3",
              row.primary
                ? "border-blue-03/40 bg-blue-03/10"
                : "border-gray-03/40 bg-gray-04/50",
            )}
          >
            <div className="text-[11px] uppercase tracking-wide text-gray-02">
              {row.label}
            </div>
            <div
              className={cn(
                "text-3xl font-medium tabular-nums mt-1",
                row.primary ? "text-blue-03" : "text-gray-01",
              )}
            >
              {row.value}
              {row.key !== "direct" && result.score != null ? (
                <span className="text-sm text-gray-02 font-normal">/100</span>
              ) : null}
            </div>
            <p className="text-xs text-gray-02 mt-2 leading-snug">{row.hint}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-full bg-gray-03/50 text-gray-01">
          All slots filled: {formatSharePercent(result.fullSpecShare)}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-gray-03/50 text-gray-01">
          {result.explicitCount}/{result.judgedMeasureCount || "—"} direct theme
          matches
        </span>
        <span className="px-2.5 py-1 rounded-full bg-gray-03/50 text-gray-01">
          {result.impliedOnlyCount}/{result.judgedMeasureCount || "—"}{" "}
          implied-only
        </span>
        {result.provisional ? (
          <span className="px-2.5 py-1 rounded-full border border-orange-03/40 text-orange-02">
            Directness / combined: early estimate
          </span>
        ) : null}
      </div>
    </section>
  );
}

export function MunicipalityDetailV2({
  bundle,
}: {
  bundle: WebsiteV2PlaceBundle;
}) {
  const focus = plainFocusMatch(bundle.gap);
  const c = bundle.concreteness;

  return (
    <SiteMockShell
      eyebrow="Website visuals v2 · municipality detail"
      title="What does the plan say, and where is it aimed?"
    >
      <MockDetailHeader
        name={bundle.record.name}
        subtitle={bundle.record.county ?? bundle.record.regionName ?? undefined}
        stats={[
          {
            label: "Plan action detail",
            value: formatConcretenessScore(c.score),
            className:
              c.score == null
                ? "text-gray-02"
                : c.score >= 70
                  ? "text-blue-03"
                  : c.score >= 35
                    ? "text-orange-02"
                    : "text-pink-03",
            caption: concretenessBandLabel(c.band),
          },
          {
            label: "Biggest source",
            value: focus.shortLabel,
            className: focusMatchValueClass(focus.verdict),
            caption: focus.question,
          },
          {
            label: "Actions found",
            value: String(bundle.uniqueMeasureCount),
            className: "text-orange-02",
            caption: "Volume only — not a quality ranking",
          },
        ]}
      />

      <KpiReadingGuide />
      <ScoreSeparationCompare result={c} />

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[24px] border border-blue-03/30 bg-blue-03/5 px-5 py-5 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-blue-03">
              Action detail
            </div>
            <h3 className="text-xl text-gray-01 mt-1">
              How fully are the plan&apos;s actions written up?
            </h3>
            <p className="text-sm text-gray-02 mt-1">{c.headlineEn}</p>
          </div>
          <Meter score={c.score} />
          <p className="text-xs text-gray-02 leading-relaxed">
            A plan with a few precise actions can score higher than one with
            many broad ones. This score does not measure ambition or expected
            emissions cuts.
          </p>
          <p className="text-xs text-gray-02 leading-relaxed">{c.summaryEn}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-gray-03/50 text-gray-01">
              {evidenceVolumeLabel(c.evidenceVolume)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gray-03/50 text-gray-01">
              All slots filled: {formatSharePercent(c.fullSpecShare)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gray-03/50 text-gray-01">
              {concretenessBandLabel(c.band)}
            </span>
          </div>
        </div>

        <div className="rounded-[24px] border border-gray-03/40 bg-gray-05/40 px-5 py-5 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-02">
              Biggest-source fit
            </div>
            <h3 className="text-xl text-gray-01 mt-1">{focus.question}</h3>
            <p
              className={cn(
                "text-2xl font-medium mt-2",
                focusMatchValueClass(focus.verdict),
              )}
            >
              {focus.answer}
            </p>
          </div>
          <div className="text-sm text-gray-02">
            Share of mapped six-sector emissions with no actions found in the
            plan text:{" "}
            <span
              className={cn(
                "tabular-nums font-medium",
                gapValueClass(bundle.gap.gapShare),
              )}
            >
              {formatGapPercent(bundle.gap.gapShare)}
            </span>
          </div>
          <div className="space-y-2">
            {bundle.gap.rows.map((row) => (
              <div
                key={row.sectorId}
                className="flex items-center gap-3 text-sm"
              >
                <div className="w-32 text-gray-01 truncate" title={row.label}>
                  {row.label}
                </div>
                <div className="flex-1 h-2 rounded-full bg-gray-03/80 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      row.addressed ? "bg-blue-03/80" : "bg-pink-03/70",
                    )}
                    style={{
                      width: `${Math.round(row.emissionShare * 100)}%`,
                    }}
                  />
                </div>
                <div className="w-10 text-right tabular-nums text-gray-02">
                  {Math.round(row.emissionShare * 100)}%
                </div>
                <div
                  className={cn(
                    "w-28 text-right text-xs",
                    row.addressed ? "text-blue-03" : "text-pink-03",
                  )}
                  title={
                    row.addressed
                      ? `${row.measureCount} action${row.measureCount === 1 ? "" : "s"} mapped to this sector`
                      : undefined
                  }
                >
                  {row.addressed
                    ? `Actions found (${row.measureCount})`
                    : "None found"}
                </div>
              </div>
            ))}
          </div>
          <details className="rounded-xl border border-gray-03/40 bg-gray-04/40 px-3.5 py-3">
            <summary className="text-sm text-gray-01 cursor-pointer select-none">
              How this yes / partly / not really is decided
            </summary>
            <div className="mt-2 space-y-2 text-xs text-gray-02 leading-relaxed">
              <p>
                This is <span className="text-gray-01">not</span> the same as
                “themes named directly.” A sector counts as having actions when
                at least one extracted measure is tagged to it via the
                classifier’s sector/gate domain{" "}
                <span className="text-gray-01">or</span> any catalogue theme
                match — including <span className="text-gray-01">indirect</span>{" "}
                (implied) matches. So one implied theme match can still mark a
                sector as “Actions found.”
              </p>
              <p>{WEBSITE_V2_KPI_READING_GUIDE.biggestSourceMethod.body}</p>
              <p>
                The gap % is the share of{" "}
                <span className="text-gray-01">mapped six-sector</span>{" "}
                territorial emissions in sectors with zero mapped actions. A 0%
                gap only means every emitting mapped sector has ≥1 tagged action
                — not that the plan is adequate or that themes were named
                explicitly.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section className="rounded-[24px] border border-orange-03/30 bg-orange-03/5 px-5 py-5 space-y-3">
        <div className="text-[11px] uppercase tracking-wide text-orange-02">
          Actions found in the plan text
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="text-5xl font-medium tabular-nums text-orange-02 leading-none">
            {bundle.uniqueMeasureCount}
          </div>
          <p className="text-sm text-gray-02 max-w-xl">
            Distinct climate-related actions after similar ones are merged — not
            every repeated line in the document
            {bundle.record.climateCommitmentGroupCount != null
              ? ` (climate commitment groups in plan: ${bundle.record.climateCommitmentGroupCount})`
              : ""}
            . This is volume, not effectiveness: a few specific actions aimed at
            the biggest emission source can matter more than a long list of
            vague ones. Read it with plan action detail and biggest-source fit.
            Clearly named themes matched below: {bundle.exactTefCount}.
          </p>
        </div>
      </section>

      <ExpandableCatalogue bundle={bundle} />
      <MethodologyDeepDive result={c} />
    </SiteMockShell>
  );
}

export function MunicipalityOverviewV2({
  bundles,
  selectedName,
  onSelectName,
  activeKpi,
  onKpiChange,
}: {
  bundles: WebsiteV2PlaceBundle[];
  selectedName: string | null;
  onSelectName: (name: string) => void;
  activeKpi: OverviewKpi;
  onKpiChange: (id: OverviewKpi) => void;
}) {
  const chips = [
    {
      id: "concreteness" as const,
      label: "Plan action detail",
      proposed: true,
    },
    {
      id: "emissionsMatch" as const,
      label: "Biggest-source fit",
      proposed: true,
    },
    {
      id: "uniqueMeasures" as const,
      label: "Actions found",
      proposed: true,
    },
  ];

  const mapValues = useMemo(() => {
    const map = new Map<string, number | boolean | null>();
    for (const b of bundles) {
      if (activeKpi === "concreteness") {
        // Primary is slots-only — TEF label coverage no longer blanks the map.
        map.set(b.record.name, b.concreteness.score);
      } else if (activeKpi === "emissionsMatch") {
        map.set(b.record.name, focusMatchMapValue(b.gap.focusMatch));
      } else {
        map.set(
          b.record.name,
          b.uniqueMeasureCount > 0 ? b.uniqueMeasureCount : null,
        );
      }
    }
    return map;
  }, [bundles, activeKpi]);

  const assessed = bundles.filter((b) => {
    if (activeKpi === "concreteness") return b.concreteness.score != null;
    if (activeKpi === "emissionsMatch")
      return b.gap.focusMatch !== "not-assessable";
    return b.uniqueMeasureCount > 0;
  });

  const averageLabel =
    activeKpi === "concreteness"
      ? "Average action-detail score (0–100)"
      : activeKpi === "emissionsMatch"
        ? "% where most mapped actions aim at the biggest source"
        : "Average action count (volume only — not quality)";

  const averageValue = (() => {
    if (assessed.length === 0) return "—";
    if (activeKpi === "concreteness") {
      const mean =
        assessed.reduce((s, b) => s + (b.concreteness.score ?? 0), 0) /
        assessed.length;
      return String(Math.round(mean));
    }
    if (activeKpi === "emissionsMatch") {
      const matches = assessed.filter(
        (b) => b.gap.focusMatch === "match",
      ).length;
      return `${Math.round((matches / assessed.length) * 100)}%`;
    }
    const mean =
      assessed.reduce((s, b) => s + b.uniqueMeasureCount, 0) / assessed.length;
    return mean.toFixed(1);
  })();

  const ranked = [...assessed].sort((a, b) => {
    if (activeKpi === "concreteness") {
      return (b.concreteness.score ?? 0) - (a.concreteness.score ?? 0);
    }
    if (activeKpi === "emissionsMatch") {
      const order = { match: 2, partial: 1, miss: 0, "not-assessable": -1 };
      return order[b.gap.focusMatch] - order[a.gap.focusMatch];
    }
    return b.uniqueMeasureCount - a.uniqueMeasureCount;
  });

  // Don't spotlight tiny extracts in Top/Bottom for the detail score.
  const rankedForLeaders =
    activeKpi === "concreteness"
      ? ranked.filter((b) => b.concreteness.measureCount >= 5)
      : ranked;

  const formatRow = (b: WebsiteV2PlaceBundle) => {
    if (activeKpi === "concreteness") {
      const score = formatConcretenessScore(b.concreteness.score);
      return `${score} (n=${b.concreteness.measureCount})`;
    }
    if (activeKpi === "emissionsMatch")
      return focusMatchChipLabel(b.gap.focusMatch);
    return String(b.uniqueMeasureCount);
  };

  const volumeLists = activeKpi === "uniqueMeasures";

  return (
    <SiteMockShell
      eyebrow="Website visuals v2 · municipality overview"
      title="Compare plan wording detail, biggest-source aim, and action volume"
    >
      <MockChipRow
        chips={chips}
        active={activeKpi}
        onChange={(id) => onKpiChange(id as OverviewKpi)}
      />

      <KpiReadingGuide />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] items-start">
        <SwedenChoropleth
          geo="municipality"
          values={mapValues}
          selectedName={selectedName}
          onSelect={onSelectName}
          booleanScale={false}
          focusMatchScale={activeKpi === "emissionsMatch"}
        />
        <MockAnswerCard
          averageLabel={averageLabel}
          averageValue={averageValue}
          averageClassName={
            activeKpi === "emissionsMatch" ? "text-blue-03" : "text-orange-02"
          }
          direction={
            activeKpi === "concreteness"
              ? "Higher = more who/what/when/how detail · gaps under ~10 pts are not meaningful"
              : activeKpi === "emissionsMatch"
                ? "Yes / partly / not really — counts actions found, not cuts"
                : "Count only — higher volume is not a better plan by itself"
          }
          topLabel={volumeLists ? "Most actions found" : "Higher scores"}
          bottomLabel={volumeLists ? "Fewest actions found" : "Lower scores"}
          listTone={volumeLists ? "neutral" : "rank"}
          top={rankedForLeaders.slice(0, 3).map((b) => ({
            name: b.record.name,
            value: formatRow(b),
          }))}
          bottom={rankedForLeaders
            .slice(-3)
            .reverse()
            .map((b) => ({
              name: b.record.name,
              value: formatRow(b),
            }))}
          note={`${assessed.length} of ${bundles.length} municipalities comparable in this load. Grey = no plan extract yet.${
            activeKpi === "concreteness"
              ? " Leader lists require at least 5 scored actions."
              : ""
          } Table also shows theme directness and an internal combined comparison.`}
        />
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-gray-03/40">
        <table className="w-full text-sm">
          <thead className="bg-gray-05/80 text-left text-xs uppercase tracking-wide text-gray-02">
            <tr>
              <th className="px-4 py-3 font-medium">Municipality</th>
              <th className="px-4 py-3 font-medium">Action detail</th>
              <th className="px-4 py-3 font-medium">Theme direct</th>
              <th className="px-4 py-3 font-medium">Combined*</th>
              <th className="px-4 py-3 font-medium">Biggest source</th>
              <th className="px-4 py-3 font-medium">Actions found</th>
              <th className="px-4 py-3 font-medium">Themes named</th>
            </tr>
          </thead>
          <tbody>
            {[...bundles]
              .sort((a, b) => a.record.name.localeCompare(b.record.name, "sv"))
              .map((b) => {
                const selected = selectedName === b.record.name;
                return (
                  <tr
                    key={b.record.id}
                    className={cn(
                      "border-t border-gray-03/30 cursor-pointer",
                      selected ? "bg-blue-03/10" : "hover:bg-gray-05/40",
                    )}
                    onClick={() => onSelectName(b.record.name)}
                  >
                    <td className="px-4 py-2.5 text-gray-01">
                      {b.record.name}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-blue-03">
                      {formatConcretenessScore(b.concreteness.score)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-01">
                      {formatSharePercent(b.concreteness.directWordingShare)}
                      {b.concreteness.provisional ? (
                        <span className="ml-1 text-[10px] text-orange-02">
                          *
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-02">
                      {formatConcretenessScore(b.concreteness.combinedScore)}
                      {b.concreteness.provisional ? (
                        <span className="ml-1 text-[10px] text-orange-02">
                          *
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5",
                        focusMatchValueClass(b.gap.focusMatch),
                      )}
                    >
                      {focusMatchChipLabel(b.gap.focusMatch)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-01">
                      {b.uniqueMeasureCount}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-02">
                      {b.exactTefCount}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <p className="px-4 py-2 text-[11px] text-gray-02 border-t border-gray-03/30">
          * Combined = internal comparison only (slots × 0.85 when every judged
          theme match is implied-only). Asterisk = thin theme-label coverage for
          directness/combined. “Themes named” depends on catalogue coverage.
        </p>
      </div>

      <MethodologyDeepDive />
    </SiteMockShell>
  );
}

export type { OverviewKpi };
