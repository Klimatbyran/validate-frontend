import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  GicsTreeSelect,
  gicsPanelSize,
  gicsRowNaturalWidth,
} from "./gics-tree-select";

const LONG_NAME =
  "Independent Power Producers & Energy Traders";
const LONG_OPTION_LABEL = `${LONG_NAME} (55105020)`;

describe("gicsRowNaturalWidth / gicsPanelSize", () => {
  it("sizes the panel wider than the default min width for a long industry name", () => {
    const rowWidth = gicsRowNaturalWidth({
      kind: "option",
      depth: 3,
      label: LONG_OPTION_LABEL,
    });
    expect(rowWidth).toBeGreaterThan(280);

    const { width } = gicsPanelSize({
      triggerLeft: 40,
      triggerWidth: 160,
      minWidth: 280,
      rowNaturalWidths: [rowWidth],
      viewportWidth: 1280,
    });

    expect(width).toBeGreaterThan(280);
    expect(width).toBeGreaterThanOrEqual(rowWidth);
    expect(width).toBeLessThanOrEqual(1280);
  });

  it("clamps to the viewport and shifts left so the panel stays on screen", () => {
    const { width, left } = gicsPanelSize({
      triggerLeft: 900,
      triggerWidth: 160,
      minWidth: 280,
      rowNaturalWidths: [640],
      viewportWidth: 1024,
    });

    expect(width).toBeLessThanOrEqual(1024 - 16);
    expect(left + width).toBeLessThanOrEqual(1024 - 8);
    expect(left).toBeGreaterThanOrEqual(8);
  });
});

describe("GicsTreeSelect", () => {
  it("opens a dropdown wide enough to show the full industry name without a horizontal scrollbar", async () => {
    const user = userEvent.setup();
    render(
      <GicsTreeSelect
        options={[
          {
            code: "55105020",
            label: LONG_NAME,
            sector: "Utilities",
            group:
              "Independent Power and Renewable Electricity Producers",
            industry: LONG_NAME,
          },
        ]}
        value=""
        onChange={vi.fn()}
        placeholder="Select industry"
        emptyLabel="No industry"
        searchPlaceholder="Search"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Select industry" }),
    );

    const option = await screen.findByRole("option", {
      name: LONG_OPTION_LABEL,
    });
    expect(option).toHaveTextContent(LONG_OPTION_LABEL);

    const label = option.querySelector("span:last-child");
    expect(label).toBeTruthy();
    expect(label?.className).not.toMatch(/overflow-x-auto/);
    expect(label?.className).not.toMatch(/truncate/);

    const panel = screen.getByRole("listbox");
    expect(panel.className).toMatch(/overflow-x-hidden/);
    expect(panel.className).not.toMatch(/overflow-x-auto/);
    const width = Number.parseFloat(panel.style.width);
    expect(width).toBeGreaterThan(280);
  });
});
