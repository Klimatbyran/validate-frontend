import { describe, expect, it } from "vitest";
import { resolveOrigin } from "./data-point-metadata";

describe("resolveOrigin", () => {
  it("matches Editor isAIGenerated for null metadata", () => {
    expect(resolveOrigin(null)).toBe("verified");
  });

  it("treats Garbo-produced values as AI-generated", () => {
    expect(
      resolveOrigin({
        verifiedBy: null,
        user: { name: "Garbo (Klimatkollen)" },
      }),
    ).toBe("ai");
  });

  it("treats a human verifier as manually validated", () => {
    expect(
      resolveOrigin({
        verifiedBy: { name: "Reviewer" },
        user: { name: "Reviewer" },
      }),
    ).toBe("verified");
  });
});
