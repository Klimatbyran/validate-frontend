import { describe, expect, it } from "vitest";
import { resolveTefIconKind } from "./tef-icon-kind";

describe("resolveTefIconKind", () => {
  it("maps common TEF titles to topic icons", () => {
    expect(resolveTefIconKind("Shift to electric cars")).toBe("car");
    expect(resolveTefIconKind("Shift from car to railway")).toBe("train");
    expect(resolveTefIconKind("Shift to walking and cycling")).toBe("bike");
    expect(resolveTefIconKind("Electricity from wind onshore")).toBe("wind");
    expect(resolveTefIconKind("Electricity from solar parks")).toBe("solar");
    expect(resolveTefIconKind("Shift to recycling of solid waste")).toBe(
      "recycle",
    );
    expect(resolveTefIconKind("Shift to heat pumps in public buildings")).toBe(
      "heatPump",
    );
    expect(
      resolveTefIconKind("Shift to electricity in iron and steel industries"),
    ).toBe("factory");
    expect(
      resolveTefIconKind(
        "Shift to electrolysis of water for hydrogen production",
      ),
    ).toBe("hydrogen");
  });

  it("handles stem forms without requiring a trailing word boundary", () => {
    expect(resolveTefIconKind("Shift to district heating")).toBe(
      "districtEnergy",
    );
    expect(
      resolveTefIconKind(
        "Shift to district cooling in single-family buildings",
      ),
    ).toBe("districtEnergy");
    expect(resolveTefIconKind("Shift to recycling")).toBe("recycle");
    expect(resolveTefIconKind("Shift to composting of organic waste")).toBe(
      "recycle",
    );
    expect(resolveTefIconKind("Electricity from hydropower")).toBe("hydro");
    expect(resolveTefIconKind("Electricity from hydro reservoir")).toBe(
      "hydro",
    );
  });

  it("prefers fossil-free / renewable over bare fossil", () => {
    expect(
      resolveTefIconKind("Shift to fossil-free electricity generation"),
    ).toBe("renewable");
    expect(resolveTefIconKind("Shift to fossil free electricity")).toBe(
      "renewable",
    );
    expect(
      resolveTefIconKind("shift_to_fossil_free_electricity_generation"),
    ).toBe("renewable");
    expect(resolveTefIconKind("Electricity from coal power plants")).toBe(
      "fossil",
    );
  });

  it("maps aviation titles and paths to plane, not car", () => {
    expect(
      resolveTefIconKind(
        "More efficient passenger airplanes",
        "Transport > Mobility > Aviation",
      ),
    ).toBe("plane");
    expect(
      resolveTefIconKind("Shift to electric air passenger transport"),
    ).toBe("plane");
    expect(
      resolveTefIconKind("Unknown measure", "Transport > Mobility > Aviation"),
    ).toBe("plane");
  });

  it("does not treat bare air or hydrogen as plane/hydro", () => {
    expect(resolveTefIconKind("Cleaner air in cities")).toBe("generic");
    expect(resolveTefIconKind("Shift to hydrogen cars")).toBe("car");
  });

  it("falls back to sector path when the title is opaque", () => {
    expect(
      resolveTefIconKind(
        "Unknown measure",
        "Waste > Solids > Solid Waste Disposal",
      ),
    ).toBe("recycle");
    expect(
      resolveTefIconKind("Unknown measure", "Transport > Mobility > Road"),
    ).toBe("car");
    expect(
      resolveTefIconKind(
        "Unknown measure",
        "Energy > Energy Supply > Electricity",
      ),
    ).toBe("grid");
  });

  it("uses generic when nothing matches", () => {
    expect(resolveTefIconKind("xyzzy", "Mystery > Other")).toBe("generic");
  });
});
