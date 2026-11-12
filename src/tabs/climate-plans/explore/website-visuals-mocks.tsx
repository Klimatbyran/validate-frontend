import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SwedenChoropleth } from "./SwedenChoropleth";
import type {
  PlaceKpiBundle,
  RegionKpiBundle,
} from "../lib/website-visuals-rollup";
import {
  buildPlaceKpiBundle,
  focusMatchValueClass,
  formatGapPercent,
  formatSincePlan,
  gapValueClass,
  plainFocusMatch,
  rankByGap,
  startersForBundle,
} from "../lib/website-visuals-rollup";
import type { SectorYearEmissions } from "../lib/explore-types";
import { RuleFlagChip, RuleFlagNote } from "./RuleFlagNote";

/** Klimatkollen-like dark surface wrappers for Validate mocks. */
export function SiteMockShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[30px] border border-gray-03/50 bg-gray-04 text-gray-01 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-03/40 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-blue-03/90">
            {eyebrow}
          </div>
          <div className="text-sm text-gray-02 mt-0.5">{title}</div>
        </div>
        <div className="text-[11px] text-gray-02">
          Mock · klimatkollen.se layout
        </div>
      </div>
      <div className="p-5 md:p-8 space-y-8 font-dm-sans">{children}</div>
    </div>
  );
}

