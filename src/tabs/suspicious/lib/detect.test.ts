import { describe, expect, it } from "vitest";
import type { SuspicionRuleId } from "../types";
import { scanForSuspiciousData } from "./detect";
import { makeCompany, makePeerGroup } from "./test-fixtures";

function rulesFor(
  companies: Parameters<typeof scanForSuspiciousData>[0],
  companyName: string,
): SuspicionRuleId[] {
  return scanForSuspiciousData(companies)
    .findings.filter((finding) => finding.companyName === companyName)
    .map((finding) => finding.rule);
}

describe("peer comparison", () => {
  const peers = makePeerGroup(20, 2024, 1, 10_000);

  it("flags a value far outside what every other company reported", () => {
    const odd = makeCompany("Odd One", [
      { dataYear: 2024, categories: { 1: 900_000_000 } },
    ]);

    expect(rulesFor([...peers, odd], "Odd One")).toContain("peer-outlier");
  });

  it("leaves values inside the peer spread alone", () => {
    const normal = makeCompany("Normal Co", [
      { dataYear: 2024, categories: { 1: 11_000 } },
    ]);

    expect(rulesFor([...peers, normal], "Normal Co")).not.toContain(
      "peer-outlier",
    );
  });

  it("does not judge a data point with too few peers", () => {
    const thin = makePeerGroup(4, 2024, 5, 100);
    const odd = makeCompany("Lonely", [
      { dataYear: 2024, categories: { 5: 50_000_000 } },
    ]);

    expect(rulesFor([...thin, odd], "Lonely")).not.toContain("peer-outlier");
  });

  it("does not let a tightly clustered peer group flag a small deviation", () => {
    // Every peer reports the identical value, so the measured spread is ~0.
    // Without a floor on the spread, a 2x gap would score as wildly extreme.
    const identicalPeers = Array.from({ length: 20 }, (_, index) =>
      makeCompany(`Clone ${index}`, [
        { dataYear: 2024, categories: { 9: 1_000 } },
      ]),
    );
    const slightlyOff = makeCompany("Slightly Off", [
      { dataYear: 2024, categories: { 9: 2_000 } },
    ]);

    expect(rulesFor([...identicalPeers, slightlyOff], "Slightly Off")).toEqual(
      [],
    );
  });

  it("still flags a large deviation from a tightly clustered peer group", () => {
    const identicalPeers = Array.from({ length: 20 }, (_, index) =>
      makeCompany(`Clone ${index}`, [
        { dataYear: 2024, categories: { 9: 1_000 } },
      ]),
    );
    const wayOff = makeCompany("Way Off", [
      { dataYear: 2024, categories: { 9: 900_000 } },
    ]);

    expect(rulesFor([...identicalPeers, wayOff], "Way Off")).toContain(
      "peer-outlier",
    );
  });
});

describe("share comparison guards", () => {
  /** Peers whose totals add up, so their shares are a usable baseline. */
  function consistentPeers(count: number) {
    return Array.from({ length: count }, (_, index) =>
      makeCompany(`Share Peer ${index}`, [
        {
          dataYear: 2024,
          scope1: 100,
          scope2mb: 100,
          scope3StatedTotal: 800,
          statedTotal: 1_000,
          categories: { 1: 600, 2: 200 },
        },
      ]),
    );
  }

  it("skips a report whose own scopes do not add up to its stated total", () => {
    // Scope 1 is inflated, so every share computed against the total would be
    // distorted by that one value rather than by anything of its own.
    const inconsistent = makeCompany("Inconsistent AB", [
      {
        dataYear: 2024,
        scope1: 100_000,
        scope2mb: 100,
        scope3StatedTotal: 800,
        statedTotal: 1_000,
        categories: { 1: 600, 2: 200 },
      },
    ]);

    const rules = rulesFor(
      [...consistentPeers(20), inconsistent],
      "Inconsistent AB",
    );

    expect(rules).toContain("total-sum-mismatch");
    expect(rules).not.toContain("peer-share-outlier");
  });

  it("compares shares when the report's own numbers agree", () => {
    const lopsided = makeCompany("Lopsided AB", [
      {
        dataYear: 2024,
        scope1: 100,
        scope2mb: 100,
        scope3StatedTotal: 800,
        statedTotal: 1_000,
        categories: { 1: 5, 2: 795 },
      },
    ]);

    expect(
      rulesFor([...consistentPeers(20), lopsided], "Lopsided AB"),
    ).toContain("peer-share-outlier");
  });
});

describe("company history comparison", () => {
  it("reports a thousand-fold jump as a unit mix-up, not a generic jump", () => {
    const company = makeCompany("Unit Slip", [
      { dataYear: 2021, scope1: 1_000 },
      { dataYear: 2022, scope1: 1_050 },
      { dataYear: 2023, scope1: 980 },
      { dataYear: 2024, scope1: 1_000_000 },
    ]);

    const findings = scanForSuspiciousData([company]).findings;
    const unitScale = findings.find(
      (finding) =>
        finding.rule === "unit-scale-error" && finding.dataYear === 2024,
    );

    expect(unitScale).toBeDefined();
    expect(unitScale?.severity).toBe("high");
    expect(unitScale?.messageParams.factor).toBe(1000);
    expect(findings.some((f) => f.rule === "year-over-year-jump")).toBe(false);
  });

  it("flags a large non-power-of-ten jump as a year-over-year jump", () => {
    const company = makeCompany("Jumpy", [
      { dataYear: 2021, scope1: 100 },
      { dataYear: 2022, scope1: 110 },
      { dataYear: 2023, scope1: 105 },
      { dataYear: 2024, scope1: 4_200 },
    ]);

    const finding = scanForSuspiciousData([company]).findings.find(
      (f) => f.rule === "year-over-year-jump",
    );

    expect(finding?.dataYear).toBe(2024);
    expect(finding?.messageParams.factor).toBe(40);
  });

  it("ignores ordinary year-on-year movement", () => {
    const company = makeCompany("Steady", [
      { dataYear: 2021, scope1: 100 },
      { dataYear: 2022, scope1: 130 },
      { dataYear: 2023, scope1: 90 },
      { dataYear: 2024, scope1: 160 },
    ]);

    expect(rulesFor([company], "Steady")).toHaveLength(0);
  });

  it("needs more than one other year before judging a value", () => {
    const company = makeCompany("Short History", [
      { dataYear: 2023, scope1: 100 },
      { dataYear: 2024, scope1: 100_000 },
    ]);

    expect(rulesFor([company], "Short History")).not.toContain(
      "year-over-year-jump",
    );
  });
});

