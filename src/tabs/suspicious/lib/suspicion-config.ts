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
    /**
     * Floor for the log10 MAD. Some data points cluster so tightly that the
     * measured spread approaches zero, which would turn ordinary variation
     * into enormous z-scores. 0.15 treats peers as no tighter than +-41%.
     */
    minLogMad: 0.15,
    /** A value must also sit this many times off the peer median. */
    minFactor: 5,
  },
  peerShare: {
    minPeerCount: 12,
    flagZ: 3.5,
    mediumZ: 4.5,
    highZ: 6,
    minLogMad: 0.15,
    minFactor: 5,
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
    /**
     * Relative slack when matching a factor to a power of ten. Generous
     * because a unit mix-up sits on top of the company's real year-on-year
     * movement, so a kg-for-tonnes slip lands near 1 000× rather than on it.
     * Still far from the neighbouring powers of ten (100× and 10 000×).
     */
    tolerance: 0.3,
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
