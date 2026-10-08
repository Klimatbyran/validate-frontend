import { describe, expect, it } from "vitest";
import {
  buildTefFrameworkCells,
  cellMetricValue,
  filterHitsByScope,
  groupCellsBySector,
  parseTefIndex,
  sectorIdFromIndex,
  tefTitleFromShortLabel,
  type TefHitWithPlace,
} from "./tef-framework";

function hit(
  partial: Partial<TefHitWithPlace> &
    Pick<TefHitWithPlace, "stableId" | "shortLabel" | "municipalityName">,
): TefHitWithPlace {
  return {
    sectorPath: "Transport > Mobility > Road > Light Duty Vehicles",
    group: "Transport",
    confidence: "high",
    measureText: "example measure",
    municipalityId: partial.municipalityName.toLowerCase(),
    regionName: "Jönköping",
    ...partial,
  };
}

describe("TEF index parsing", () => {
  it("pulls the catalogue index and title from short_label", () => {
    expect(parseTefIndex("T-1A1a-TE-6 - Shift from car to railway")).toBe(
      "T-1A1a-TE-6",
    );
    expect(
      tefTitleFromShortLabel("T-1A1a-TE-6 - Shift from car to railway"),
    ).toBe("Shift from car to railway");
    expect(sectorIdFromIndex("T-4B1b-TE-1")).toBe("buildings");
    expect(sectorIdFromIndex("T-6A1-TE-2")).toBe("waste");
  });
});

describe("TEF framework aggregation", () => {
  it("filters by municipality and region scope", () => {
    const hits = [
      hit({
        stableId: "a",
        shortLabel: "T-1A1a-TE-1 - Electric cars",
        municipalityName: "Nässjö",
        regionName: "Jönköping",
      }),
      hit({
        stableId: "b",
        shortLabel: "T-4B1b-TE-1 - District heating",
        municipalityName: "Alingsås",
        regionName: "Västra Götaland",
        group: "Buildings",
        sectorPath: "Buildings > Non Residential > Hvac",
      }),
    ];
    expect(filterHitsByScope(hits, "municipality", "Nässjö")).toHaveLength(1);
    expect(filterHitsByScope(hits, "region", "Jönköping")).toHaveLength(1);
    expect(filterHitsByScope(hits, "all", null)).toHaveLength(2);
  });

  it("builds sector columns with hit and strength metrics", () => {
    const hits = [
      hit({
        stableId: "rail",
        shortLabel: "T-1A1a-TE-6 - Shift from car to railway",
        municipalityName: "Nässjö",
        confidence: "high",
      }),
      hit({
        stableId: "rail",
        shortLabel: "T-1A1a-TE-6 - Shift from car to railway",
        municipalityName: "Jönköping",
        confidence: "mid",
      }),
      hit({
        stableId: "waste",
        shortLabel: "T-6A1-TE-1 - Shift to recycling of solid waste",
        municipalityName: "Nässjö",
        group: "Waste",
        sectorPath: "Waste > Solids > Solid Waste Disposal",
        confidence: "high",
      }),
    ];
    const cells = buildTefFrameworkCells(hits);
    expect(cells).toHaveLength(2);
    const rail = cells.find((c) => c.stableId === "rail");
    expect(rail?.hitCount).toBe(2);
    expect(rail?.municipalityCount).toBe(2);
    expect(rail?.sectorId).toBe("transport");
    expect(cellMetricValue(rail!, "hits")).toBe(2);
    expect(cellMetricValue(rail!, "strength")).toBeCloseTo((3 + 2) / 6);

    const columns = groupCellsBySector(cells);
    expect(columns.find((c) => c.sectorId === "transport")?.cells).toHaveLength(
      1,
    );
    expect(columns.find((c) => c.sectorId === "waste")?.cells).toHaveLength(1);
    expect(columns.find((c) => c.sectorId === "industry")?.cells).toHaveLength(
      0,
    );
  });
});
