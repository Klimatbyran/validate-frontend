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
    expect(resolveTefIconKind("Shift to electrolysis of water for hydrogen production")).toBe(
      "hydrogen",
    );
  });

  it("falls back to sector path when the title is opaque", () => {
    expect(
      resolveTefIconKind("shift_to_fossil_free_electricity_generation", "Energy > Energy Supply > Electricity"),
    ).toBe("renewable");
    expect(
      resolveTefIconKind("Unknown measure", "Waste > Solids > Solid Waste Disposal"),
    ).toBe("recycle");
    expect(
      resolveTefIconKind("Unknown measure", "Transport > Mobility > Road"),
    ).toBe("car");
  });

  it("uses generic when nothing matches", () => {
    expect(resolveTefIconKind("xyzzy", "Mystery > Other")).toBe("generic");
  });
});
