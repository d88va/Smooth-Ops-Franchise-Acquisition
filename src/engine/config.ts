import type { Priority, Tier } from './types';

/** Every tunable assumption lives here. These are surfaced on the deck's assumptions slide. */
export const CONFIG = {
  /** Minimum investment capacity (₹ lakh) by city tier. */
  tierMinInvestment: { 1: 40, 2: 25, 3: 15 } as Record<Tier, number>,
  /** Below the minimum but within this share → Hold with a "raise ₹X more" ask instead of Decline. */
  nearMissPct: 0.15,
  /** Typical all-in capex (₹ lakh); investment fit is scored against this. */
  typicalCapex: { 1: 80, 2: 50, 3: 30 } as Record<Tier, number>,
  implausibleInvestment: 2000,
  /** Minimum shop size (sq ft) by tier. */
  tierMinSize: { 1: 300, 2: 250, 3: 200 } as Record<Tier, number>,

  weights: { investment: 25, experience: 20, space: 20, priority: 15, timeline: 10, whitespace: 10 },
  priorityPoints: { High: 15, Medium: 9, Low: 4 } as Record<Priority, number>,

  /** Score bands. */
  approveAt: 70, // fallback when a territory is unknown
  /** Approval bar by territory priority: high-priority territories accept slightly lower scores. */
  approveByPriority: { High: 60, Medium: 65, Low: 70 } as Record<Priority, number>,
  holdAt: 50,
  /** Data quality: each soft (warn) flag costs points, capped. */
  dataQualityPenalty: 3,
  dataQualityCap: 10,

  /** White-space / cannibalisation in pin-space (same city). */
  minSpacing: 1, // ≤ this many pin-numbers apart from a store or partner → too close
  fullSpacing: 6, // ≥ this far → full white-space points

  /** Space-not-yet-identified applicants can only be approved (conditionally) with at least this launch window. */
  noSpaceMinLaunchMonths: 4,

  /** Weeks of each plan stage. */
  weeksPerMonth: 4.3,
  stage: {
    agreement: 2,
    spaceSignoff: 1,
    fitout: { 1: 5, 2: 4, 3: 4 } as Record<Tier, number>,
    stock: 1,
    softLaunch: 1,
    spaceSearch: 6,
    training: { first: 4, standard: 3, accelerated: 2 },
  },

  /** Territories are processed High → Medium → Low. */
  priorityRank: { High: 0, Medium: 1, Low: 2 } as Record<Priority, number>,
};

export const SPECIFIC_RETAIL = [
  'footwear', 'shoe', 'apparel', 'garment', 'cloth', 'boutique', 'textile', 'saree', 'eyewear', 'optic', 'spectacle',
  'grocery', 'kirana', 'supermarket', 'electronic', 'mobile', 'pharmacy', 'fashion', 'lifestyle',
];
export const GENERIC_RETAIL = ['retail', 'shop', 'store', 'outlet', 'showroom', 'trader', 'trading', 'merchant', 'chain'];