export function MockChipRow({
  chips,
  active,
  onChange,
}: {
  chips: { id: string; label: string; proposed?: boolean }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="KPI chips">
      {chips.map((chip) => {
        const selected = chip.id === active;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm transition-colors border",
              selected
                ? "bg-blue-03/20 text-blue-03 border-blue-03/40"
                : "bg-gray-03/60 text-gray-02 border-transparent hover:text-gray-01",
              chip.proposed && !selected && "border-dashed border-orange-03/50",
            )}
          >
            {chip.label}
            {chip.proposed ? (
              <span className="ml-1.5 text-[10px] uppercase text-orange-02">
                new
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function MockAnswerCard({
  averageLabel,
  averageValue,
  averageClassName,
  direction,
  top,
  bottom,
  note,
  topLabel = "Top",
  bottomLabel = "Bottom",
  listTone = "rank",
}: {
  averageLabel: string;
  averageValue: string;
  averageClassName: string;
  direction: string;
  top: { name: string; value: string }[];
  bottom: { name: string; value: string }[];
  note?: string;
  /** Override Top/Bottom headings (e.g. Most / Fewest for volume KPIs). */
  topLabel?: string;
  bottomLabel?: string;
  /** "rank" uses blue/pink; "neutral" avoids implying better/worse. */
  listTone?: "rank" | "neutral";
}) {
  const valueClass = listTone === "neutral" ? "text-gray-01" : undefined;
  return (
    <section className="rounded-[30px] bg-gray-05/80 border border-gray-03/40 px-6 py-7 md:px-8 h-full flex flex-col">
      <div className="text-xs uppercase tracking-wide text-gray-02">
        The short answer
      </div>
      <p className="mt-2 text-sm text-gray-02">{averageLabel}</p>
      <div
        className={cn(
          "mt-3 text-5xl md:text-6xl font-medium tabular-nums leading-none",
          averageClassName,
        )}
      >
        {averageValue}
      </div>
      <div className="mt-3 inline-flex w-fit rounded-full bg-gray-03/70 px-3 py-1 text-xs text-gray-01">
        {direction}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-gray-02 mb-2">{topLabel}</div>
          <ul className="space-y-1.5">
            {top.map((row) => (
              <li
                key={row.name}
                className="flex justify-between gap-2 text-gray-01"
              >
                <span className="truncate">{row.name}</span>
                <span
                  className={cn(
                    "tabular-nums shrink-0",
                    valueClass ?? "text-blue-03",
                  )}
                >
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs text-gray-02 mb-2">{bottomLabel}</div>
          <ul className="space-y-1.5">
            {bottom.map((row) => (
              <li
                key={row.name}
                className="flex justify-between gap-2 text-gray-01"
              >
                <span className="truncate">{row.name}</span>
                <span
                  className={cn(
                    "tabular-nums shrink-0",
                    valueClass ?? "text-pink-03",
                  )}
                >
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {note ? (
        <p className="mt-auto pt-5 text-xs text-gray-02">{note}</p>
      ) : null}
    </section>
  );
}

export function MockDetailHeader({
  name,
  subtitle,
  stats,
}: {
  name: string;
  subtitle?: string;
  stats: Array<{
    label: string;
    value: string;
    className?: string;
    caption?: string;
  }>;
}) {
  return (
    <header className="space-y-6">
      <div>
        <h2 className="text-3xl md:text-5xl font-light text-gray-01 tracking-tight">
          {name}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-sm text-gray-02">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-6 md:gap-10">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-[9rem] flex-[1_1_14rem]">
            <div className="text-sm text-gray-02">{stat.label}</div>
            <div
              className={cn(
                "mt-1 text-4xl md:text-5xl font-medium tabular-nums",
                stat.className ?? "text-gray-01",
              )}
            >
              {stat.value}
            </div>
            {stat.caption ? (
              <div className="mt-1 text-xs text-gray-02 max-w-[16rem]">
                {stat.caption}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </header>
  );
}

export function MockLinkCard({
  title,
  description,
  descriptionClassName,
  footer,
}: {
  title: string;
  description: string;
  descriptionClassName?: string;
  footer?: string;
}) {
  return (
    <div className="rounded-[30px] bg-gray-03/50 border border-gray-03/40 px-5 py-5 md:px-6 md:py-6">
      <div className="text-lg md:text-xl text-gray-01">{title}</div>
      <div
        className={cn(
          "mt-2 text-lg md:text-xl",
          descriptionClassName ?? "text-gray-02",
        )}
      >
        {description}
      </div>
      {footer ? <p className="mt-3 text-sm text-gray-02">{footer}</p> : null}
    </div>
  );
}

export function MockDetailSection({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; value: string; className?: string }>;
}) {
  return (
    <section>
      <h3 className="text-xl md:text-2xl font-light text-gray-01">{title}</h3>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        {items.map((item) => (
          <div key={item.title}>
            <div className="text-lg md:text-xl text-gray-02">{item.title}</div>
            <div
              className={cn(
                "mt-1 text-4xl md:text-5xl font-medium tabular-nums",
                item.className ?? "text-gray-01",
              )}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MunicipalityDetailMock({ bundle }: { bundle: PlaceKpiBundle }) {
  const since = formatSincePlan(bundle.sincePlan);
  const gapValue = formatGapPercent(bundle.gap.gapShare);
  const planYear = bundle.record.adoptedYear;
  const focus = plainFocusMatch(bundle.gap);
  const starters = startersForBundle(bundle);
  return (
    <SiteMockShell
      eyebrow="Municipality · detail page"
      title="Keep the header for emissions KPIs; add a Climate plan section below"
    >
      <p className="text-sm text-gray-02 -mt-2">
        Page flow today: header stats → emissions charts → climate-plan +
        procurement cards → transport KPIs. Proposed climate-plan insights sit
        in their own section after the existing cards — not jammed into the
        Paris / emissions header.
      </p>

      <MockDetailHeader
        name={bundle.record.name}
        subtitle={bundle.record.county ?? bundle.record.regionName ?? undefined}
        stats={[
          {
            label: "Meets Paris pathway",
            value: "…",
            className: "text-green-03",
            caption: "Existing header KPI (unchanged).",
          },
          {
            label: "Emissions change since 2015",
            value: "…",
            className: "text-orange-02",
            caption: "Existing header KPI (unchanged).",
          },
          {
            label: "Total emissions",
            value: "…",
            className: "text-orange-02",
            caption: "Existing header KPI (unchanged).",
          },
        ]}
      />

      <div className="rounded-[30px] border border-dashed border-gray-03/50 px-5 py-6 text-sm text-gray-02">
        Emissions charts stay here (historic trend + sectors) — same as today.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MockLinkCard
          title="Climate plan"
          description={
            planYear ? `Adopted ${planYear}` : "No climate plan / year"
          }
          descriptionClassName={planYear ? "text-blue-03" : "text-pink-03"}
          footer={bundle.record.documentTitle ?? undefined}
        />
        <MockLinkCard
          title="Procurement"
          description="Existing card (unchanged)"
          descriptionClassName="text-gray-02"
        />
      </div>

      <section className="space-y-5 rounded-[30px] border border-blue-03/30 bg-blue-03/5 px-5 py-6 md:px-7 md:py-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-blue-03">
              Proposed section
            </div>
            <h3 className="mt-1 text-2xl md:text-3xl font-light text-gray-01">
              Climate plan
            </h3>
            <p className="mt-2 text-sm text-gray-02 max-w-2xl">
              What the municipality plans to do, how it lines up with local
              emissions, and questions you can bring to neighbours or local
              politicians.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-gray-02">
              Adopted
            </div>
            <div
              className={cn(
                "text-2xl font-medium",
                planYear ? "text-blue-03" : "text-pink-03",
              )}
            >
              {planYear ?? "No year"}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-gray-05/50 border border-gray-03/40 px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <RuleFlagChip id="focus-match-copy" tone="light" />
          </div>
          <div className="text-sm text-gray-02">{focus.question}</div>
          <div
            className={cn(
              "mt-1 text-2xl md:text-3xl font-medium",
              focusMatchValueClass(focus.verdict),
            )}
          >
            {focus.answer}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 px-1">
            <RuleFlagChip id="tef-focus-families" tone="light" />
          </div>
          <MockLinkCard
            title="What the plan focuses on"
            description={
              bundle.focus.sentenceEn ??
              "Not enough measures analysed yet to summarise the focus."
            }
            descriptionClassName={
              bundle.focus.sentenceEn ? "text-gray-01" : "text-gray-02"
            }
            footer="One or two plain themes from the plan’s measures — not a quality score."
          />
          {bundle.focus.themes.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-1">
              {bundle.focus.themes.slice(0, 4).map((theme) => (
                <span
                  key={theme.id}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-03/50 text-gray-01 bg-gray-05/40"
                >
                  {theme.label}
                  <span className="text-gray-02 ml-1.5 tabular-nums">
                    {theme.measureCount}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
          <RuleFlagNote id="tef-focus-families" tone="light" />
        </div>

        <MockDetailSection
          title="Plan and emissions at a glance"
          items={[
            {
              title: "Emissions with no measures in the plan",
              value: gapValue,
              className: gapValueClass(bundle.gap.gapShare),
            },
            {
              title: "What happened after the plan was adopted",
              value: since.value,
              className: since.className,
            },
            {
              title: "Measures analysed",
              value: String(bundle.record.measures.length),
              className: "text-orange-02",
            },
          ]}
        />
        <p className="text-sm text-gray-02 -mt-2">{bundle.gap.summaryEn}</p>
        {since.caption ? (
          <p className="text-xs text-gray-02 -mt-3">{since.caption}</p>
        ) : null}

        <div className="rounded-[24px] border border-gray-03/40 bg-gray-05/40 px-5 py-4">
          <div className="text-sm text-gray-01 mb-1">
            Where emissions are — and whether the plan has measures
          </div>
          <div className="text-xs text-gray-02 mb-3">
            Bar = share of local emissions. Label = whether the plan includes
            measures for that sector.
          </div>
          <div className="space-y-2">
            {bundle.gap.rows.map((row) => (
              <div
                key={row.sectorId}
                className="flex items-center gap-3 text-sm"
              >
                <div className="w-36 text-gray-01 truncate" title={row.label}>
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
                <div className="w-12 text-right tabular-nums text-gray-02">
                  {Math.round(row.emissionShare * 100)}%
                </div>
                <div
                  className={cn(
                    "w-28 text-right text-xs",
                    row.addressed ? "text-blue-03" : "text-pink-03",
                  )}
                >
                  {row.addressed ? "Has measures" : "No measures"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {starters.length > 0 ? (
          <div className="rounded-[24px] border border-orange-03/40 bg-orange-03/10 px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm text-gray-01">Conversation starters</div>
              <RuleFlagChip id="conversation-templates" tone="light" />
            </div>
            <p className="text-xs text-gray-02">
              Factual prompts for chats with neighbours or local politicians —
              not a grade of the municipality. Template wording is fixed; counts
              and place names are live.
            </p>
            <ul className="space-y-2.5">
              {starters.map((line) => (
                <li
                  key={line}
                  className="text-sm text-gray-01 leading-relaxed pl-3 border-l-2 border-orange-02/60"
                >
                  {line}
                </li>
              ))}
            </ul>
            <RuleFlagNote id="conversation-templates" tone="light" />
          </div>
        ) : null}
      </section>
    </SiteMockShell>
  );
}

export function RegionDetailMock({
  bundle,
  sectorEmissions,
}: {
  bundle: RegionKpiBundle;
  sectorEmissions: SectorYearEmissions[];
}) {
  const gapValue = formatGapPercent(bundle.gap.gapShare);
  const focus = plainFocusMatch(bundle.gap);
  return (
    <SiteMockShell
      eyebrow="Region · detail page"
      title="Header stays emissions-first; Climate plan roll-up is its own section"
    >
      <p className="text-sm text-gray-02 -mt-2">
        Regions do not publish one shared climate plan. This section summarises
        what municipal plans in the region cover — useful for regional debate
        and comparing neighbours.
      </p>

      <MockDetailHeader
        name={bundle.record.name}
        subtitle={`${bundle.assessedCount} of ${bundle.municipalityCount} municipalities with assessable plan data`}
        stats={[
          {
            label: "Meets Paris pathway",
            value: "…",
            className: "text-green-03",
            caption: "Existing header KPI (unchanged).",
          },
          {
            label: "Emissions change since 2015",
            value: "…",
            className: "text-orange-02",
            caption: "Existing header KPI (unchanged).",
          },
          {
            label: "Total emissions",
            value: "…",
            className: "text-orange-02",
            caption: "Existing header KPI (unchanged).",
          },
        ]}
      />

      <section className="space-y-5 rounded-[30px] border border-blue-03/30 bg-blue-03/5 px-5 py-6 md:px-7 md:py-7">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-blue-03">
            Proposed section
          </div>
          <h3 className="mt-1 text-2xl md:text-3xl font-light text-gray-01">
            Climate plans in the region
          </h3>
          <p className="mt-2 text-sm text-gray-02 max-w-2xl">
            How municipal climate plans line up with emissions across the region
            — not a regional plan grade.
          </p>
        </div>

        <MockDetailSection
          title="At a glance"
          items={[
            {
              title: "Emissions with no measures in municipal plans",
              value: gapValue,
              className: gapValueClass(bundle.gap.gapShare),
            },
            {
              title: "Municipalities with plan data",
              value: `${bundle.assessedCount}/${bundle.municipalityCount}`,
              className: "text-orange-02",
            },
            {
              title: "Biggest source covered?",
              value: focus.shortLabel,
              className: focusMatchValueClass(focus.verdict),
            },
          ]}
        />
        <p className="text-sm text-gray-02 -mt-2">{bundle.gap.summaryEn}</p>

        <MockLinkCard
          title="What plans in the region focus on"
          description={
            bundle.focus.sentenceEn ??
            "Not enough measures analysed yet across municipalities."
          }
          descriptionClassName={
            bundle.focus.sentenceEn ? "text-gray-01" : "text-gray-02"
          }
          footer="Merged from municipal extracts — not one regional climate plan."
        />

        <section>
          <h4 className="text-lg font-light text-gray-01 mb-3">
            Municipalities — emissions with no measures in the plan
          </h4>
          <ul className="divide-y divide-gray-03/40 rounded-[24px] border border-gray-03/40 overflow-hidden">
            {bundle.municipalities
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "sv"))
              .map((muni) => {
                const local = buildPlaceKpiBundle(muni, sectorEmissions);
                const localFocus = plainFocusMatch(local.gap);
                return (
                  <li
                    key={muni.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm bg-gray-05/30"
                  >
                    <span className="text-gray-01">{muni.name}</span>
                    <span className="text-right">
                      <span
                        className={cn(
                          "tabular-nums",
                          gapValueClass(local.gap.gapShare),
                        )}
                      >
                        {formatGapPercent(local.gap.gapShare)}
                      </span>
                      <span className="text-gray-02">
                        {" "}
                        · {localFocus.shortLabel}
                        {muni.adoptedYear ? ` · ${muni.adoptedYear}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      </section>
    </SiteMockShell>
  );
}

export function OverviewMock({
  entityType,
  bundles,
  mapValues,
  selectedName,
  onSelectName,
  activeChip,
  onChipChange,
}: {
  entityType: "municipalities" | "regions";
  bundles: PlaceKpiBundle[];
  mapValues: Map<string, number | boolean | null>;
  selectedName: string | null;
  onSelectName: (name: string) => void;
  activeChip: string;
  onChipChange: (id: string) => void;
}) {
  const chips =
    entityType === "municipalities"
      ? [
          { id: "historical", label: "Emissions" },
          { id: "paris", label: "Paris Agreement" },
          { id: "climatePlan", label: "Climate plans" },
          {
            id: "emissionFocusGap",
            label: "No measures in the plan",
            proposed: true,
          },
        ]
      : [
          { id: "historical", label: "Emissions" },
          { id: "paris", label: "Paris Agreement" },
          {
            id: "emissionFocusGap",
            label: "No measures in the plan",
            proposed: true,
          },
        ];

  const assessed = bundles.filter((b) => b.gap.gapShare != null);
  const avgGap =
    assessed.length === 0
      ? null
      : assessed.reduce((s, b) => s + (b.gap.gapShare ?? 0), 0) /
        assessed.length;
  const best = rankByGap(bundles, "best");
  const worst = rankByGap(bundles, "worst");
  const showingGap = activeChip === "emissionFocusGap";

  return (
    <SiteMockShell
      eyebrow={
        entityType === "municipalities"
          ? "Municipalities · overview"
          : "Regions · overview"
      }
      title="TerritoryOverviewLayout: chips → map + answer → top/bottom"
    >
      <MockChipRow chips={chips} active={activeChip} onChange={onChipChange} />

      {!showingGap ? (
        <p className="text-sm text-gray-02 rounded-2xl border border-dashed border-gray-03/50 px-4 py-3">
          Existing chips ({chips.find((c) => c.id === activeChip)?.label})
          already ship on klimatkollen.se. Select{" "}
          <span className="text-orange-02">No measures in the plan</span> to see
          how the new climate-plan map KPI would sit in the same layout.
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <div className="rounded-[30px] bg-gray-05/50 border border-gray-03/40 p-3 min-h-[28rem]">
          <SwedenChoropleth
            geo={entityType === "municipalities" ? "municipality" : "region"}
            values={showingGap ? mapValues : new Map()}
            selectedName={selectedName}
            onSelect={onSelectName}
            booleanScale={false}
          />
        </div>
        <MockAnswerCard
          averageLabel={
            showingGap
              ? "Average share of emissions sitting in sectors with no measures in the plan"
              : "Select the new KPI chip for the mocked short answer"
          }
          averageValue={showingGap ? formatGapPercent(avgGap) : "—"}
          averageClassName={showingGap ? gapValueClass(avgGap) : "text-gray-02"}
          direction="Lower is better — more of the emissions picture is covered"
          top={best.map((b) => ({
            name: b.record.name,
            value: formatGapPercent(b.gap.gapShare),
          }))}
          bottom={worst.map((b) => ({
            name: b.record.name,
            value: formatGapPercent(b.gap.gapShare),
          }))}
          note={
            showingGap
              ? `${assessed.length} of ${bundles.length} ${entityType === "municipalities" ? "municipalities" : "regions"} have assessable data in this explore load. Grey on the map = no extract. Use this to spot places where plans leave large emission sources untouched.`
              : undefined
          }
        />
      </div>

      {showingGap ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightList
            title="More of emissions covered"
            rows={best.map((b) => ({
              name: b.record.name,
              value: formatGapPercent(b.gap.gapShare),
            }))}
            tone="good"
          />
          <InsightList
            title="Larger gaps in the plan"
            rows={worst.map((b) => ({
              name: b.record.name,
              value: formatGapPercent(b.gap.gapShare),
            }))}
            tone="bad"
          />
        </div>
      ) : null}

      {showingGap ? (
        <div className="overflow-hidden rounded-[30px] border border-gray-03/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-02 border-b border-gray-03/40">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium text-right">
                  Emissions with no measures
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  Biggest source covered?
                </th>
              </tr>
            </thead>
            <tbody>
              {[...bundles]
                .sort(
                  (a, b) =>
                    (a.gap.gapShare ?? 999) - (b.gap.gapShare ?? 999) ||
                    a.record.name.localeCompare(b.record.name, "sv"),
                )
                .slice(0, 8)
                .map((b) => {
                  const plain = plainFocusMatch(b.gap);
                  return (
                    <tr
                      key={b.record.id}
                      className="border-b border-gray-03/20 last:border-0"
                    >
                      <td className="px-4 py-2.5 text-gray-01">
                        {b.record.name}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right tabular-nums",
                          gapValueClass(b.gap.gapShare),
                        )}
                      >
                        {formatGapPercent(b.gap.gapShare)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right",
                          focusMatchValueClass(plain.verdict),
                        )}
                      >
                        {plain.shortLabel}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : null}
    </SiteMockShell>
  );
}

function InsightList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: { name: string; value: string }[];
  tone: "good" | "bad";
}) {
  return (
    <div className="rounded-[30px] border border-gray-03/40 bg-gray-05/40 px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-gray-02 mb-3">
        {title}
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.name}
            className="flex justify-between gap-2 text-sm text-gray-01"
          >
            <span className="truncate">{row.name}</span>
            <span
              className={cn(
                "tabular-nums shrink-0",
                tone === "good" ? "text-blue-03" : "text-pink-03",
              )}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
