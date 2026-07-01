import { describe, expect, it } from "vitest";
import {
  formatRegistryOptionLabel,
  truncateUrl,
} from "./registry-report-display";

describe("registry-report-display", () => {
  it("truncates long URLs for dropdown labels", () => {
    const long = `https://example.com/${"a".repeat(80)}`;
    expect(truncateUrl(long, 20).endsWith("…")).toBe(true);
  });

  it("formats registry option with year and URL", () => {
    expect(
      formatRegistryOptionLabel(
        {
          reportYear: "2024",
          url: "https://example.com/report.pdf",
        },
        "No year",
      ),
    ).toBe("2024 · https://example.com/report.pdf");
  });
});
