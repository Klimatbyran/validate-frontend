import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "../../lib/explore-types";
import { namesMatch } from "../../lib/municipality-names";
import {
  buildClimatePlansStoryMetrics,
  storySectorColor,
  type StoryNationalMetrics,
  type StoryPlaceMetrics,
  type StorySectorCell,
  type StorySectorId,
} from "../../lib/website-story-metrics";
import { Callout } from "@/ui/callout";

const BEATS = [
  { id: "intro", label: "Intro" },
  { id: "sectors", label: "Sectors" },
  { id: "biggest", label: "Biggest source" },
  { id: "gap", label: "Uncovered" },
  { id: "themes", label: "Themes" },
  { id: "concrete", label: "How concrete" },
  { id: "since", label: "Since plan" },
  { id: "drill", label: "Municipality" },
  { id: "takeaways", label: "Takeaways" },
] as const;

export function ClimatePlansStoryView({
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
  const metrics = useMemo(
    () => buildClimatePlansStoryMetrics(records, sectorEmissions),
    [records, sectorEmissions],
  );
  const [scope, setScope] = useState<"national" | "municipality">("national");
  const [activeSector, setActiveSector] = useState<StorySectorId | null>(null);

  const placeNames = useMemo(
    () =>
      (metrics?.places ?? [])
        .map((p) => p.record.name)
        .sort((a, b) => a.localeCompare(b, "sv")),
    [metrics],
  );

  const selectedPlace =
    metrics?.places.find((p) =>
      namesMatch(p.record.name, selectedName ?? ""),
    ) ??
    metrics?.places[0] ??
    null;

  if (!metrics) {
    return (
      <Callout variant="info" title="Climate plans story needs live extracts">
        <p className="text-sm text-gray-02 mt-1">
          No municipality climate-plan extracts are loaded yet. This story is
          programmable from pipeline data only — it will appear as soon as
          Explore has records.
        </p>
      </Callout>
    );
  }

  const viewPlace = scope === "municipality" ? selectedPlace : null;
  const sectorCells = viewPlace?.sectors ?? metrics.sectorCells;

  return (
    <div className="rounded-[30px] border border-gray-03/50 bg-black text-white overflow-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur-md px-4 py-3 md:px-6 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-blue-03">
            Proposed · klimatkollen story
          </div>
          <div className="text-sm text-white/70">
            National framing → drill into one municipality · live extracts only
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setScope("national")}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-colors",
              scope === "national"
                ? "bg-blue-03/25 border-blue-03/50 text-blue-03"
                : "border-white/15 text-white/60 hover:text-white",
            )}
          >
            All of Sweden
          </button>
          <button
            type="button"
            onClick={() => setScope("municipality")}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-colors",
              scope === "municipality"
                ? "bg-blue-03/25 border-blue-03/50 text-blue-03"
                : "border-white/15 text-white/60 hover:text-white",
            )}
          >
            Choose municipality
          </button>
          {scope === "municipality" ? (
            <select
              value={selectedPlace?.record.name ?? ""}
              onChange={(e) => {
                onSelectName(e.target.value);
                setScope("municipality");
              }}
              className="text-sm bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white"
            >
              {placeNames.map((name) => (
                <option key={name} value={name} className="text-black">
                  {name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <nav className="px-4 md:px-6 py-3 flex gap-2 overflow-x-auto border-b border-white/5">
        {BEATS.map((beat) => (
          <a
            key={beat.id}
            href={`#story-${beat.id}`}
            className="shrink-0 px-3 py-1 rounded-full text-xs border border-white/15 text-white/65 hover:text-white hover:border-white/35"
          >
            {beat.label}
          </a>
        ))}
      </nav>

      <div className="px-4 md:px-8 py-10 space-y-24 md:space-y-32">
        <IntroBeat metrics={metrics} place={viewPlace} />
        <SectorTableBeat
          cells={sectorCells}
          activeSector={activeSector}
          onSelectSector={setActiveSector}
          national={!viewPlace}
          municipalityCount={metrics.municipalityCount}
        />
        <BiggestSourceBeat
          metrics={metrics}
          place={viewPlace}
          cells={sectorCells}
        />
        <GapBeat metrics={metrics} place={viewPlace} />
        <ThemesBeat metrics={metrics} place={viewPlace} />
        <ConcretenessBeat metrics={metrics} place={viewPlace} />
        <SincePlanBeat metrics={metrics} place={viewPlace} />
        <DrillBeat
          metrics={metrics}
          selectedPlace={selectedPlace}
          onPick={(name) => {
            onSelectName(name);
            setScope("municipality");
          }}
        />
        <TakeawaysBeat metrics={metrics} place={viewPlace ?? selectedPlace} />
      </div>
    </div>
  );
}

function StoryChapter({
  id,
  eyebrow,
  title,
  body,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <section id={`story-${id}`} className="scroll-mt-28 max-w-5xl mx-auto">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-10"
      >
        <div className="text-[11px] uppercase tracking-[0.18em] text-blue-03/90">
          {eyebrow}
        </div>
        <h2 className="mt-3 text-3xl md:text-5xl font-light tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-4 text-base md:text-lg text-white/65 leading-relaxed">
          {body}
        </p>
      </motion.div>
      {children}
    </section>
  );
}

function IntroBeat({
  metrics,
  place,
}: {
  metrics: StoryNationalMetrics;
  place: StoryPlaceMetrics | null;
}) {
  const cards = place
    ? [
        {
          label: "Measures analysed",
          value: String(place.record.measures.length),
        },
        {
          label: "Adopted",
          value: place.record.adoptedYear
            ? String(place.record.adoptedYear)
            : "—",
        },
        {
          label: "Uncovered emissions",
          value:
            place.gap.gapShare == null
              ? "—"
              : `${Math.round(place.gap.gapShare * 100)}%`,
        },
      ]
    : [
        {
          label: "Municipalities in load",
          value: String(metrics.municipalityCount),
        },
        {
          label: "With extractable measures",
          value: String(metrics.withMeasuresCount),
        },
        {
          label: "Comparable with emissions",
          value: String(metrics.withGapCount),
        },
      ];

  return (
    <StoryChapter
      id="intro"
      eyebrow={place ? place.record.name : "Municipal climate plans · Sweden"}
      title={
        place
          ? `What does ${place.record.name}’s climate plan cover?`
          : "What do Sweden’s local climate plans actually cover?"
      }
      body={
        place
          ? "We read the plan’s measures against local emissions — so you can see priorities, gaps, and questions worth asking."
          : "Almost every municipality has a climate plan, yet most sit unread as long PDFs. We map where local actions are planned — and where the gaps remain."
      }
    >
      <CoverageConstellation metrics={metrics} place={place} />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 * i }}
            className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-center"
          >
            <div className="text-3xl font-medium text-white tabular-nums">
              {card.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-white/50">
              {card.label}
            </div>
          </motion.div>
        ))}
      </div>
    </StoryChapter>
  );
}

