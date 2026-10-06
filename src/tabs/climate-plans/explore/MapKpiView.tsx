import { useMemo } from "react";
import { MethodologyPanel } from "./MethodologyPanel";
import { SwedenChoropleth } from "./SwedenChoropleth";
import {
  MAP_KPI_META,
  mapKpiValue,
  mergeRegionRecords,
  tefGroupStrengths,
} from "../lib/explore-aggregates";
import type {
  ExploreMunicipalityRecord,
  MapGeoLevel,
  MapKpiId,
} from "../lib/explore-types";
import { cn } from "@/lib/utils";
import { foldRegionName, namesMatch } from "../lib/municipality-names";

const KPI_IDS = Object.keys(MAP_KPI_META) as MapKpiId[];

export function MapKpiView({
  records,
  geo,
  onGeoChange,
  kpi,
  onKpiChange,
  tefGroup,
  onTefGroupChange,
  selectedName,
  onSelectName,
}: {
  records: ExploreMunicipalityRecord[];
  geo: MapGeoLevel;
  onGeoChange: (geo: MapGeoLevel) => void;
  kpi: MapKpiId;
  onKpiChange: (kpi: MapKpiId) => void;
  tefGroup: string;
  onTefGroupChange: (group: string) => void;
  selectedName: string | null;
  onSelectName: (name: string) => void;
}) {
  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const record of records) {
      for (const hit of record.tefHits) set.add(hit.group);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [records]);

  const regionRecords = useMemo(() => {
    const byRegion = new Map<string, ExploreMunicipalityRecord[]>();
    for (const record of records) {
      const region = record.regionName ?? record.county;
      if (!region) continue;
      const key = foldRegionName(region);
      const list = byRegion.get(key) ?? [];
      list.push(record);
      byRegion.set(key, list);
    }
    return [...byRegion.values()].map((list) =>
      mergeRegionRecords(
        list,
        list[0].regionName ?? list[0].county ?? list[0].name,
      ),
    );
  }, [records]);

  const activeRecords = geo === "region" ? regionRecords : records;

  const values = useMemo(() => {
    const map = new Map<string, number | boolean | null>();
    for (const record of activeRecords) {
      const value = mapKpiValue(
        record,
        kpi,
        tefGroup === "all" ? null : tefGroup,
      );
      map.set(
        record.name,
        value.kind === "boolean" ? value.booleanValue : value.numeric,
      );
    }
    return map;
  }, [activeRecords, kpi, tefGroup]);

  const selected =
    activeRecords.find((r) => namesMatch(r.name, selectedName ?? "")) ??
    records.find((r) => namesMatch(r.name, selectedName ?? "")) ??
    null;

  const meta = MAP_KPI_META[kpi];
  const selectedValue = selected
    ? mapKpiValue(selected, kpi, tefGroup === "all" ? null : tefGroup)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] gap-4 items-start">
      <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={kpi}
            onChange={(e) => onKpiChange(e.target.value as MapKpiId)}
            className="text-sm bg-gray-05 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
          >
            {KPI_IDS.map((id) => (
              <option key={id} value={id}>
                {MAP_KPI_META[id].label}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg overflow-hidden border border-gray-03/40 text-sm">
            {(["municipality", "region"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onGeoChange(level)}
                className={cn(
                  "px-3 py-2 capitalize",
                  geo === level
                    ? "bg-gray-03/50 text-gray-01"
                    : "text-gray-02 hover:text-gray-01",
                )}
              >
                {level}
              </button>
            ))}
          </div>
          {kpi === "tefGroupStrength" ? (
            <select
              value={tefGroup}
              onChange={(e) => onTefGroupChange(e.target.value)}
              className="text-sm bg-gray-05 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
            >
              <option value="all">All TEF groups</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <SwedenChoropleth
          geo={geo}
          values={values}
          selectedName={selectedName}
          onSelect={onSelectName}
          booleanScale={
            kpi === "hasQuantifiedTargets" || kpi === "parisMentioned"
          }
        />
        <p className="text-xs text-gray-02">
          Boundaries: simplified Valmyndigheten polygons via
          okfse/sweden-geojson. Grey means we have not extracted a plan for that{" "}
          {geo} yet.
        </p>
      </div>

      <div className="space-y-3">
        <MethodologyPanel data={meta.data} calculation={meta.calculation} />
        {selected ? (
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
                {selectedValue?.kind === "boolean"
                  ? selectedValue.booleanValue == null
                    ? "—"
                    : selectedValue.booleanValue
                      ? "yes"
                      : "no"
                  : selectedValue?.numeric == null
                    ? "—"
                    : selectedValue.numeric.toFixed(
                        selectedValue.numeric >= 10 ||
                          Number.isInteger(selectedValue.numeric)
                          ? 0
                          : 2,
                      )}
              </span>
              {selectedValue?.unit ? (
                <span className="text-gray-02"> {selectedValue.unit}</span>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Stat
                label="Commitments"
                value={String(selected.commitmentCount)}
              />
              <Stat label="Goals" value={String(selected.goals.length)} />
              <Stat
                label="Distinct TEFs"
                value={String(
                  new Set(selected.tefHits.map((h) => h.stableId)).size,
                )}
              />
              <Stat
                label="Plan length"
                value={
                  selected.markdownChars == null
                    ? "—"
                    : `${selected.markdownChars.toLocaleString()} chars (~${Math.max(1, Math.round(selected.markdownChars / 3000))} p.)`
                }
              />
            </dl>
            {tefGroupStrengths(selected.tefHits).length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-gray-02 uppercase">
                  TEF groups
                </div>
                {tefGroupStrengths(selected.tefHits).map((group) => (
                  <div
                    key={group.group}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div
                      className="w-28 truncate text-gray-01"
                      title={group.group}
                    >
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
                      {group.hitCount} ·{" "}
                      {(group.weightedStrength * 100).toFixed(0)}%
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
        ) : (
          <p className="text-sm text-gray-02 rounded-lg border border-gray-03/30 bg-gray-04/40 p-4">
            Click a municipality or region. Places without an extract stay grey
            — useful while only Jönköping-län plans are in the pipeline.
          </p>
        )}
      </div>
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
