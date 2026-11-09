import { cn } from "@/lib/utils";
import {
  buildMapKpiCompareRows,
  buildTopTefCompareRows,
  compareDeltaTone,
  formatCompareDelta,
  formatMapKpiDisplay,
} from "../lib/map-kpi-compare";
import {
  MAP_KPI_META,
  mapKpiValue,
  tefGroupStrengths,
} from "../lib/explore-aggregates";
import { tefTitleFromShortLabel } from "../lib/tef-framework";
import type {
  ExploreMunicipalityRecord,
  MapGeoLevel,
  MapKpiId,
} from "../lib/explore-types";
import { namesMatch } from "../lib/municipality-names";

export function MapKpiDetailPanel({
  selected,
  compare,
  compareOptions,
  geo,
  kpi,
  tefGroup,
  pickingCompare,
  onPickingCompareChange,
  onCompareNameChange,
}: {
  selected: ExploreMunicipalityRecord;
  compare: ExploreMunicipalityRecord | null;
  compareOptions: ExploreMunicipalityRecord[];
  geo: MapGeoLevel;
  kpi: MapKpiId;
  tefGroup: string;
  pickingCompare: boolean;
  onPickingCompareChange: (picking: boolean) => void;
  onCompareNameChange: (name: string | null) => void;
}) {
  const meta = MAP_KPI_META[kpi];
  const tefGroupFilter = tefGroup === "all" ? null : tefGroup;
  const selectedValue = mapKpiValue(selected, kpi, tefGroupFilter);
  const compareValue = compare
    ? mapKpiValue(compare, kpi, tefGroupFilter)
    : null;
  const rows = buildMapKpiCompareRows(selected, compare, kpi, tefGroupFilter);
  const topTefRows = buildTopTefCompareRows(
    selected.tefHits,
    compare ? compare.tefHits : null,
  );
  const placeLabel = geo === "region" ? "region" : "municipality";

  return (
    <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 p-4 space-y-3">
      <div>
        <div className="text-lg font-semibold text-gray-01">
          {selected.name}
        </div>
        <div className="text-sm text-gray-02">
          {selected.county ?? selected.regionName ?? "Region unknown"}
          {selected.documentTitle ? ` · ${selected.documentTitle}` : ""}
        </div>
      </div>

      <div className="text-sm text-gray-01">
        <span className="text-gray-02">{meta.label}: </span>
        <span className="font-semibold tabular-nums">
          {formatMapKpiDisplay(selectedValue)}
        </span>
        {selectedValue.unit &&
        selectedValue.kind !== "boolean" &&
        selectedValue.unit !== "share" ? (
          <span className="text-gray-02"> {selectedValue.unit}</span>
        ) : null}
        {compare ? (
          <span className="text-gray-02">
            {" "}
            vs <span className="text-amber-02 font-medium">{compare.name}</span>
            :{" "}
            <span className="font-semibold tabular-nums text-gray-01">
              {formatMapKpiDisplay(compareValue)}
            </span>
          </span>
        ) : null}
      </div>

      <CompareControls
        compare={compare}
        compareOptions={compareOptions}
        placeLabel={placeLabel}
        pickingCompare={pickingCompare}
        onPickingCompareChange={onPickingCompareChange}
        onCompareNameChange={onCompareNameChange}
      />

      {compare ? (
        <div className="overflow-hidden rounded-md border border-gray-03/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-03/30 text-xs text-gray-02">
                <th className="text-left font-medium px-2.5 py-2">Metric</th>
                <th className="text-right font-medium px-2.5 py-2 truncate max-w-[6rem]">
                  {selected.name}
                </th>
                <th className="text-right font-medium px-2.5 py-2 truncate max-w-[6rem] text-amber-02">
                  {compare.name}
                </th>
                <th className="text-right font-medium px-2.5 py-2 w-16">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const deltaLabel = formatCompareDelta(row.delta, row.unit);
                const tone = compareDeltaTone(row.delta, row.higherIsBetter);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-03/15 last:border-0"
                  >
                    <td className="px-2.5 py-2 text-gray-02">{row.label}</td>
                    <td className="px-2.5 py-2 text-right tabular-nums text-gray-01 font-medium">
                      {row.primary}
                    </td>
                    <td className="px-2.5 py-2 text-right tabular-nums text-gray-01 font-medium">
                      {row.compare ?? "—"}
                    </td>
                    <td
                      className={cn(
                        "px-2.5 py-2 text-right tabular-nums text-xs font-medium",
                        tone === "better" && "text-green-03",
                        tone === "worse" && "text-pink-03",
                        tone === "neutral" && "text-gray-02",
                      )}
                    >
                      {deltaLabel ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-2.5 py-2 text-[11px] text-gray-02 border-t border-gray-03/20">
            Δ is compare − selected. Green/pink hints assume higher is usually
            better for that metric (plan length is neutral).
          </p>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {rows
            .filter((row) => row.id !== "selectedKpi")
            .map((row) => (
              <Stat key={row.id} label={row.label} value={row.primary} />
            ))}
        </dl>
      )}

      {topTefRows.length > 0 ? (
        <TopTefsSection
          rows={topTefRows}
          selectedName={selected.name}
          compareName={compare?.name ?? null}
        />
      ) : null}

      {tefGroupStrengths(selected.tefHits).length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-gray-02 uppercase">
            TEF groups
          </div>
          {tefGroupStrengths(selected.tefHits).map((group) => (
            <div key={group.group} className="flex items-center gap-2 text-sm">
              <div className="w-28 truncate text-gray-01" title={group.group}>
                {group.group}
              </div>
              <div className="flex-1 h-2 rounded-full bg-gray-03/30">
                <div
                  className="h-2 rounded-full bg-blue-03/80"
                  style={{
                    width: `${Math.round(group.weightedStrength * 100)}%`,
                  }}
                />
              </div>
              <span className="tabular-nums text-xs text-gray-02 w-16 text-right">
                {group.hitCount} · {(group.weightedStrength * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-02 italic">
          No TEF matches in this extract.
        </p>
      )}

      <div className="text-xs text-gray-02">
        Sources: {selected.dataSources.join(", ") || "none"}
      </div>
      {selected.sourceUrl ? (
        <a
          href={selected.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-03 hover:underline"
        >
          Source plan
        </a>
      ) : null}
    </div>
  );
}

function TopTefsSection({
  rows,
  selectedName,
  compareName,
}: {
  rows: ReturnType<typeof buildTopTefCompareRows>;
  selectedName: string;
  compareName: string | null;
}) {
  if (!compareName) {
    return (
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-gray-02 uppercase">
          Top TEFs
        </div>
        <ul className="space-y-1">
          {rows.map((tef) => (
            <li
              key={tef.stableId}
              className="flex items-baseline justify-between gap-2 text-sm"
            >
              <span className="text-gray-01 truncate" title={tef.shortLabel}>
                {tefTitleFromShortLabel(tef.shortLabel)}
              </span>
              <span className="tabular-nums text-xs text-gray-02 shrink-0">
                {tef.primaryHits ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-gray-02 uppercase">
        Top TEFs
      </div>
      <div className="overflow-hidden rounded-md border border-gray-03/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-03/30 text-xs text-gray-02">
              <th className="text-left font-medium px-2.5 py-2">TEF</th>
              <th className="text-right font-medium px-2.5 py-2 truncate max-w-[5.5rem]">
                {selectedName}
              </th>
              <th className="text-right font-medium px-2.5 py-2 truncate max-w-[5.5rem] text-amber-02">
                {compareName}
              </th>
              <th className="text-right font-medium px-2.5 py-2 w-12">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tef) => {
              const deltaLabel = formatCompareDelta(tef.delta, "count");
              const tone = compareDeltaTone(tef.delta, true);
              return (
                <tr
                  key={tef.stableId}
                  className="border-b border-gray-03/15 last:border-0"
                >
                  <td
                    className="px-2.5 py-2 text-gray-01 truncate max-w-[10rem]"
                    title={tef.shortLabel}
                  >
                    {tefTitleFromShortLabel(tef.shortLabel)}
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-gray-01 font-medium">
                    {tef.primaryHits ?? "—"}
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-gray-01 font-medium">
                    {tef.compareHits ?? "—"}
                  </td>
                  <td
                    className={cn(
                      "px-2.5 py-2 text-right tabular-nums text-xs font-medium",
                      tone === "better" && "text-green-03",
                      tone === "worse" && "text-pink-03",
                      tone === "neutral" && "text-gray-02",
                    )}
                  >
                    {deltaLabel ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-2.5 py-1.5 text-[11px] text-gray-02 border-t border-gray-03/20">
          Union of each place&apos;s top TEFs by hit count (up to 3 each).
        </p>
      </div>
    </div>
  );
}

function CompareControls({
  compare,
  compareOptions,
  placeLabel,
  pickingCompare,
  onPickingCompareChange,
  onCompareNameChange,
}: {
  compare: ExploreMunicipalityRecord | null;
  compareOptions: ExploreMunicipalityRecord[];
  placeLabel: string;
  pickingCompare: boolean;
  onPickingCompareChange: (picking: boolean) => void;
  onCompareNameChange: (name: string | null) => void;
}) {
  const selectValue =
    compareOptions.find((r) =>
      compare ? namesMatch(r.name, compare.name) : false,
    )?.name ?? "";

  return (
    <div className="rounded-md border border-dashed border-gray-03/40 bg-gray-05/40 px-3 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-02">
          Compare KPI details
        </div>
        {compare || pickingCompare ? (
          <button
            type="button"
            onClick={() => {
              onCompareNameChange(null);
              onPickingCompareChange(false);
            }}
            className="text-xs text-gray-02 hover:text-gray-01 underline-offset-2 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={selectValue}
          onChange={(e) => {
            const value = e.target.value;
            onPickingCompareChange(false);
            onCompareNameChange(value || null);
          }}
          className="flex-1 min-w-[10rem] text-sm bg-gray-05 border border-gray-03/50 text-gray-01 rounded px-2.5 py-1.5"
          aria-label={`Compare with another ${placeLabel}`}
        >
          <option value="">Choose a {placeLabel}…</option>
          {compareOptions.map((record) => (
            <option key={record.id} value={record.name}>
              {record.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPickingCompareChange(!pickingCompare)}
          className={cn(
            "text-sm px-2.5 py-1.5 rounded-md border shrink-0",
            pickingCompare
              ? "border-amber-03/60 bg-amber-03/15 text-amber-01"
              : "border-gray-03/50 text-gray-01 hover:bg-gray-03/30",
          )}
        >
          {pickingCompare ? "Click map…" : "Pick on map"}
        </button>
      </div>
      {pickingCompare ? (
        <p className="text-xs text-amber-02">
          Click another {placeLabel} on the map to compare against{" "}
          <span className="font-medium">the selection</span>. The next click
          sets the compare target, not the primary place.
        </p>
      ) : compare ? (
        <p className="text-xs text-gray-02">
          Side-by-side metrics for the selected map KPI and the detail stats.
          Compare outline on the map is amber.
        </p>
      ) : (
        <p className="text-xs text-gray-02">
          Pick another {placeLabel} to line up the same KPI detail fields.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-05/50 border border-gray-03/20 px-2.5 py-2">
      <div className="text-xs text-gray-02">{label}</div>
      <div className="text-gray-01 font-medium tabular-nums">{value}</div>
    </div>
  );
}
