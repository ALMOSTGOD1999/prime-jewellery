export type PerformanceIncentiveRank = {
  designation: string
  criteria: number
  reward: number
}

/**
 * Performance Incentive Ranks — 60:40 Matching Business Ratio
 *
 * One leg must contribute ≥60% of total qualifying business,
 * remaining legs combined must contribute the other 40%.
 * Only then does the member qualify for the rank corresponding
 * to their total matched business.
 */
export const PERFORMANCE_INCENTIVE_CONFIG: PerformanceIncentiveRank[] = [
  { designation: 'Starter',  criteria: 200000,         reward: 999 },
  { designation: 'Bronze',   criteria: 500000,         reward: 2499 },
  { designation: 'Silver',   criteria: 1000000,        reward: 5499 },
  { designation: 'Gold',     criteria: 2500000,        reward: 15999 },
  { designation: 'Platinum', criteria: 5000000,        reward: 24999 },
  { designation: 'Emerald',  criteria: 10000000,       reward: 51999 },
  { designation: 'Ruby',     criteria: 30000000,       reward: 105999 },
  { designation: 'Sapphire', criteria: 50000000,       reward: 154999 },
  { designation: 'Topaz',    criteria: 100000000,      reward: 254999 },
  { designation: 'Diamond',  criteria: 200000000,      reward: 509999 },
  { designation: 'B Diamond',criteria: 500000000,      reward: 824999 },
  { designation: 'C Diamond',criteria: 1000000000,     reward: 1249999 },
  { designation: 'R Diamond',criteria: 3000000000,     reward: 2999999 },
  { designation: 'Crown',    criteria: 8000000000,     reward: 4949999 },
  { designation: 'Royal',    criteria: 12000000000,    reward: 7499999 },
  { designation: 'Elite',    criteria: 17000000000,    reward: 9999999 },
  { designation: 'Legend',   criteria: 25000000000,    reward: 14999999 },
  { designation: 'Supreme',  criteria: 35000000000,    reward: 19999999 },
  { designation: 'Master',   criteria: 50000000000,    reward: 24000000 },
  { designation: 'Emperor',  criteria: 80000000000,    reward: 34999999 },
  { designation: 'King',     criteria: 100000000000,   reward: 49999999 },
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

  const matched = total > 0 && topLeg >= total * 0.6 && otherLegs >= total * 0.4
  return { matched, topLeg, otherLegs, total }
}

/**
 * Get the highest rank for a given total matched business.
 */
export function getPerformanceIncentiveRank(totalMatchedBusiness: number): PerformanceIncentiveRank | null {
  const descending = [...PERFORMANCE_INCENTIVE_CONFIG].sort((a, b) => b.criteria - a.criteria)
  for (const rank of descending) {
    if (totalMatchedBusiness >= rank.criteria) {
      return rank
    }
  }
  return null
}
