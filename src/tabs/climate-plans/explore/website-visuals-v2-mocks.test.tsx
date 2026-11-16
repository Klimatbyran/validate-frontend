import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MunicipalityDetailV2 } from "./website-visuals-v2-mocks";
import { buildWebsiteV2PlaceBundle } from "../lib/website-v2-kpis";
import {
  WEBSITE_V2_DEMO_EMISSIONS,
  WEBSITE_V2_DEMO_RECORDS,
} from "../lib/website-v2-demo-fixture";

describe("Website visuals v2 detail mock", () => {
  it("renders concreteness, emissions bars, and expandable catalogue", async () => {
    const user = userEvent.setup();
    const bundle = buildWebsiteV2PlaceBundle(
      WEBSITE_V2_DEMO_RECORDS[0]!,
      WEBSITE_V2_DEMO_EMISSIONS,
    );
    render(<MunicipalityDetailV2 bundle={bundle} />);

    expect(screen.getByText("Umeå")).toBeInTheDocument();
    expect(
      screen.getByText(/Volume only — not a quality ranking/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/How to read these three views together/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Specification \(primary\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Framework directness/i).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(/Combined \(internal comparison\)/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Actions found|None found/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/How we estimate plan action detail/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/How this yes \/ partly \/ not really is decided/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Show details/i }));
    expect(screen.getByRole("button", { name: "By sector" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "By activity flow" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "Flat list" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "By activity flow" }));
    expect(
      screen.getByRole("button", { name: "By activity flow" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText(/Grouped by extracted activity shifts/i),
    ).toBeInTheDocument();
    // Group heading + per-card chips share the same from→to label.
    expect(screen.getAllByText("diesel → ev").length).toBeGreaterThan(1);
    expect(
      screen.getAllByText("Activity shift", { exact: true }).length,
    ).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: "Themes named directly" }),
    );
    expect(
      screen.queryByRole("button", { name: "By activity flow" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By sector" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/Group themes/i)).toBeInTheDocument();
    expect(screen.getByText(/STE-42/i)).toBeInTheDocument();
    expect(
      screen.getByText(/T-1A1b-TE-1 - Electric buses/i),
    ).toBeInTheDocument();
  });
});
