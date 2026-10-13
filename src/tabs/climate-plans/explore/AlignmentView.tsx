import { MethodologyPanel } from "./MethodologyPanel";
import {
  BucketLegend,
  DualBar,
  GapDumbbells,
  SharePie,
  StackedCompare,
  emissionLabel,
  formatTonnes,
  tefLabel,
} from "./alignment-charts";
import {
  alignmentRows,
  findSectorEmissions,
  misalignmentScore,
} from "../lib/explore-alignment";
import { EMISSION_BUCKET_LABEL } from "../lib/tef-groups";
import type {
  AlignmentLayoutId,
  AlignmentRow,
  AlignmentValueMode,
  EmissionsYearMode,
  ExploreDataset,
} from "../lib/explore-types";
import { namesMatch } from "../lib/municipality-names";
import { cn } from "@/lib/utils";

const LAYOUTS: { id: AlignmentLayoutId; label: string; hint: string }[] = [
  {
    id: "bars",
    label: "Dual bars",
    hint: "Per-bucket emission % vs TEF % (original view)",
  },
  {
    id: "pies",
    label: "Pies",
    hint: "Overall mix: territorial emissions vs TEF hits",
  },
  {
    id: "stacked",
    label: "Stacked",
    hint: "Two 100% stacked bars for a quick mix compare",
  },
  {
    id: "gap",
    label: "Gap",
    hint: "Dumbbells: how far TEF share sits from emission share",
  },
  {
    id: "table",
    label: "Table",
    hint: "Tonnes, hit counts, shares, and gap in one grid",
  },
];