function CoverageConstellation({
  metrics,
  place,
}: {
  metrics: StoryNationalMetrics;
  place: StoryPlaceMetrics | null;
}) {
  const nodes = place ? place.sectors : metrics.sectorCells;
  return (
    <div className="relative mx-auto h-64 md:h-80 max-w-3xl rounded-[32px] border border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18),transparent_65%)] overflow-hidden">
      <div className="absolute top-3 left-4 text-[10px] uppercase tracking-wide text-white/45">
        Showing: {place ? place.record.name : "Sweden · this explore load"} ·
        size ≈ emissions share (Other stays small)
      </div>
      <svg viewBox="0 0 800 360" className="w-full h-full">
        {nodes.map((node, i) => {
          const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
          const r = 110 + (node.emissionShare ?? 0.05) * 40;
          const x = 400 + Math.cos(angle) * r;
          const y = 190 + Math.sin(angle) * r * 0.85;
          const size =
            14 + (node.id === "other" ? 10 : (node.emissionShare ?? 0.08) * 48);
          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 120 }}
            >
              <circle
                cx={x}
                cy={y}
                r={size}
                fill={storySectorColor(node.id, node.addressed ? 0.75 : 0.18)}
                stroke={storySectorColor(node.id, 0.95)}
                strokeWidth={node.addressed ? 2 : 1}
                strokeDasharray={node.addressed ? undefined : "4 4"}
              />
              <text
                x={x}
                y={y + size + 16}
                textAnchor="middle"
                className="fill-white/70"
                fontSize="11"
              >
                {node.shortLabel}
              </text>
            </motion.g>
          );
        })}
        <text
          x="400"
          y="196"
          textAnchor="middle"
          className="fill-white/80"
          fontSize="14"
        >
          {place ? place.record.name : "Sweden"}
        </text>
      </svg>
    </div>
  );
}

