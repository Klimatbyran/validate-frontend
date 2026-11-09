import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MapKpiDetailPanel } from "./MapKpiDetailPanel";
import type { ExploreMunicipalityRecord } from "../lib/explore-types";
import type { Measure as MeasureRow } from "../lib/measures-types";

function measure(score = 5): MeasureRow {
  return {
    measure_text: "Buy buses",
    activity: "road transport",
    activity_shift_score: score,
    activity_shifts: [
      {
        activity: "commuting",
        shift_from: "car",
        shift_to: "bus",
        need: "mobility",
        type: "Type Shift",
        type_reasoning: "",
        score,
        reasoning: "",
        transition_element_matches: [
          {
            stable_id: "t1",
            short_label: "T-1 - Bus",
            description: "Bus",
            sector_path: "Transport > Road",
            match_confidence: "high",
            explicit: true,
          },
        ],
        transition_element_candidates: [],
      },
    ],
    intervention_who: "municipality",
    intervention_when: "2026",
    intervention_what: "bus",
    intervention_how: "procurement",
    intervention_score: score + 1,
    intervention_reasoning: "",
    intervention_type: "direct",
  };
}

function record(
  partial: Partial<ExploreMunicipalityRecord>,
): ExploreMunicipalityRecord {
  return {
    id: "nassjo",
    name: "Nässjö",
    regionName: "Jönköping",
    measures: [measure(5)],
    commitmentCount: 4,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: 3,
    climateCommitmentGroupCount: 2,
    adaptationCommitmentCount: 1,
    ownCommitmentCount: 2,
    companionReferenceCount: 0,
    markdownChars: 9000,
    tefHits: [
      {
        stableId: "t1",
        shortLabel: "T-1 - Bus",
        sectorPath: "Transport > Road",
        group: "Transport",
        confidence: "high",
        measureText: "Buy buses",
        description: "Bus",
        explicit: true,
        shiftFrom: "car",
        shiftTo: "bus",
        need: "mobility",
        shiftScore: 5,
        interventionWho: "municipality",
        interventionWhat: "bus",
        interventionHow: "procurement",
        interventionScore: 6,
      },
    ],
    documentTitle: "Klimatplan",
    adoptedYear: 2024,
    sourceUrl: "https://example.com/plan.pdf",
    county: "Jönköping",
    dataSources: ["pipeline-commitments"],
    ...partial,
  };
}

describe("MapKpiDetailPanel compare", () => {
  const primary = record({});
  const secondary = record({
    id: "vetlanda",
    name: "Vetlanda",
    commitmentCount: 7,
    climateRelevantCommitmentCount: 5,
    measures: [measure(3)],
    tefHits: [
      {
        stableId: "t2",
        shortLabel: "T-2 - Steel",
        sectorPath: "Industry > Steel",
        group: "Industry",
        confidence: "high",
        measureText: "Steel",
        description: "Steel",
        explicit: true,
        shiftFrom: "coal",
        shiftTo: "electric",
        need: "materials",
        shiftScore: 4,
        interventionWho: "industry",
        interventionWhat: "furnace",
        interventionHow: "grant",
        interventionScore: 5,
      },
      {
        stableId: "t2",
        shortLabel: "T-2 - Steel",
        sectorPath: "Industry > Steel",
        group: "Industry",
        confidence: "high",
        measureText: "Steel",
        description: "Steel",
        explicit: true,
        shiftFrom: "coal",
        shiftTo: "electric",
        need: "materials",
        shiftScore: 4,
        interventionWho: "industry",
        interventionWhat: "furnace",
        interventionHow: "grant",
        interventionScore: 5,
      },
    ],
  });

  it("shows compare controls and switches to a side-by-side table", async () => {
    const user = userEvent.setup();
    const onCompareNameChange = vi.fn();
    const onPickingCompareChange = vi.fn();

    const { rerender } = render(
      <MapKpiDetailPanel
        selected={primary}
        compare={null}
        compareOptions={[secondary]}
        geo="municipality"
        kpi="uniqueCommitments"
        tefGroup="all"
        pickingCompare={false}
        onPickingCompareChange={onPickingCompareChange}
        onCompareNameChange={onCompareNameChange}
      />,
    );

    expect(screen.getByText("Compare KPI details")).toBeInTheDocument();
    expect(screen.getByText("Extracted commitments")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Δ" })).toBeNull();

    await user.selectOptions(
      screen.getByLabelText("Compare with another municipality"),
      "Vetlanda",
    );
    expect(onCompareNameChange).toHaveBeenCalledWith("Vetlanda");

    rerender(
      <MapKpiDetailPanel
        selected={primary}
        compare={secondary}
        compareOptions={[secondary]}
        geo="municipality"
        kpi="uniqueCommitments"
        tefGroup="all"
        pickingCompare={false}
        onPickingCompareChange={onPickingCompareChange}
        onCompareNameChange={onCompareNameChange}
      />,
    );

    expect(screen.getAllByRole("columnheader", { name: "Δ" }).length).toBe(2);
    expect(
      screen.getAllByRole("columnheader", { name: "Vetlanda" }).length,
    ).toBe(2);
    expect(screen.getAllByText("+3").length).toBeGreaterThan(0);
    expect(screen.getByText(/vs/)).toBeInTheDocument();
    expect(screen.getByText("Top TEFs")).toBeInTheDocument();
    expect(screen.getByText("Bus")).toBeInTheDocument();
    expect(screen.getByText("Steel")).toBeInTheDocument();
  });

  it("toggles pick-on-map mode", async () => {
    const user = userEvent.setup();
    const onPickingCompareChange = vi.fn();

    render(
      <MapKpiDetailPanel
        selected={primary}
        compare={null}
        compareOptions={[secondary]}
        geo="municipality"
        kpi="uniqueCommitments"
        tefGroup="all"
        pickingCompare={false}
        onPickingCompareChange={onPickingCompareChange}
        onCompareNameChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick on map" }));
    expect(onPickingCompareChange).toHaveBeenCalledWith(true);
  });
});
