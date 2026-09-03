/**
 * Thresholds for the suspicion rules.
 *
 * These are deliberately conservative starting points chosen to keep the tab
 * reviewable rather than exhaustive - see the tab's docs for how to retune.
 */

export const SUSPICION_CONFIG = {
  peer: {
    /** Below this many peer values the distribution is too thin to judge. */
    minPeerCount: 12,
    /** Modified z-score on log10 values at which a value is flagged. */
    flagZ: 3.5,
    mediumZ: 4.5,
    highZ: 6,
  },
  peerShare: {
    minPeerCount: 12,
    flagZ: 3.5,
    mediumZ: 4.5,
    highZ: 6,
    /** Shares below this are noise in a small denominator. */
    minDenominator: 1,
  },
  history: {
    /** Other data years needed before a company's own history is a baseline. */
    minOtherYears: 2,
    /** Factor away from the company's own median that counts as a jump. */
    flagFactor: 10,
    highFactor: 100,
  },
  unitScale: {
    /** Smallest power of ten treated as a unit mix-up rather than growth. */
    minFactor: 1000,
    /** Relative slack when matching a factor to a power of ten. */
    tolerance: 0.05,
  },
  scope3Sum: {
    /** Relative gap between category sum and stated scope 3 total. */
    flagRelative: 0.05,
    highRelative: 0.25,
    /** Ignore tiny absolute gaps regardless of the relative threshold. */
    minAbsolute: 1,
    /** Categories needed before the sum is meaningful. */
    minCategories: 2,
  },
  categoryExceedsTotal: {
    /** How far past the stated scope 3 total a single category must reach. */
    overshoot: 1.01,
  },
  totalSum: {
    flagRelative: 0.05,
    highRelative: 0.25,
    minAbsolute: 1,
  },
  scope2: {
    /** Market- vs location-based factor apart that looks like an error. */
    flagFactor: 10,
    highFactor: 100,
  },
  duplicate: {
    /** Data points sharing an identical value below this are unremarkable. */
    minValue: 1,
  },
  yearLike: {
    minYear: 1990,
    maxYear: 2100,
  },
} as const;