export function AlignmentView({
  dataset,
  selectedName,
  onSelectName,
  yearMode,
  onYearModeChange,
  layout,
  onLayoutChange,
  valueMode,
  onValueModeChange,
}: {
  dataset: ExploreDataset;
  selectedName: string | null;
  onSelectName: (name: string) => void;
  yearMode: EmissionsYearMode;
  onYearModeChange: (mode: EmissionsYearMode) => void;
  layout: AlignmentLayoutId;
  onLayoutChange: (layout: AlignmentLayoutId) => void;
  valueMode: AlignmentValueMode;
  onValueModeChange: (mode: AlignmentValueMode) => void;
}) {
  const selected =
    dataset.municipalities.find((row) =>
      namesMatch(row.name, selectedName ?? ""),
    ) ??
    dataset.municipalities.find(
      (row) => row.tefHits.length > 0 || row.goals.length > 0,
    ) ??
    dataset.municipalities[0] ??
    null;
  const emissions = selected
    ? findSectorEmissions(dataset.sectorEmissions, selected.name)
    : undefined;
  const aligned = selected
    ? alignmentRows(selected, emissions, yearMode)
    : { year: null, rows: [], note: "" };
  const score = misalignmentScore(aligned.rows);
  const layoutMeta = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[0];
  const totalTonnes = aligned.rows.reduce((s, r) => s + r.emissionTonnes, 0);
  const totalTefs = aligned.rows.reduce((s, r) => s + r.tefCount, 0);

  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="Territorial sector totals from Unearth GET /municipalities/:name/sector-emissions (SMHI Nationella emissionsdatabasen via Klimatkollen). TEF hits from scored measures (sector_path → bucket)."
        calculation="For a chosen year, each SMHI sector maps to a bucket (transport, industry, energy, …). TEF hits map the same way via the first sector_path segment. Shares = bucket / total. Gap = TEF share − emission share (percentage points). Misalignment score = Σ|gap| / 2 (0 = identical mix, 1 = completely different). Absolute mode shows tonnes and hit counts; pie/stack geometry always uses shares."
        extra="Plans written against municipal operations (scope 1+2) will look 'misaligned' versus territorial SMHI data — that mismatch is itself a story. Use plan-year vs latest to see whether the comparison should be 'what they faced when writing' or 'what they face now'. Switch layout to read the same numbers as bars, pies, stacked mix, gap dumbbells, or a table."
      />
      {dataset.sectorEmissionsError ? (
        <p className="text-sm text-orange-03">
          Sector emissions did not load ({dataset.sectorEmissionsError}).
          Alignment still shows TEF shares; emission bars stay empty until
          Unearth is reachable with a key.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={selected?.name ?? ""}
          onChange={(e) => onSelectName(e.target.value)}
          className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
        >
          {dataset.municipalities.map((row) => (
            <option key={row.id} value={row.name}>
              {row.name}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg overflow-hidden border border-gray-03/40 text-sm">
          {(
            [
              ["latest", "Latest emissions"],
              ["plan", "Plan-year emissions"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onYearModeChange(mode)}
              className={cn(
                "px-3 py-2",
                yearMode === mode
                  ? "bg-gray-03/50 text-gray-01"
                  : "text-gray-02 hover:text-gray-01",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-03/40 text-sm">
          {LAYOUTS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              onClick={() => onLayoutChange(item.id)}
              className={cn(
                "px-3 py-2",
                layout === item.id
                  ? "bg-gray-03/50 text-gray-01"
                  : "text-gray-02 hover:text-gray-01",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {layout === "bars" || layout === "table" ? (
          <div className="flex rounded-lg overflow-hidden border border-gray-03/40 text-sm">
            {(
              [
                ["share", "% shares"],
                ["absolute", "Tonnes / hits"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => onValueModeChange(mode)}
                className={cn(
                  "px-3 py-2",
                  valueMode === mode
                    ? "bg-gray-03/50 text-gray-01"
                    : "text-gray-02 hover:text-gray-01",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {score != null ? (
          <span className="text-sm text-gray-02">
            Mix mismatch{" "}
            <span className="font-semibold text-gray-01 tabular-nums">
              {(score * 100).toFixed(0)}%
            </span>
          </span>
        ) : null}
      </div>

      {selected ? (
        <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-base font-semibold text-gray-01">
                {selected.name}
              </div>
              <p className="text-xs text-gray-02 mt-1">{aligned.note}</p>
              <p className="text-xs text-gray-02 mt-1">{layoutMeta.hint}</p>
            </div>
            {aligned.rows.length > 0 ? (
              <div className="text-xs text-gray-02 text-right tabular-nums">
                <div>{formatTonnes(totalTonnes)} territorial</div>
                <div>
                  {totalTefs} TEF hit{totalTefs === 1 ? "" : "s"}
                </div>
              </div>
            ) : null}
          </div>
          {aligned.rows.length === 0 ? (
            <p className="text-sm text-gray-02 italic">
              Need both TEF matches and sector emissions to draw this
              comparison.
            </p>
          ) : layout === "pies" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-center gap-8">
                <SharePie
                  rows={aligned.rows}
                  valueKey="emissionShare"
                  title="Emissions mix"
                  subtitle={formatTonnes(totalTonnes)}
                />
                <SharePie
                  rows={aligned.rows}
                  valueKey="tefShare"
                  title="TEF mix"
                  subtitle={`${totalTefs} hits`}
                />
              </div>
              <BucketLegend rows={aligned.rows} />
            </div>
          ) : layout === "stacked" ? (
            <StackedCompare rows={aligned.rows} />
          ) : layout === "gap" ? (
            <GapDumbbells rows={aligned.rows} />
          ) : layout === "table" ? (
            <AlignmentTable rows={aligned.rows} valueMode={valueMode} />
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3 text-[11px] text-gray-02">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-orange-03/80" />{" "}
                  territorial emissions
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-blue-03/80" /> TEF hits
                  in the plan
                </span>
              </div>
              {aligned.rows.map((row) => (
                <div key={row.bucket} className="space-y-1">
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-01">
                      {EMISSION_BUCKET_LABEL[row.bucket]}
                    </span>
                    <span className="tabular-nums text-gray-02 text-right">
                      emissions {emissionLabel(row, valueMode)} · TEFs{" "}
                      {tefLabel(row, valueMode)}
                    </span>
                  </div>
                  <DualBar
                    emission={row.emissionShare}
                    tef={row.tefShare}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function AlignmentTable({
  rows,
  valueMode,
}: {
  rows: AlignmentRow[];
  valueMode: AlignmentValueMode;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-03/30">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-03/40 text-left text-xs text-gray-02">
            <th className="px-3 py-2 font-medium">Bucket</th>
            <th className="px-3 py-2 font-medium text-right">Emissions</th>
            <th className="px-3 py-2 font-medium text-right">TEF hits</th>
            <th className="px-3 py-2 font-medium text-right">Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.bucket}
              className="border-b border-gray-03/20 last:border-0"
            >
              <td className="px-3 py-2 text-gray-01">
                {EMISSION_BUCKET_LABEL[row.bucket]}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-01">
                {valueMode === "absolute" ? (
                  <>
                    {formatTonnes(row.emissionTonnes)}
                    <span className="text-gray-02 ml-1">
                      ({(row.emissionShare * 100).toFixed(0)}%)
                    </span>
                  </>
                ) : (
                  <>
                    {(row.emissionShare * 100).toFixed(0)}%
                    <span className="text-gray-02 ml-1">
                      ({formatTonnes(row.emissionTonnes)})
                    </span>
                  </>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-01">
                {valueMode === "absolute" ? (
                  <>
                    {row.tefCount}
                    <span className="text-gray-02 ml-1">
                      ({(row.tefShare * 100).toFixed(0)}%)
                    </span>
                  </>
                ) : (
                  <>
                    {(row.tefShare * 100).toFixed(0)}%
                    <span className="text-gray-02 ml-1">({row.tefCount})</span>
                  </>
                )}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right tabular-nums",
                  Math.abs(row.gap) < 0.05
                    ? "text-gray-02"
                    : row.gap > 0
                      ? "text-blue-03"
                      : "text-orange-03",
                )}
              >
                {row.gap > 0 ? "+" : ""}
                {(row.gap * 100).toFixed(0)} pp
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