describe("within-report consistency", () => {
  it("flags scope 3 categories that do not add up to the stated total", () => {
    const company = makeCompany("Mismatch AB", [
      {
        dataYear: 2024,
        scope3StatedTotal: 1_000,
        categories: { 1: 400, 2: 100 },
      },
    ]);

    const finding = scanForSuspiciousData([company]).findings.find(
      (f) => f.rule === "scope3-sum-mismatch",
    );

    expect(finding?.dataPointId).toBe("scope3-stated-total");
    expect(finding?.severity).toBe("high");
  });

  it("accepts categories that add up within tolerance", () => {
    const company = makeCompany("Tidy AB", [
      {
        dataYear: 2024,
        scope3StatedTotal: 1_000,
        categories: { 1: 700, 2: 320 },
      },
    ]);

    expect(rulesFor([company], "Tidy AB")).not.toContain("scope3-sum-mismatch");
  });

  it("flags a category larger than the scope 3 total it belongs to", () => {
    const company = makeCompany("Overflow AB", [
      {
        dataYear: 2024,
        scope3StatedTotal: 500,
        categories: { 1: 5_000, 2: 100 },
      },
    ]);

    const findings = rulesFor([company], "Overflow AB");
    expect(findings).toContain("category-exceeds-total");
  });

  it("flags scope 1 + 2 + 3 that misses the stated total", () => {
    const company = makeCompany("Total Off AB", [
      {
        dataYear: 2024,
        scope1: 100,
        scope2mb: 50,
        scope3StatedTotal: 100,
        statedTotal: 900,
      },
    ]);

    const finding = scanForSuspiciousData([company]).findings.find(
      (f) => f.rule === "total-sum-mismatch",
    );

    expect(finding?.dataPointId).toBe("stated-total");
  });

  it("does not compare a partial scope breakdown against the stated total", () => {
    const company = makeCompany("Partial AB", [
      { dataYear: 2024, scope1: 100, statedTotal: 900 },
    ]);

    expect(rulesFor([company], "Partial AB")).not.toContain(
      "total-sum-mismatch",
    );
  });

  it("flags market- and location-based scope 2 orders of magnitude apart", () => {
    const company = makeCompany("Scope2 AB", [
      { dataYear: 2024, scope2mb: 10, scope2lb: 9_000 },
    ]);

    expect(rulesFor([company], "Scope2 AB")).toContain(
      "scope2-mb-lb-divergence",
    );
  });

  it("flags the same number filed under several data points", () => {
    const company = makeCompany("Copy Paste AB", [
      { dataYear: 2024, categories: { 1: 4_321, 2: 4_321, 3: 4_321 } },
    ]);

    const findings = scanForSuspiciousData([company]).findings.filter(
      (f) => f.rule === "duplicate-value",
    );

    expect(findings).toHaveLength(3);
    expect(findings[0]?.severity).toBe("high");
  });

  it("flags a value that is really the report year", () => {
    const company = makeCompany("Year Value AB", [
      { dataYear: 2024, categories: { 6: 2024 } },
    ]);

    expect(rulesFor([company], "Year Value AB")).toContain(
      "value-looks-like-year",
    );
  });

  it("flags negative emissions", () => {
    const company = makeCompany("Negative AB", [
      { dataYear: 2024, scope1: -500 },
    ]);

    expect(rulesFor([company], "Negative AB")).toContain("negative-value");
  });
});

describe("provenance", () => {
  it("marks unverified values as AI-generated and verified ones as validated", () => {
    const ai = makeCompany("AI Co", [{ dataYear: 2024, scope1: -100 }]);
    const human = makeCompany("Human Co", [
      { dataYear: 2024, scope1: -100, verified: ["scope1-total"] },
    ]);

    const findings = scanForSuspiciousData([ai, human]).findings;

    expect(findings.find((f) => f.companyName === "AI Co")?.origin).toBe("ai");

    const verifiedFinding = findings.find((f) => f.companyName === "Human Co");
    expect(verifiedFinding?.origin).toBe("verified");
    expect(verifiedFinding?.verifiedByName).toBe("Reviewer");
  });
});

describe("scan result ordering", () => {
  it("puts high severity first and reports what was scanned", () => {
    const peers = makePeerGroup(20, 2024, 1, 10_000);
    const odd = makeCompany("Odd One", [
      { dataYear: 2024, categories: { 1: 900_000_000 } },
    ]);

    const result = scanForSuspiciousData([...peers, odd]);

    expect(result.companyCount).toBe(21);
    expect(result.periodCount).toBe(21);
    expect(result.observationCount).toBeGreaterThan(0);

    const severities = result.findings.map((f) => f.severity);
    const firstMedium = severities.indexOf("medium");
    const lastHigh = severities.lastIndexOf("high");
    if (firstMedium !== -1 && lastHigh !== -1) {
      expect(lastHigh).toBeLessThan(firstMedium);
    }
  });
});
