export type PerformanceIncentiveRank = {
  designation: string
  criteria: number
  reward: number
}

/**
 * Performance Incentive Ranks — 60:40 Matching Business Ratio
 *
 * One leg must contribute ≥60% of total qualifying business (the power leg).
 * There must be at least one other leg with business (any amount ≤40%).
 * Only then does the member qualify for the rank corresponding
 * to their total matched business.
 */
export const PERFORMANCE_INCENTIVE_CONFIG: PerformanceIncentiveRank[] = [
  { designation: 'Starter', criteria: 500000, reward: 1999 },
  { designation: 'Bronze', criteria: 1000000, reward: 3499 },
  { designation: 'Silver', criteria: 2500000, reward: 9999 },
  { designation: 'Gold', criteria: 5000000, reward: 19499 },
  { designation: 'Emerald', criteria: 10000000, reward: 39999 },
  { designation: 'Ruby', criteria: 30000000, reward: 79999 },
  { designation: 'Sapphire', criteria: 50000000, reward: 129999 },
  { designation: 'Topaz', criteria: 100000000, reward: 199999 },
  { designation: 'Diamond', criteria: 250000000, reward: 259999 },
  { designation: 'B Diamond', criteria: 500000000, reward: 449999 },
  { designation: 'C Diamond', criteria: 1000000000, reward: 799999 },
  { designation: 'R Diamond', criteria: 3000000000, reward: 1499999 },
  { designation: 'Crown', criteria: 8000000000, reward: 2999999 },
  { designation: 'Royal', criteria: 12000000000, reward: 4999999 },
  { designation: 'Elite', criteria: 17000000000, reward: 7999999 },
]

/**
 * Check if 60:40 ratio is met.
 * @param legs - Array of business amounts per leg
 * @returns { matched: boolean, topLeg: number, otherLegs: number, total: number }
 */
export function checkMatchingRatio(legs: number[]): {
  matched: boolean
  topLeg: number
  otherLegs: number
  total: number
} {
  if (legs.length === 0) {
    return { matched: false, topLeg: 0, otherLegs: 0, total: 0 }
  }

  const total = legs.reduce((sum, val) => sum + val, 0)
  const sorted = [...legs].sort((a, b) => b - a)
  const topLeg = sorted[0]
  const otherLegs = total - topLeg

  // True 60:40 ratio: power ≥ 60% of total AND weaker ≥ 40% of total
  const matched = total > 0 && topLeg >= total * 0.6 && otherLegs >= total * 0.4
  return { matched, topLeg, otherLegs, total }
}