function SectorTableBeat({
  cells,
  activeSector,
  onSelectSector,
  national,
  municipalityCount,
}: {
  cells: StorySectorCell[];
  activeSector: StorySectorId | null;
  onSelectSector: (id: StorySectorId | null) => void;
  national: boolean;
  municipalityCount: number;
}) {
  const active = cells.find((c) => c.id === activeSector) ?? null;
  return (
    <StoryChapter
      id="sectors"
      eyebrow="Action across sectors"
      title="Where plans put actions on the table"
      body="Six main emission sectors, plus Other & cross-cutting (procurement, planning, and more). Filled cells mean we found concrete measures in the plan text we read — not how much they will cut."
    >
      <p className="mb-4 text-center text-xs text-white/45">
        {national
          ? "National view: % of municipalities with actions in each sector"
          : "Municipality view: whether this plan has actions in each sector"}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cells.map((cell, i) => {
          const fill = national
            ? (cell.municipalityCoverageShare ?? 0)
            : cell.addressed
              ? 1
              : 0;
          const selected = activeSector === cell.id;
          return (
            <motion.button
              key={cell.id}
              type="button"
              onClick={() => onSelectSector(selected ? null : cell.id)}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "relative text-left rounded-3xl border px-4 py-4 min-h-[9.5rem] overflow-hidden transition-transform hover:-translate-y-0.5",
                selected ? "border-white/60" : "border-white/10",
              )}
              style={{
                background: `linear-gradient(160deg, ${storySectorColor(cell.id, 0.08 + fill * 0.45)} 0%, rgba(0,0,0,0.35) 100%)`,
              }}
            >
              <div className="text-[10px] uppercase tracking-wide text-white/50">
                {cell.id === "other" ? "Cross-cutting" : "Sector"}
              </div>
              <div className="mt-1 text-lg font-medium text-white leading-snug">
                {cell.label}
              </div>
              <div className="mt-4 text-2xl tabular-nums text-white">
                {national
                  ? `${Math.round((cell.municipalityCoverageShare ?? 0) * 100)}%`
                  : cell.addressed
                    ? "Actions in plan"
                    : "Not found in plan text"}
              </div>
              <div className="text-xs text-white/55 mt-1">
                {national
                  ? `${cell.municipalitiesCovered}/${municipalityCount} municipalities · ${cell.measureCount} measures`
                  : `${cell.measureCount} measure${cell.measureCount === 1 ? "" : "s"}`}
              </div>
              <div
                className="absolute bottom-0 left-0 h-1.5 transition-all"
                style={{
                  width: `${Math.round(fill * 100)}%`,
                  background: storySectorColor(cell.id, 0.95),
                }}
              />
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-5 rounded-3xl border border-white/15 bg-white/5 px-5 py-4"
          >
            <div className="text-sm text-white/70">
              Example actions under {active.label}
            </div>
            {active.examples.length === 0 ? (
              <p className="mt-2 text-sm text-white/45">
                No example actions in the current extract for this cell.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {active.examples.map((ex) => (
                  <li
                    key={`${ex.title}-${ex.municipalityName}`}
                    className="text-sm text-white/85 border-l-2 pl-3"
                    style={{ borderColor: storySectorColor(active.id, 0.8) }}
                  >
                    <span className="text-white">{ex.title}</span>
                    <span className="text-white/45">
                      {" "}
                      · {ex.municipalityName}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ) : (
          <p className="mt-4 text-center text-sm text-white/45">
            Tap a sector cell to peek at example actions from the extracts.
          </p>
        )}
      </AnimatePresence>
    </StoryChapter>
  );
}

function BiggestSourceBeat({
  metrics,
  place,
  cells,
}: {
  metrics: StoryNationalMetrics;
  place: StoryPlaceMetrics | null;
  cells: StorySectorCell[];
}) {
  const orbit = cells.map((c) => ({
    ...c,
    size: c.id === "other" ? 0.08 : Math.max(0.08, c.emissionShare ?? 0.08),
  }));
  const largest = [...orbit]
    .filter((c) => c.id !== "other")
    .sort((a, b) => b.emissionTonnes - a.emissionTonnes)[0];

  const plain = place?.plainFocus;
  const nationalMissShare =
    metrics.municipalityCount === 0
      ? 0
      : metrics.focusMatchCounts.miss / metrics.municipalityCount;

  return (
    <StoryChapter
      id="biggest"
      eyebrow="Local priorities"
      title="Does the plan tackle the largest source of emissions?"
      body={
        place
          ? (plain?.answer ??
            "Compare the biggest emission source with where the plan puts actions.")
          : `In this load, ${metrics.focusMatchCounts.miss} municipalities leave the biggest source without clear actions (${Math.round(nationalMissShare * 100)}%).`
      }
    >
      <div className="relative mx-auto h-[22rem] max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.03]">
        <svg viewBox="0 0 640 360" className="w-full h-full">
          <circle
            cx="320"
            cy="180"
            r="78"
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.2)"
          />
          <text
            x="320"
            y="176"
            textAnchor="middle"
            className="fill-white"
            fontSize="13"
          >
            {place ? place.record.name : "Sweden"}
          </text>
          <text
            x="320"
            y="196"
            textAnchor="middle"
            className="fill-white/50"
            fontSize="11"
          >
            Biggest source orbit
          </text>
          {orbit.map((node, i) => {
            const angle = (i / orbit.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 130;
            const x = 320 + Math.cos(angle) * radius;
            const y = 180 + Math.sin(angle) * radius * 0.9;
            const r = 14 + node.size * 42;
            const isLargest = largest?.id === node.id;
            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                {isLargest ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 10}
                    fill="none"
                    stroke="rgba(251,113,133,0.7)"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;20"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                ) : null}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={storySectorColor(node.id, node.addressed ? 0.8 : 0.2)}
                  stroke={
                    isLargest
                      ? "rgba(255,255,255,0.9)"
                      : storySectorColor(node.id, 1)
                  }
                  strokeWidth={isLargest ? 3 : 1.5}
                />
                {node.addressed ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 6}
                    fill="none"
                    stroke="rgba(96,165,250,0.55)"
                    strokeWidth="2"
                  />
                ) : null}
                <text
                  x={x}
                  y={y + r + 16}
                  textAnchor="middle"
                  fontSize="11"
                  className="fill-white/70"
                >
                  {node.shortLabel}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>
      <p className="mt-4 text-center text-sm text-white/55 max-w-2xl mx-auto">
        Planet size ≈ emissions share. Blue ring = plan has measures. Dashed
        pink ring = biggest source
        {largest ? ` (${largest.label})` : ""}.
        {place && !largest?.addressed
          ? " Here the biggest source has no clear actions in the plan text we read."
          : null}
      </p>
    </StoryChapter>
  );
}

function GapBeat({
  metrics,
  place,
}: {
  metrics: StoryNationalMetrics;
  place: StoryPlaceMetrics | null;
}) {
  const gap = place?.gap.gapShare ?? metrics.averageGapShare;
  const pct = gap == null ? null : Math.round(gap * 100);
  const title = place
    ? `How much of ${place.record.name}’s emissions come from sectors the plan doesn’t mention?`
    : "How much of emissions sit in sectors plans don’t mention?";
  return (
    <StoryChapter
      id="gap"
      eyebrow="Sectors without actions"
      title={title}
      body={
        place?.gap.summaryEn ??
        (gap == null
          ? "Not enough paired plan + emissions data yet in this explore load."
          : `On average across analysed municipalities, about ${pct}% of mapped emissions sit in sectors with no measures in the plan.`)
      }
    >
      <p className="mb-4 text-center text-xs text-white/50 max-w-xl mx-auto">
        This shows where the plan has actions, not how much those actions will
        cut.
      </p>
      <div className="relative mx-auto max-w-xl h-56 rounded-[32px] border border-white/10 overflow-hidden bg-[#0b1220]">
        <motion.div
          className="absolute inset-y-0 left-0"
          initial={{ width: "0%" }}
          whileInView={{ width: `${100 - (pct ?? 0)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          style={{
            background:
              "linear-gradient(90deg, rgba(59,130,246,0.45), rgba(148,163,184,0.2))",
          }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center justify-center"
          initial={{ width: "0%" }}
          whileInView={{ width: `${pct ?? 0}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
          style={{
            background:
              "repeating-linear-gradient(-45deg, rgba(255,255,255,0.16), rgba(255,255,255,0.16) 8px, rgba(255,255,255,0.05) 8px, rgba(255,255,255,0.05) 16px)",
          }}
        >
          <div className="text-center px-3">
            <div className="text-4xl font-medium text-white tabular-nums">
              {pct == null ? "—" : `${pct}%`}
            </div>
            <div className="text-xs uppercase tracking-wide text-white/70">
              No actions found
            </div>
          </div>
        </motion.div>
        <div className="absolute bottom-3 left-4 text-xs text-white/60">
          Sectors with actions
        </div>
        <div className="absolute bottom-3 right-4 text-xs text-white/60">
          Sectors with no actions found
        </div>
      </div>
    </StoryChapter>
  );
}

function ThemesBeat({
  metrics,
  place,
}: {
  metrics: StoryNationalMetrics;
  place: StoryPlaceMetrics | null;
}) {
  const themes = place
    ? place.focus.themes.map((t) => ({
        id: t.id,
        label: t.label,
        measureCount: t.measureCount,
      }))
    : metrics.topThemes;
  const max = Math.max(1, ...themes.map((t) => t.measureCount));

  return (
    <StoryChapter
      id="themes"
      eyebrow="Common themes"
      title={
        place
          ? `What ${place.record.name}’s plan focuses on`
          : "What municipalities talk about most"
      }
      body={
        place?.focus.sentenceEn ??
        "Across Sweden, plans cluster around familiar solutions. Patterns show shared momentum — and harder areas fewer municipalities take on."
      }
    >
      <div className="space-y-3 max-w-3xl mx-auto">
        {themes.length === 0 ? (
          <p className="text-center text-sm text-white/50">
            Not enough analysed measures yet for a focus theme sentence.
          </p>
        ) : (
          themes.map((theme, i) => (
            <motion.div
              key={theme.id}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <div className="flex justify-between gap-3 text-sm text-white/80 mb-2">
                <span>{theme.label}</span>
                <span className="tabular-nums text-white/50">
                  {theme.measureCount}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(167,139,250,0.8))",
                  }}
                  initial={{ width: 0 }}
                  whileInView={{
                    width: `${Math.round((theme.measureCount / max) * 100)}%`,
                  }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.05 * i }}
                />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </StoryChapter>
  );
}

function ConcretenessBeat({
  metrics,
  place,
}: {
  metrics: StoryNationalMetrics;
  place: StoryPlaceMetrics | null;
}) {
  const c = place?.concreteness;
  const slots = [
    {
      id: "who",
      label: "Who",
      rate: place ? c!.whoRate : metrics.averageWhoRate,
      count: place ? c!.whoCount : null,
    },
    {
      id: "what",
      label: "What",
      rate: place ? c!.whatRate : metrics.averageWhatRate,
      count: place ? c!.whatCount : null,
    },
    {
      id: "when",
      label: "When",
      rate: place ? c!.whenRate : metrics.averageWhenRate,
      count: place ? c!.whenCount : null,
    },
    {
      id: "how",
      label: "How",
      rate: place ? c!.howRate : metrics.averageHowRate,
      count: place ? c!.howCount : null,
    },
  ];

  return (
    <StoryChapter
      id="concrete"
      eyebrow="Wording in the plan"
      title="Does the plan say who, what, when and how?"
      body={
        place
          ? `${place.concreteness.publicHeadlineEn} Some measures are written broadly and could fit several kinds of action — that is not automatically a problem.`
          : "We also look at how concrete the wording is: whether measures name who acts, what they do, when, and how — and how often matches are only implied from broad text."
      }
    >
      <p className="mb-5 text-center text-xs text-white/50 max-w-2xl mx-auto">
        Based on the plan wording we read. Other documents, budgets or decisions
        may add detail. Automated reading may be wrong.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {slots.map((slot, i) => (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center"
          >
            <div className="text-xs uppercase tracking-wide text-white/50">
              {slot.label}
              {place ? "" : " · avg"}
            </div>
            <div className="mt-2 text-3xl tabular-nums text-white">
              {slot.rate == null ? "—" : `${Math.round(slot.rate * 100)}%`}
            </div>
            <div className="mt-1 text-xs text-white/45">
              {slot.count == null
                ? "of measures in load"
                : `${slot.count} of ${c?.measureCount ?? 0}`}
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-sky-400/80"
                initial={{ width: 0 }}
                whileInView={{
                  width: `${Math.round((slot.rate ?? 0) * 100)}%`,
                }}
                viewport={{ once: true }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
        <div className="rounded-3xl border border-white/10 px-4 py-4">
          <div className="text-xs uppercase tracking-wide text-white/50">
            {place ? "Direct wording" : "Avg all four named"}
          </div>
          <div className="mt-1 text-2xl tabular-nums text-white">
            {place
              ? c?.explicitWordingShare == null
                ? "—"
                : `${Math.round(c.explicitWordingShare * 100)}%`
              : metrics.averageFullSpecShare == null
                ? "—"
                : `${Math.round(metrics.averageFullSpecShare * 100)}%`}
          </div>
          <div className="text-xs text-white/45 mt-1">
            {place && c
              ? `${c.explicitMeasureCount} of ${c.judgedMeasureCount} judged measures`
              : "Share of measures with who+what+when+how filled"}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 px-4 py-4">
          <div className="text-xs uppercase tracking-wide text-white/50">
            Broad wording
          </div>
          <div className="mt-1 text-2xl tabular-nums text-white">
            {place
              ? c?.broadWordingShare == null
                ? "—"
                : `${Math.round(c.broadWordingShare * 100)}%`
              : metrics.averageBroadWordingShare == null
                ? "—"
                : `${Math.round(metrics.averageBroadWordingShare * 100)}%`}
          </div>
          <div className="text-xs text-white/45 mt-1">
            Could fit several kinds of action — not a quality grade
          </div>
        </div>
      </div>
    </StoryChapter>
  );
}

function SincePlanBeat({
  metrics,
  place,
}: {
  metrics: StoryNationalMetrics;
  place: StoryPlaceMetrics | null;
}) {
  const since = place?.sincePlan;
  const value =
    since?.status === "ok" && since.annualChangePercent != null
      ? since.annualChangePercent
      : null;
  const year = place?.record.adoptedYear ?? metrics.medianAdoptedYear;
  const withTrend = metrics.places.filter(
    (p) =>
      p.sincePlan.status === "ok" && p.sincePlan.annualChangePercent != null,
  );
  const fallingShare =
    withTrend.length === 0
      ? null
      : withTrend.filter((p) => (p.sincePlan.annualChangePercent ?? 0) < 0)
          .length / withTrend.length;

  return (
    <StoryChapter
      id="since"
      eyebrow="Emissions over time"
      title="How have emissions moved since the plan was adopted?"
      body="Many things affect emissions — national policy, weather, industry — not only the local plan. We still show the territorial trend after adoption so you can ask whether progress is keeping pace."
    >
      <div className="mx-auto max-w-lg rounded-[32px] border border-white/10 bg-white/[0.03] px-6 py-8 text-center">
        <div className="text-xs uppercase tracking-wide text-white/50">
          {place ? "Plan adopted" : "Median adoption year in this load"}
        </div>
        <div className="mt-2 text-5xl font-light text-white tabular-nums">
          {year ?? "—"}
        </div>
        {place ? (
          <>
            <div className="mt-8 flex items-end justify-center gap-10 h-28">
              <div className="text-center">
                <motion.div
                  className="mx-auto w-16 rounded-t-2xl bg-white/25"
                  initial={{ height: 0 }}
                  whileInView={{ height: value == null ? 40 : 72 }}
                  viewport={{ once: true }}
                />
                <div className="mt-2 text-xs text-white/50">
                  {since?.fromYear ?? "Adopted"}
                </div>
              </div>
              <div className="text-center">
                <motion.div
                  className="mx-auto w-16 rounded-t-2xl bg-blue-03/70"
                  initial={{ height: 0 }}
                  whileInView={{
                    height:
                      value == null
                        ? 40
                        : Math.max(
                            24,
                            72 *
                              (1 +
                                Math.min(Math.abs(value) / 10, 0.45) *
                                  (value > 0 ? 1 : -1)),
                          ),
                  }}
                  viewport={{ once: true }}
                />
                <div className="mt-2 text-xs text-white/50">
                  {since?.toYear ?? "Latest"}
                </div>
              </div>
            </div>
            <div className="mt-6 text-lg text-white/80">
              {value == null ? (
                <span className="text-white/45">
                  {since?.status === "too-new"
                    ? "Too early to say — not enough years after adoption yet."
                    : since?.noteEn || "Not enough post-adoption years yet"}
                </span>
              ) : (
                <>
                  Emissions changed{" "}
                  <span className="tabular-nums text-white">
                    {value > 0 ? "+" : ""}
                    {value.toFixed(1)}%
                  </span>{" "}
                  per year
                  {since?.fromYear && since.toYear
                    ? ` (${since.fromYear}–${since.toYear})`
                    : ""}
                  . Many things affect this, not only the plan.
                </>
              )}
            </div>
          </>
        ) : (
          <div className="mt-8 text-white/70 text-sm leading-relaxed">
            {fallingShare == null ? (
              "Open a municipality to see its since-plan trend."
            ) : (
              <>
                In this explore load,{" "}
                <span className="text-white tabular-nums">
                  {Math.round(fallingShare * 100)}%
                </span>{" "}
                of municipalities with a readable post-plan trend saw
                territorial emissions fall after adoption — still correlation,
                not proof.
              </>
            )}
          </div>
        )}
      </div>
    </StoryChapter>
  );
}

function DrillBeat({
  metrics,
  selectedPlace,
  onPick,
}: {
  metrics: StoryNationalMetrics;
  selectedPlace: StoryPlaceMetrics | null;
  onPick: (name: string) => void;
}) {
  const ranked = [...metrics.places]
    .filter((p) => p.gap.gapShare != null)
    .sort((a, b) => (b.gap.gapShare ?? 0) - (a.gap.gapShare ?? 0))
    .slice(0, 8);

  return (
    <StoryChapter
      id="drill"
      eyebrow="Local view"
      title="Explore your municipality’s story"
      body="Pick a municipality to re-run every beat against its own plan and emissions. The list below highlights larger uncovered-emission gaps in this explore load."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
        {ranked.map((place, i) => {
          const selected =
            selectedPlace &&
            namesMatch(selectedPlace.record.name, place.record.name);
          return (
            <motion.button
              key={place.record.id}
              type="button"
              onClick={() => onPick(place.record.name)}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "rounded-3xl border px-4 py-4 text-left transition-colors",
                selected
                  ? "border-blue-03/60 bg-blue-03/15"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
              )}
            >
              <div className="flex justify-between gap-3">
                <div className="text-lg text-white">{place.record.name}</div>
                <div className="text-pink-03 tabular-nums">
                  {Math.round((place.gap.gapShare ?? 0) * 100)}%
                </div>
              </div>
              <div className="mt-1 text-xs text-white/50">
                {place.plainFocus.shortLabel} ·{" "}
                {place.record.adoptedYear ?? "no year"} ·{" "}
                {place.record.measures.length} measures
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-pink-03/80"
                  style={{
                    width: `${Math.round((place.gap.gapShare ?? 0) * 100)}%`,
                  }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
      {ranked.length === 0 ? (
        <p className="text-center text-sm text-white/50">
          No municipalities with assessable gap yet in this load.
        </p>
      ) : null}
    </StoryChapter>
  );
}

function TakeawaysBeat({
  metrics,
  place,
}: {
  metrics: StoryNationalMetrics;
  place: StoryPlaceMetrics | null;
}) {
  const insights = place?.insightCards ?? metrics.nationalInsights;
  const prompts = place?.starters ?? metrics.nationalStarters;

  return (
    <StoryChapter
      id="takeaways"
      eyebrow="What you can take away"
      title="Insights and questions for local conversations"
      body="You do not need to be an expert to ask how a municipality follows up on its climate plan. Use these insights and questions to start a constructive conversation."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
        {insights.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent px-5 py-4"
          >
            <div className="text-sm text-blue-03">{card.title}</div>
            <p className="mt-2 text-sm text-white/75 leading-relaxed">
              {card.body}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 max-w-3xl mx-auto rounded-3xl border border-orange-03/35 bg-orange-03/10 px-5 py-5">
        <div className="text-sm text-white">Questions to ask locally</div>
        <p className="text-xs text-white/50 mt-1">
          Exploratory prompts from the same signals — keep, rewrite, or cut
          later.
        </p>
        <ul className="mt-4 space-y-3">
          {prompts.map((line) => (
            <li
              key={line}
              className="text-sm text-white/85 leading-relaxed border-l-2 border-orange-02/70 pl-3"
            >
              {line}
            </li>
          ))}
        </ul>
      </div>
    </StoryChapter>
  );
}
