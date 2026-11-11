import { describe, expect, it } from "vitest";
import {
  classifyCatalogueTefHit,
  filterHitsBySource,
  isCatalogueProposedTef,
  parseSteIndex,
  runtimeShadowStableId,
} from "./tef-hit-source";

describe("tef hit source classification", () => {
  it("marks STE catalogue shadows as proposed", () => {
    expect(
      isCatalogueProposedTef({
        stableId: "shadow_ste001_compact",
        shortLabel: "STE-001 - Compact development",
        sectorPath: "Shadow Proposals > Unclassified",
      }),
    ).toBe(true);
    expect(
      classifyCatalogueTefHit({
        stableId: "shadow_ste002_biogas",
        shortLabel: "STE-002 - Biogas production",
        sectorPath: "Energy > Energy Supply > Biogas",
      }),
    ).toBe("proposed");
    expect(parseSteIndex("STE-002 - Biogas production")).toBe("STE-002");
  });

  it("keeps ordinary catalogue TEFs as official", () => {
    expect(
      classifyCatalogueTefHit({
        stableId: "shift_to_electric_vehicles",
        shortLabel: "T-1A1a-TE-1 - Shift to electric cars",
        sectorPath: "Transport > Mobility > Road",
      }),
    ).toBe("official");
  });

  it("filters by source and builds runtime shadow ids", () => {
    const hits = [
      { source: "official" as const },
      { source: "proposed" as const },
      { source: "runtime-shadow" as const },
    ];
    expect(filterHitsBySource(hits, "proposed")).toHaveLength(1);
    expect(runtimeShadowStableId("abc")).toBe("runtime-shadow:abc");
  });
});
