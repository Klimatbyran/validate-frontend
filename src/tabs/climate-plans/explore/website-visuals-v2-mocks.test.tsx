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
      screen.getByText(/Climate actions in the plan \(duplicates removed\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Has actions|No actions/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/How we estimate plan action detail/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Show details/i }));
    await user.click(screen.getByRole("button", { name: "Matched themes" }));
    expect(screen.getByText(/STE-42/i)).toBeInTheDocument();
    expect(
      screen.getByText(/T-1A1b-TE-1 - Electric buses/i),
    ).toBeInTheDocument();
  });
});
