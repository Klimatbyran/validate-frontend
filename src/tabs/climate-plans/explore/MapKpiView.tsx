import { useMemo, useState } from "react";
import { MethodologyPanel } from "./MethodologyPanel";
import { MapKpiDetailPanel } from "./MapKpiDetailPanel";
import { SwedenChoropleth } from "./SwedenChoropleth";
import { TefImpliedFilterControl } from "./TefImpliedFilterControl";
import {
  MAP_KPI_META,
  mapKpiValue,
  mergeRegionRecords,
} from "../lib/explore-aggregates";
import type {
  ExploreMunicipalityRecord,
  MapGeoLevel,
  MapKpiId,
  SectorYearEmissions,
} from "../lib/explore-types";
import {
  countImpliedFilterBuckets,
  filterTefHits,
  hasExplicitJudgment,
  type TefImpliedFilter,
} from "../lib/tef-detail-summary";
import { cn } from "@/lib/utils";
import { foldRegionName, namesMatch } from "../lib/municipality-names";

const KPI_IDS = Object.keys(MAP_KPI_META) as MapKpiId[];

function withFilteredTefHits(
  record: ExploreMunicipalityRecord,
  impliedFilter: TefImpliedFilter,
): ExploreMunicipalityRecord {
  if (impliedFilter === "all") return record;
  return {
    ...record,
    tefHits: filterTefHits(record.tefHits, impliedFilter),
  };
}

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
  compareName,
  onCompareNameChange,
  tefImplied,
  onTefImpliedChange,
  sectorEmissions,
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
  compareName: string | null;
  onCompareNameChange: (name: string | null) => void;
  tefImplied: TefImpliedFilter;
  onTefImpliedChange: (value: TefImpliedFilter) => void;
  sectorEmissions: SectorYearEmissions[];
}) {
  const [pickingCompare, setPickingCompare] = useState(false);

  const allTefHits = useMemo(
    () => records.flatMap((record) => record.tefHits),
    [records],
  );
  const showImpliedFilter = hasExplicitJudgment(allTefHits);
  const impliedCounts = useMemo(
    () => countImpliedFilterBuckets(allTefHits),
    [allTefHits],
  );

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const record of records) {
      for (const hit of filterTefHits(record.tefHits, tefImplied)) {
        set.add(hit.group);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [records, tefImplied]);

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

  const activeRecords = useMemo(() => {
    const base = geo === "region" ? regionRecords : records;
    return base.map((record) => withFilteredTefHits(record, tefImplied));
  }, [geo, regionRecords, records, tefImplied]);

  const values = useMemo(() => {
    const map = new Map<string, number | boolean | null>();
    for (const record of activeRecords) {
      const value = mapKpiValue(
        record,
        kpi,
        tefGroup === "all" ? null : tefGroup,
        sectorEmissions,
      );
      map.set(
        record.name,
        value.kind === "boolean" ? value.booleanValue : value.numeric,
      );
    }
    return map;
  }, [activeRecords, kpi, tefGroup, sectorEmissions]);

  const selected = (() => {
    const fromActive = activeRecords.find((r) =>
      namesMatch(r.name, selectedName ?? ""),
    );
    if (fromActive) return fromActive;
    const fromMunicipalities = records.find((r) =>
      namesMatch(r.name, selectedName ?? ""),
    );
    return fromMunicipalities
      ? withFilteredTefHits(fromMunicipalities, tefImplied)
      : null;
  })();

  const compare =
    compareName == null
      ? null
      : (activeRecords.find((r) => namesMatch(r.name, compareName)) ?? null);

  const compareOptions = useMemo(() => {
    if (!selected) return activeRecords;
    return activeRecords
      .filter((r) => !namesMatch(r.name, selected.name))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }, [activeRecords, selected]);

  const meta = MAP_KPI_META[kpi];

  function handleMapSelect(name: string) {
    if (pickingCompare) {
      if (selected && namesMatch(name, selected.name)) {
        setPickingCompare(false);
        return;
      }
      onCompareNameChange(name);
      setPickingCompare(false);
      return;
    }
    if (compare && namesMatch(name, compare.name)) {
      onCompareNameChange(null);
    }
    onSelectName(name);
  }

  function handleGeoChange(level: MapGeoLevel) {
    setPickingCompare(false);
    onCompareNameChange(null);
    onGeoChange(level);
  }

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
                onClick={() => handleGeoChange(level)}
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
          {showImpliedFilter ? (
            <TefImpliedFilterControl
              value={tefImplied}
              onChange={onTefImpliedChange}
              counts={impliedCounts}
            />
          ) : null}
        </div>
        <SwedenChoropleth
          geo={geo}
          values={values}
          selectedName={selectedName}
          compareName={compare?.name ?? compareName}
          onSelect={handleMapSelect}
          booleanScale={false}
        />
        <p className="text-xs text-gray-02">
          Boundaries: simplified Valmyndigheten polygons via
          okfse/sweden-geojson. Grey means we have not extracted a plan for that{" "}
          {geo} yet.
          {showImpliedFilter
            ? " TEF match filter applies to TEF-derived map colours and detail TEF sections (not commitment / measure scores)."
            : null}
          {pickingCompare
            ? " Compare pick is active — next map click sets the amber compare target."
            : null}
        </p>
      </div>

      <div className="space-y-3">
        <MethodologyPanel data={meta.data} calculation={meta.calculation} />
        {selected ? (
          <MapKpiDetailPanel
            selected={selected}
            compare={compare}
            compareOptions={compareOptions}
            geo={geo}
            kpi={kpi}
            tefGroup={tefGroup}
            pickingCompare={pickingCompare}
            onPickingCompareChange={setPickingCompare}
            onCompareNameChange={onCompareNameChange}
            sectorEmissions={sectorEmissions}
          />
        ) : (
          <p className="text-sm text-gray-02 rounded-lg border border-gray-03/30 bg-gray-04/40 p-4">
            Click a municipality or region. Places without an extract stay grey
            — useful while only Jönköping-län plans are in the pipeline. Once
            selected, use Compare KPI details to line up another place.
          </p>
        )}
      </div>
    </div>
  );
}
