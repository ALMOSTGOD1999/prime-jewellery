import User from '#models/user'
import { DateTime } from 'luxon'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import Purchase from '#models/purchase'
import { checkMatchingRatio, getPerformanceIncentiveRank } from '#enums/performance_incentive'
import { ACHIEVEMENT_REWARD_CONFIG } from '#enums/achievement'

export default class RewardService {
  // static async getActivationRewards(user: User) {}
  // Activation Cashback: 10% of activation amount (1000), split 5%+5% over 2 months
  static async getActivationCashbackRewards(
    user: User,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      asOf?: DateTime
    } = {}
  ) {
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc', asOf } = filters

    if (!user.activatedAt) {
      return {
        meta: {
          total: 0,
          per_page: limit,
          current_page: page,
          last_page: 1,
          first_page: 1,
          first_page_url: '/?page=1',
          last_page_url: '/?page=1',
          next_page_url: null,
          previous_page_url: null,
        },
        data: [],
        stats: {
          totalRewards: 0,
          totalWithdrawn: 0,
        },
      }
    }

    const ACTIVATION_AMOUNT = 1000
    const CASHBACK_PERCENTAGE = 0.1 // 10%
    const totalCashback = ACTIVATION_AMOUNT * CASHBACK_PERCENTAGE // 100
    const monthlyAmount = totalCashback / 2 // 50 per month

    const activatedAt = DateTime.fromJSDate(new Date(user.activatedAt.toString()))
    const asOfDate = asOf || DateTime.now()
    const rewards: any[] = []

    // Month 1: 5% (50)
    const month1Date = activatedAt.plus({ months: 1 })
    if (asOfDate >= month1Date) {
      rewards.push({
        id: 1,
        date: month1Date.toFormat('yyyy-MM-dd HH:mm:ss'),
        month: 1,
        amount: Number(monthlyAmount.toFixed(2)),
      })
    }

    // Month 2: 5% (50)
    const month2Date = activatedAt.plus({ months: 2 })
    if (asOfDate >= month2Date) {
      rewards.push({
        id: 2,
        date: month2Date.toFormat('yyyy-MM-dd HH:mm:ss'),
        month: 2,
        amount: Number(monthlyAmount.toFixed(2)),
      })
    }

    // Sorting
    rewards.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
      }
      return 0
    })

    const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0)

    // Pagination
    const total = rewards.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedRewards = rewards.slice(startIndex, endIndex)
    const lastPage = Math.ceil(total / limit) || 1

    // Fetch total withdrawn
    const withdrawnRes = await db
      .from('withdrawls')
      .where('user_id', user.id)
      .where('type', 'activation_cashback')
      .whereIn('status', ['pending', 'approved'])
      .sum('amount as total')

    const totalWithdrawn = Number(withdrawnRes[0].total) || 0

    return {
      meta: {
        total,
        per_page: limit,
        current_page: page,
        last_page: lastPage,
        first_page: 1,
        first_page_url: `/?page=1`,
        last_page_url: `/?page=${lastPage}`,
        next_page_url: page < lastPage ? `/?page=${page + 1}` : null,
        previous_page_url: page > 1 ? `/?page=${page - 1}` : null,
      },
      data: paginatedRewards,
      stats: {
        totalRewards: Number(totalRewards.toFixed(2)),
        totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      },
    }
  }

  // Direct Sponsor: 10% instant reward for parent when direct child activates
  static async getActivationSponsorRewards(
    user: User,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      search?: string
      asOf?: DateTime
    } = {}
  ) {
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc', search = '', asOf } = filters

    // Get direct children who are activated AFTER the parent
    const parentActivatedAt = user.activatedAt
      ? DateTime.fromJSDate(new Date(user.activatedAt.toString())).toSQL()!
      : null

    const directChildren = await user
      .related('children')
      .query()
      .whereNotNull('activated_at')
      .if(parentActivatedAt, (q) => q.where('activated_at', '>=', parentActivatedAt!))
      .if(asOf, (q) => q.where('activated_at', '<=', asOf!.toSQL()!))
      .if(search, (query) => {
        query.where('name', 'ILIKE', `%${search}%`)
      })

    const ACTIVATION_AMOUNT = 1000
    const SPONSOR_PERCENTAGE = 0.1 // 10%
    const rewardPerChild = ACTIVATION_AMOUNT * SPONSOR_PERCENTAGE // 100

    const rewards = directChildren.map((child) => ({
      _userId: child.id,
      id: child.id,
      date: DateTime.fromJSDate(new Date(child.activatedAt!.toString())).toFormat(
        'yyyy-MM-dd HH:mm:ss'
      ),
      source: {
        name: child.name,
        avatar: child.avatar,
      },
      amount: Number(rewardPerChild.toFixed(2)),
    }))

    // Sorting
    rewards.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
      }
      return 0
    })

    const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0)

    // Pagination
    const total = rewards.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedRewards = rewards.slice(startIndex, endIndex)
    const lastPage = Math.ceil(total / limit) || 1

    // Fetch total withdrawn
    const withdrawnRes = await db
      .from('withdrawls')
      .where('user_id', user.id)
      .where('type', 'activation_sponsor')
      .whereIn('status', ['pending', 'approved'])
      .sum('amount as total')

    const totalWithdrawn = Number(withdrawnRes[0].total) || 0

    return {
      meta: {
        total,
        per_page: limit,
        current_page: page,
        last_page: lastPage,
        first_page: 1,
        first_page_url: `/?page=1`,
        last_page_url: `/?page=${lastPage}`,
        next_page_url: page < lastPage ? `/?page=${page + 1}` : null,
        previous_page_url: page > 1 ? `/?page=${page - 1}` : null,
      },
      data: paginatedRewards,
      stats: {
        totalRewards: Number(totalRewards.toFixed(2)),
        totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      },
    }
  }

  // Activation Level Rewards: Multi-level rewards based on team depth
  static async getActivationLevelRewards(
    user: User,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      search?: string
      asOf?: DateTime
    } = {}
  ) {
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc', search = '', asOf } = filters

    // 1. Get direct children count to determine eligibility depth
    const directChildrenCountRes = await user.related('children').query().count('* as total')
    const directCount = Number(directChildrenCountRes[0].$extras.total)

    // Determine max depth based on conditions:
    // L1: 5% (no req)
    // L2: 2% (1 direct)
    // L3: 1% (1 direct)
    // L4-5: 1% (2 directs)
    let maxDepth = 1
    if (directCount >= 2) maxDepth = 5
    else if (directCount >= 1) maxDepth = 3

    // 2. Fetch activated descendants using CTE (up to maxDepth)
    // Only count descendants activated AFTER the parent
    const parentActivatedAt = user.activatedAt
      ? DateTime.fromJSDate(new Date(user.activatedAt.toString())).toSQL()!
      : null
    const asOfCondition = asOf ? 'AND activated_at <= ?' : ''
    const parentCondition = parentActivatedAt ? 'AND activated_at >= ?' : ''
    const params: any[] = [user.id, maxDepth]
    if (parentActivatedAt) params.push(parentActivatedAt)
    if (asOf) params.push(asOf.toSQL()!)

    const descendants = await db.rawQuery(
      `
      WITH RECURSIVE descendants AS (
        SELECT id, name, parent_id, activated_at, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.name, u.parent_id, u.activated_at, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < ?
      )
      SELECT * FROM descendants
      WHERE activated_at IS NOT NULL
      ${search ? "AND name ILIKE '%" + search.replace(/'/g, "''") + "%'" : ''}
      ${parentCondition}
      ${asOfCondition}
      `,
      params
    )

    if (descendants.rows.length === 0) {
      return {
        meta: {
          total: 0,
          per_page: limit,
          current_page: page,
          last_page: 1,
          first_page: 1,
          first_page_url: '/?page=1',
          last_page_url: '/?page=1',
          next_page_url: null,
          previous_page_url: null,
        },
        data: [],
        stats: {
          totalRewards: 0,
          totalEligible: 0,
          totalWithdrawable: 0,
          totalWithdrawn: 0,
        },
      }
    }

    const ACTIVATION_AMOUNT = 1000

    // 3. Calculate Rewards based on activated_at
    const rewards: any[] = []
    let totalEligible = 0
    let totalWithdrawable = 0
    const asOfDate = asOf || DateTime.now()

    for (const member of descendants.rows) {
      const activatedAt = DateTime.fromJSDate(member.activated_at)
      const monthsElapsed = asOfDate.diff(activatedAt, 'months').months

      // Percentage Logic
      const depth = member.depth
      let monthlyPercentage = 0

      if (depth === 1) monthlyPercentage = 0.05
      else if (depth === 2) monthlyPercentage = 0.02
      else if (depth === 3) monthlyPercentage = 0.01
      else if (depth >= 4) monthlyPercentage = 0.01

      // Activation rewards are for 2 months total
      // Month 1 (0-1): Show 1 month reward, 0 withdrawable
      // Month 1 complete (1-2): Show 1 month reward, 1 month withdrawable
      // Month 2 (1-2): Show 2 months total reward, 1 month withdrawable
      // Month 2 complete (2+): Show 2 months total reward, 2 months withdrawable
      let currentMonth = 0
      let eligibleMonths = 0
      let withdrawableMonths = 0

      if (monthsElapsed >= 2) {
        currentMonth = 2
        eligibleMonths = 2 // Total 2 months eligible
        withdrawableMonths = 2 // Both months withdrawable
      } else if (monthsElapsed >= 1) {
        currentMonth = 2 // In month 2 now
        eligibleMonths = 2 // Show total 2 months reward
        withdrawableMonths = 1 // Only 1 month withdrawable
      } else {
        currentMonth = 1 // In month 1
        eligibleMonths = 1 // Show 1 month reward
        withdrawableMonths = 0 // Nothing withdrawable yet
      }

      const eligiblePercentage = monthlyPercentage * eligibleMonths
      const withdrawablePercentage = monthlyPercentage * withdrawableMonths

      const eligibleAmount = ACTIVATION_AMOUNT * eligiblePercentage
      const withdrawableAmount = ACTIVATION_AMOUNT * withdrawablePercentage

      totalEligible += eligibleAmount
      totalWithdrawable += withdrawableAmount

      rewards.push({
        _userId: member.id,
        id: member.id,
        date: activatedAt.toFormat('yyyy-MM-dd HH:mm:ss'),
        source: {
          name: member.name,
          avatar: null,
        },
        level: depth,
        currentMonth: currentMonth,
        percentage: (eligiblePercentage * 100).toFixed(2) + '%',
        amount: Number(eligibleAmount.toFixed(2)),
        eligibleAmount: Number(eligibleAmount.toFixed(2)),
        withdrawableAmount: Number(withdrawableAmount.toFixed(2)),
        monthsElapsed: Math.floor(monthsElapsed),
      })
    }

    // 5. Sorting
    rewards.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc'
          ? a.eligibleAmount - b.eligibleAmount
          : b.eligibleAmount - a.eligibleAmount
      } else if (sortBy === 'level') {
        return sortOrder === 'asc' ? a.level - b.level : b.level - a.level
      }
      return 0
    })

    // 6. Pagination
    const total = rewards.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedRewards = rewards.slice(startIndex, endIndex)
    const lastPage = Math.ceil(total / limit)

    // 7. Fetch Users for the visible slice only
    const userIdsToFetch = [...new Set(paginatedRewards.map((r) => r._userId))]

    if (userIdsToFetch.length > 0) {
      const users = await User.findMany(userIdsToFetch)
      const userMap = new Map<number, User>()
      for (const u of users) {
        userMap.set(u.id, u)
      }

      for (const r of paginatedRewards) {
        const u = userMap.get(r._userId)
        if (u) {
          r.source.avatar = u.avatar
        }
        delete r._userId
      }
    }

    // 8. Fetch total withdrawn
    const withdrawnRes = await db
      .from('withdrawls')
      .where('user_id', user.id)
      .where('type', 'activation_level')
      .whereIn('status', ['pending', 'approved'])
      .sum('amount as total')

    const totalWithdrawn = Number(withdrawnRes[0].total) || 0

    return {
      meta: {
        total,
        per_page: limit,
        current_page: page,
        last_page: lastPage,
        first_page: 1,
        first_page_url: `/?page=1`,
        last_page_url: `/?page=${lastPage}`,
        next_page_url: page < lastPage ? `/?page=${page + 1}` : null,
        previous_page_url: page > 1 ? `/?page=${page - 1}` : null,
      },
      data: paginatedRewards,
      stats: {
        totalEligible: Number(totalEligible.toFixed(2)),
        totalWithdrawable: Number(totalWithdrawable.toFixed(2)),
        totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      },
    }
  }

  // Legacy method - kept for backward compatibility
  static async getActivationRewards(
    user: User,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      search?: string
    } = {}
  ) {
    return this.getActivationLevelRewards(user, filters)
  }

  static async getActivationStats(user: User) {
    // 1. Get direct children count to determine eligibility depth
    const directChildrenCountRes = await user.related('children').query().count('* as total')
    const directCount = Number(directChildrenCountRes[0].$extras.total)

    // Determine max depth
    let maxDepth = 1
    if (directCount >= 2) maxDepth = 5
    else if (directCount >= 1) maxDepth = 3

    // 2. Fetch activated descendants using CTE (up to maxDepth)
    const descendants = await db.rawQuery(
      `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id, activated_at, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.parent_id, u.activated_at, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < ?
      )
      SELECT * FROM descendants
      WHERE activated_at IS NOT NULL
      `,
      [user.id, maxDepth]
    )

    if (descendants.rows.length === 0) {
      return { totalRewards: 0, totalGoldWallet: 0, totalWithdrawal: 0 }
    }

    const ACTIVATION_AMOUNT = 1000

    // 3. Calculate Total Rewards based on activated_at
    let totalRewards = 0
    const now = DateTime.now()

    for (const member of descendants.rows) {
      const activatedAt = DateTime.fromJSDate(member.activated_at)
      const monthsElapsed = now.diff(activatedAt, 'months').months

      const depth = member.depth
      let monthlyPercentage = 0

      if (depth === 1) monthlyPercentage = 0.05
      else if (depth === 2) monthlyPercentage = 0.02
      else if (depth === 3) monthlyPercentage = 0.01
      else if (depth >= 4) monthlyPercentage = 0.01

      let multiplier = 0
      if (monthsElapsed >= 2) multiplier = 2
      else if (monthsElapsed >= 1) multiplier = 1

      const percentage = monthlyPercentage * multiplier

      if (percentage === 0) continue

      totalRewards += ACTIVATION_AMOUNT * percentage
    }

    return {
      totalRewards: Number(totalRewards.toFixed(2)),
      totalGoldWallet: Number((totalRewards * 0.5).toFixed(2)),
      totalWithdrawal: Number((totalRewards * 0.5).toFixed(2)),
    }
  }

  static async getCashbackRewards(
    user: User,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    } = {}
  ) {
    const { page = 1, limit = 10, sortOrder = 'desc' } = filters

    // Cashback = monthly 3% investment return (full amount, before wallet split)
    const distributions = await db
      .from('investment_return_distributions')
      .where('user_id', user.id)
      .orderBy('period_month', sortOrder === 'asc' ? 'asc' : 'desc')

    const rewards = distributions.map((d: any) => ({
      date: d.period_month,
      amount: Number(d.return_amount),
    }))

    const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0)
    const currentMonth = DateTime.now().setZone(env.get('TZ')).toFormat('yyyy-MM')
    const thisMonthRewards = rewards
      .filter((r: any) => r.date?.startsWith(currentMonth))
      .reduce((sum: number, r: any) => sum + r.amount, 0)

    const total = rewards.length
    const startIndex = (page - 1) * limit
    const paginatedRewards = rewards.slice(startIndex, startIndex + limit)
    const lastPage = Math.ceil(total / limit)

    const withdrawnRes = await db
      .from('withdrawls')
      .where('user_id', user.id)
      .where('type', 'cashback')
      .whereIn('status', ['pending', 'approved'])
      .sum('amount as total')
    const totalWithdrawn = Number(withdrawnRes[0]?.total || 0)

    return {
      meta: {
        total,
        per_page: limit,
        current_page: page,
        last_page: lastPage,
        first_page: 1,
        first_page_url: '/?page=1',
        last_page_url: `/?page=${lastPage}`,
        next_page_url: page < lastPage ? `/?page=${page + 1}` : null,
        previous_page_url: page > 1 ? `/?page=${page - 1}` : null,
      },
      data: paginatedRewards,
      stats: { totalRewards, thisMonthRewards, totalWithdrawn },
    }
  }

  static async getLevelRewards(
    user: User,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      asOf?: DateTime
    } = {}
  ) {
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc', asOf } = filters

    // 1. Get direct children count
    const directChildren = await user.related('children').query().count('* as total')
    const directCount = Number(directChildren[0].$extras.total)

    // 2. Determine max depth based on direct count (max 20 levels)
    let maxDepth = 1 // Level 1 always available
    if (directCount >= 5) maxDepth = 20
    else if (directCount >= 4) maxDepth = 15
    else if (directCount >= 3) maxDepth = 10
    else if (directCount >= 2) maxDepth = 5
    else if (directCount >= 1) maxDepth = 3

    const emptyResponse = {
      meta: {
        total: 0,
        per_page: limit,
        current_page: page,
        last_page: 1,
        first_page: 1,
        first_page_url: '/?page=1',
        last_page_url: '/?page=1',
        next_page_url: null,
        previous_page_url: null,
      },
      data: [],
      stats: {
        totalRewards: 0,
        thisMonthRewards: 0,
        totalWithdrawn: 0,
      },
    }

    // 3. Fetch descendants using CTE (up to 20 levels)
    const descendants = await db.rawQuery(
      `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.parent_id, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < 20
      )
      SELECT * FROM descendants WHERE depth <= ?
      `,
      [user.id, maxDepth]
    )

    if (descendants.rows.length === 0) {
      return emptyResponse
    }

    const descendantIds = descendants.rows.map((r: any) => r.id)
    const descendantDepths = new Map<number, number>(
      descendants.rows.map((r: any) => [r.id, r.depth])
    )

    // 4. Fetch purchases
    const purchases = await Purchase.query()
      .whereIn('userId', descendantIds)
      .whereNotNull('approvedAt')
      .orderBy('approvedAt', 'asc')

    if (purchases.length === 0) {
      return emptyResponse
    }

    // Group purchases by user
    const purchasesByUser = new Map<number, Purchase[]>()
    for (const p of purchases) {
      if (!purchasesByUser.has(p.userId)) purchasesByUser.set(p.userId, [])
      purchasesByUser.get(p.userId)!.push(p)
    }

    // 5. Calculate rewards with new logic:
    // Level 1: 1.5% (no team req)
    // Level 2: 1% (1 direct req)
    // Level 3: 0.5% (1 direct req)
    // Level 4: 0.3% (2 direct req)
    // Level 5: 0.25% (2 direct req)
    // Level 6-10: 0.15% (3 direct req)
    // Level 11-15: 0.10% (4 direct req)
    // Level 16-20: 0.05% (5 direct req)
    const levelRewardsMap = new Map<string, number>()

    for (const [userId, userPurchases] of purchasesByUser.entries()) {
      const depth = descendantDepths.get(userId)!
      let percentage = 0

      if (depth === 1) {
        percentage = 0.015
      } else if (depth === 2 && directCount >= 1) {
        percentage = 0.01
      } else if (depth === 3 && directCount >= 1) {
        percentage = 0.005
      } else if (depth === 4 && directCount >= 2) {
        percentage = 0.003
      } else if (depth === 5 && directCount >= 2) {
        percentage = 0.0025
      } else if (depth >= 6 && depth <= 10 && directCount >= 3) {
        percentage = 0.0015
      } else if (depth >= 11 && depth <= 15 && directCount >= 4) {
        percentage = 0.001
      } else if (depth >= 16 && depth <= 20 && directCount >= 5) {
        percentage = 0.0005
      }

      if (percentage === 0) continue

      // Calculate daily level rewards based on cumulative purchases
      // Formula: (cumulative purchase amount) × percentage × 12 / 365
      const validPurchases = userPurchases.filter((p) => !p.cancelledAt)
      if (validPurchases.length === 0) continue

      const firstPurchaseDate = DateTime.fromJSDate(
        new Date(validPurchases[0].approvedAt!.toString())
      ).startOf('day')
      const userActivatedAt = user.activatedAt
        ? DateTime.fromJSDate(new Date(user.activatedAt.toString())).startOf('day')
        : firstPurchaseDate
      const startDate = firstPurchaseDate > userActivatedAt ? firstPurchaseDate : userActivatedAt
      const endDate = (asOf || DateTime.now().setZone(env.get('TZ'))).startOf('day')

      for (let date = startDate; date <= endDate; date = date.plus({ days: 1 })) {
        // Calculate cumulative purchase amount until the current date
        // For stopped purchases, only count if current date is before or on stoppedAt
        const cumulativeAmount = validPurchases
          .filter((p) => {
            const approvedAt = DateTime.fromJSDate(new Date(p.approvedAt!.toString())).endOf('day')
            if (approvedAt > date.endOf('day')) return false

            if (p.stoppedAt) {
              const stoppedAt = DateTime.fromJSDate(new Date(p.stoppedAt!.toString())).endOf('day')
              if (date.endOf('day') > stoppedAt) return false
            }

            return true
          })
          .reduce((sum, p) => sum + Number(p.amount), 0)

        if (cumulativeAmount === 0) continue

        // Daily level reward = cumulative amount × percentage × 12 / 365
        const dailyLevelReward = (cumulativeAmount * percentage * 12) / 365
        const dateKey = date.toISODate()!

        levelRewardsMap.set(dateKey, (levelRewardsMap.get(dateKey) || 0) + dailyLevelReward)
      }
    }

    // 6. Format and return
    const rewards = Array.from(levelRewardsMap.entries()).map(([date, amount]) => ({
      date,
      amount: Number(amount.toFixed(2)),
    }))

    // Sorting
    rewards.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
      }
      return 0
    })

    // Calculate Stats
    const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0)
    const currentMonth = DateTime.now().setZone(env.get('TZ')).toFormat('yyyy-MM')
    const thisMonthRewards = rewards
      .filter((r) => r.date.startsWith(currentMonth))
      .reduce((sum, r) => sum + r.amount, 0)

    // Pagination
    const total = rewards.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedRewards = rewards.slice(startIndex, endIndex)
    const lastPage = Math.ceil(total / limit)

    // Fetch total withdrawn for level
    const withdrawnRes = await db
      .from('withdrawls')
      .where('user_id', user.id)
      .where('type', 'level')
      .whereIn('status', ['pending', 'approved'])
      .sum('amount as total')

    const totalWithdrawn = Number(withdrawnRes[0].total) || 0

    return {
      meta: {
        total,
        per_page: limit,
        current_page: page,
        last_page: lastPage,
        first_page: 1,
        first_page_url: `/?page=1`,
        last_page_url: `/?page=${lastPage}`,
        next_page_url: page < lastPage ? `/?page=${page + 1}` : null,
        previous_page_url: page > 1 ? `/?page=${page - 1}` : null,
      },
      data: paginatedRewards,
      stats: {
        totalRewards: Number(totalRewards.toFixed(2)),
        thisMonthRewards: Number(thisMonthRewards.toFixed(2)),
        totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      },
    }
  }

  static async getLevelRewardBreakdown(user: User, date: string) {
    const targetDate = DateTime.fromISO(date).startOf('day')

    // Get direct children count to determine eligibility depth
    const directChildrenCountRes = await user.related('children').query().count('* as total')
    const directCount = Number(directChildrenCountRes[0].$extras.total)

    // Determine max depth based on direct count
    let maxDepth = 1
    if (directCount >= 5) maxDepth = 20
    else if (directCount >= 4) maxDepth = 15
    else if (directCount >= 3) maxDepth = 10
    else if (directCount >= 2) maxDepth = 5
    else if (directCount >= 1) maxDepth = 3

    // Fetch descendants
    const descendants = await db.rawQuery(
      `
      WITH RECURSIVE descendants AS (
        SELECT id, name, parent_id, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.name, u.parent_id, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < 20
      )
      SELECT * FROM descendants WHERE depth <= ?
      `,
      [user.id, maxDepth]
    )

    if (descendants.rows.length === 0) {
      return { date, totalAmount: 0, breakdown: [] }
    }

    const descendantInfo = new Map<number, { name: string; depth: number }>()
    const descendantIds = descendants.rows.map((r: any) => {
      descendantInfo.set(r.id, { name: r.name, depth: r.depth })
      return r.id
    })

    // Fetch purchases for these descendants
    const purchases = await Purchase.query()
      .whereIn('userId', descendantIds)
      .whereNotNull('approvedAt')
      .orderBy('approvedAt', 'asc')

    if (purchases.length === 0) {
      return { date, totalAmount: 0, breakdown: [] }
    }

    // Group purchases by user
    const purchasesByUser = new Map<number, Purchase[]>()
    for (const p of purchases) {
      if (!purchasesByUser.has(p.userId)) purchasesByUser.set(p.userId, [])
      purchasesByUser.get(p.userId)!.push(p)
    }

    // Calculate breakdown by level for the specific date
    const levelBreakdown = new Map<
      number,
      {
        level: number
        amount: number
        memberCount: number
        members: { userId: number; name: string; cumulativeAmount: number; reward: number }[]
      }
    >()

    for (const [userId, userPurchases] of purchasesByUser.entries()) {
      const info = descendantInfo.get(userId)!
      const depth = info.depth
      let percentage = 0

      if (depth === 1) {
        percentage = 0.015
      } else if (depth === 2 && directCount >= 1) {
        percentage = 0.01
      } else if (depth === 3 && directCount >= 1) {
        percentage = 0.005
      } else if (depth === 4 && directCount >= 2) {
        percentage = 0.003
      } else if (depth === 5 && directCount >= 2) {
        percentage = 0.0025
      } else if (depth >= 6 && depth <= 10 && directCount >= 3) {
        percentage = 0.0015
      } else if (depth >= 11 && depth <= 15 && directCount >= 4) {
        percentage = 0.001
      } else if (depth >= 16 && depth <= 20 && directCount >= 5) {
        percentage = 0.0005
      }

      if (percentage === 0) continue

      const validPurchases = userPurchases.filter((p) => !p.cancelledAt)
      if (validPurchases.length === 0) continue

      // Check if any purchase is active on the target date
      const cumulativeAmount = validPurchases
        .filter((p) => {
          const approvedAt = DateTime.fromJSDate(new Date(p.approvedAt!.toString())).endOf('day')
          if (approvedAt > targetDate.endOf('day')) return false

          if (p.stoppedAt) {
            const stoppedAt = DateTime.fromJSDate(new Date(p.stoppedAt!.toString())).endOf('day')
            if (targetDate.endOf('day') > stoppedAt) return false
          }

          return true
        })
        .reduce((sum, p) => sum + Number(p.amount), 0)

      if (cumulativeAmount === 0) continue

      const dailyReward = (cumulativeAmount * percentage * 12) / 365

      if (!levelBreakdown.has(depth)) {
        levelBreakdown.set(depth, { level: depth, amount: 0, memberCount: 0, members: [] })
      }

      const levelData = levelBreakdown.get(depth)!
      levelData.amount += dailyReward
      levelData.memberCount += 1
      levelData.members.push({
        userId,
        name: info.name,
        cumulativeAmount,
        reward: Number(dailyReward.toFixed(2)),
      })
    }

    const breakdown = Array.from(levelBreakdown.values())
      .map((b) => ({
        ...b,
        amount: Number(b.amount.toFixed(2)),
      }))
      .sort((a, b) => a.level - b.level)

    const totalAmount = breakdown.reduce((sum, b) => sum + b.amount, 0)

    return {
      date,
      totalAmount: Number(totalAmount.toFixed(2)),
      breakdown,
    }
  }

  static async getEmiLevelRewards(
    user: User,
    filters: {
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      asOf?: DateTime
    } = {}
  ) {
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc', asOf } = filters

    // 1. Get direct children count
    const directChildren = await user.related('children').query().count('* as total')
    const directCount = Number(directChildren[0].$extras.total)

    // 2. Determine max depth based on direct count (max 20 levels)
    let maxDepth = 1
    if (directCount >= 5) maxDepth = 20
    else if (directCount >= 4) maxDepth = 15
    else if (directCount >= 3) maxDepth = 10
    else if (directCount >= 2) maxDepth = 5
    else if (directCount >= 1) maxDepth = 3

    const emptyResponse = {
      meta: {
        total: 0,
        per_page: limit,
        current_page: page,
        last_page: 1,
        first_page: 1,
        first_page_url: '/?page=1',
        last_page_url: '/?page=1',
        next_page_url: null,
        previous_page_url: null,
      },
      data: [],
      stats: {
        totalRewards: 0,
        thisMonthRewards: 0,
        totalWithdrawn: 0,
      },
    }

    // 3. Fetch descendants using CTE (up to 20 levels)
    const descendants = await db.rawQuery(
      `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.parent_id, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < 20
      )
      SELECT * FROM descendants WHERE depth <= ?
      `,
      [user.id, maxDepth]
    )

    if (descendants.rows.length === 0) {
      return emptyResponse
    }

    const descendantIds = descendants.rows.map((r: any) => r.id)
    const descendantDepths = new Map<number, number>(
      descendants.rows.map((r: any) => [r.id, r.depth])
    )

    // 4. Fetch EMI transactions (approved payments)
    const emiTransactions = await db.rawQuery(
      `
      SELECT t.user_id, t.user_emi_subscription_id, t.amount, t.approved_at, ues.plan_amount
      FROM transactions t
      INNER JOIN user_emi_subscriptions ues ON t.user_emi_subscription_id = ues.id
      WHERE t.user_id IN (${descendantIds.join(',')})
        AND t.type = 'emi'
        AND t.approved_at IS NOT NULL
        AND t.cancelled_at IS NULL
      ORDER BY t.approved_at ASC
      `
    )

    if (emiTransactions.rows.length === 0) {
      return emptyResponse
    }

    // Group transactions by user
    const transactionsByUser = new Map<number, any[]>()
    for (const t of emiTransactions.rows) {
      if (!transactionsByUser.has(t.user_id)) transactionsByUser.set(t.user_id, [])
      transactionsByUser.get(t.user_id)!.push(t)
    }

    // 5. Calculate rewards with level percentages
    const levelRewardsMap = new Map<string, number>()

    for (const [userId, userTransactions] of transactionsByUser.entries()) {
      const depth = descendantDepths.get(userId)!
      let percentage = 0

      if (depth === 1) {
        percentage = 0.015
      } else if (depth === 2 && directCount >= 1) {
        percentage = 0.01
      } else if (depth === 3 && directCount >= 1) {
        percentage = 0.005
      } else if (depth === 4 && directCount >= 2) {
        percentage = 0.003
      } else if (depth === 5 && directCount >= 2) {
        percentage = 0.0025
      } else if (depth >= 6 && depth <= 10 && directCount >= 3) {
        percentage = 0.0015
      } else if (depth >= 11 && depth <= 15 && directCount >= 4) {
        percentage = 0.001
      } else if (depth >= 16 && depth <= 20 && directCount >= 5) {
        percentage = 0.0005
      }

      if (percentage === 0) continue

      // Calculate cumulative EMI amount over time
      if (userTransactions.length === 0) continue

      const firstEmiDate = DateTime.fromJSDate(new Date(userTransactions[0].approved_at)).startOf(
        'day'
      )
      const userActivatedAt = user.activatedAt
        ? DateTime.fromJSDate(new Date(user.activatedAt.toString())).startOf('day')
        : firstEmiDate
      const startDate = firstEmiDate > userActivatedAt ? firstEmiDate : userActivatedAt
      const endDate = (asOf || DateTime.now().setZone(env.get('TZ'))).startOf('day')

      for (let date = startDate; date <= endDate; date = date.plus({ days: 1 })) {
        // Calculate cumulative EMI amount paid until current date
        const cumulativeAmount = userTransactions
          .filter((t) => {
            const approvedAt = DateTime.fromJSDate(new Date(t.approved_at)).endOf('day')
            return approvedAt <= date.endOf('day')
          })
          .reduce((sum, t) => sum + Number(t.amount), 0)

        if (cumulativeAmount === 0) continue

        // Daily level reward = cumulative amount × percentage × 12 / 365
        const dailyLevelReward = (cumulativeAmount * percentage * 12) / 365
        const dateKey = date.toISODate()!

        levelRewardsMap.set(dateKey, (levelRewardsMap.get(dateKey) || 0) + dailyLevelReward)
      }
    }

    // 6. Format and return
    const rewards = Array.from(levelRewardsMap.entries()).map(([date, amount]) => ({
      date,
      amount: Number(amount.toFixed(2)),
    }))

    // Sorting
    rewards.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
      }
      return 0
    })

    // Calculate Stats
    const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0)
    const currentMonth = (asOf || DateTime.now().setZone(env.get('TZ'))).toFormat('yyyy-MM')
    const thisMonthRewards = rewards
      .filter((r) => r.date.startsWith(currentMonth))
      .reduce((sum, r) => sum + r.amount, 0)

    // Pagination
    const total = rewards.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedRewards = rewards.slice(startIndex, endIndex)
    const lastPage = Math.ceil(total / limit)

    // Fetch total withdrawn for emi_level
    const withdrawnRes = await db
      .from('withdrawls')
      .where('user_id', user.id)
      .where('type', 'emi_level')
      .whereIn('status', ['pending', 'approved'])
      .sum('amount as total')

    const totalWithdrawn = Number(withdrawnRes[0].total) || 0

    return {
      meta: {
        total,
        per_page: limit,
        current_page: page,
        last_page: lastPage,
        first_page: 1,
        first_page_url: `/?page=1`,
        last_page_url: `/?page=${lastPage}`,
        next_page_url: page < lastPage ? `/?page=${page + 1}` : null,
        previous_page_url: page > 1 ? `/?page=${page - 1}` : null,
      },
      data: paginatedRewards,
      stats: {
        totalRewards: Number(totalRewards.toFixed(2)),
        thisMonthRewards: Number(thisMonthRewards.toFixed(2)),
        totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      },
    }
  }

  static async getEmiLevelRewardBreakdown(user: User, date: string) {
    const targetDate = DateTime.fromISO(date).startOf('day')

    // Get direct children count to determine eligibility depth
    const directChildrenCountRes = await user.related('children').query().count('* as total')
    const directCount = Number(directChildrenCountRes[0].$extras.total)

    // Determine max depth based on direct count
    let maxDepth = 1
    if (directCount >= 5) maxDepth = 20
    else if (directCount >= 4) maxDepth = 15
    else if (directCount >= 3) maxDepth = 10
    else if (directCount >= 2) maxDepth = 5
    else if (directCount >= 1) maxDepth = 3

    // Fetch descendants
    const descendants = await db.rawQuery(
      `
      WITH RECURSIVE descendants AS (
        SELECT id, name, parent_id, 1 as depth
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.name, u.parent_id, d.depth + 1
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < 20
      )
      SELECT * FROM descendants WHERE depth <= ?
      `,
      [user.id, maxDepth]
    )

    if (descendants.rows.length === 0) {
      return { date, totalAmount: 0, breakdown: [] }
    }

    const descendantInfo = new Map<number, { name: string; depth: number }>()
    const descendantIds = descendants.rows.map((r: any) => {
      descendantInfo.set(r.id, { name: r.name, depth: r.depth })
      return r.id
    })

    // Fetch EMI transactions for these descendants
    const emiTransactions = await db.rawQuery(
      `
      SELECT t.user_id, t.user_emi_subscription_id, t.amount, t.approved_at, ues.plan_amount
      FROM transactions t
      INNER JOIN user_emi_subscriptions ues ON t.user_emi_subscription_id = ues.id
      WHERE t.user_id IN (${descendantIds.join(',')})
        AND t.type = 'emi'
        AND t.approved_at IS NOT NULL
        AND t.cancelled_at IS NULL
      ORDER BY t.approved_at ASC
      `
    )

    if (emiTransactions.rows.length === 0) {
      return { date, totalAmount: 0, breakdown: [] }
    }

    // Group transactions by user
    const transactionsByUser = new Map<number, any[]>()
    for (const t of emiTransactions.rows) {
      if (!transactionsByUser.has(t.user_id)) transactionsByUser.set(t.user_id, [])
      transactionsByUser.get(t.user_id)!.push(t)
    }

    // Calculate breakdown by level for the specific date
    const levelBreakdown = new Map<
      number,
      {
        level: number
        amount: number
        memberCount: number
        members: { userId: number; name: string; cumulativeAmount: number; reward: number }[]
      }
    >()

    for (const [userId, userTransactions] of transactionsByUser.entries()) {
      const info = descendantInfo.get(userId)!
      const depth = info.depth
      let percentage = 0

      if (depth === 1) {
        percentage = 0.015
      } else if (depth === 2 && directCount >= 1) {
        percentage = 0.01
      } else if (depth === 3 && directCount >= 1) {
        percentage = 0.005
      } else if (depth === 4 && directCount >= 2) {
        percentage = 0.003
      } else if (depth === 5 && directCount >= 2) {
        percentage = 0.0025
      } else if (depth >= 6 && depth <= 10 && directCount >= 3) {
        percentage = 0.0015
      } else if (depth >= 11 && depth <= 15 && directCount >= 4) {
        percentage = 0.001
      } else if (depth >= 16 && depth <= 20 && directCount >= 5) {
        percentage = 0.0005
      }

      if (percentage === 0) continue

      if (userTransactions.length === 0) continue

      // Calculate cumulative EMI amount paid until target date
      const cumulativeAmount = userTransactions
        .filter((t) => {
          const approvedAt = DateTime.fromJSDate(new Date(t.approved_at)).endOf('day')
          return approvedAt <= targetDate.endOf('day')
        })
        .reduce((sum, t) => sum + Number(t.amount), 0)

      if (cumulativeAmount === 0) continue

      const dailyReward = (cumulativeAmount * percentage * 12) / 365

      if (!levelBreakdown.has(depth)) {
        levelBreakdown.set(depth, { level: depth, amount: 0, memberCount: 0, members: [] })
      }

      const levelData = levelBreakdown.get(depth)!
      levelData.amount += dailyReward
      levelData.memberCount += 1
      levelData.members.push({
        userId,
        name: info.name,
        cumulativeAmount,
        reward: Number(dailyReward.toFixed(2)),
      })
    }

    const breakdown = Array.from(levelBreakdown.values())
      .map((b) => ({
        ...b,
        amount: Number(b.amount.toFixed(2)),
      }))
      .sort((a, b) => a.level - b.level)

    const totalAmount = breakdown.reduce((sum, b) => sum + b.amount, 0)

    return {
      date,
      totalAmount: Number(totalAmount.toFixed(2)),
      breakdown,
    }
  }

  /**
   * Performance Incentive using 60:40 matching ratio across genealogy legs.
   */
  static getSalaryInfo(legAmounts: number[]) {
    const ratio = checkMatchingRatio(legAmounts)
    if (!ratio.matched) return null

    const rank = getPerformanceIncentiveRank(ratio.total)
    if (!rank) return null

    return {
      designation: rank.designation,
      reward: rank.reward,
      criteria: rank.criteria,
      totalBusiness: ratio.total,
      topLeg: ratio.topLeg,
      otherLegs: ratio.otherLegs,
      matched: true,
    }
  }

  static async getPowerAndWeaker(user: User, endDate?: DateTime) {
    // 1. Get direct children
    const directChildren = await user.related('children').query()

    if (directChildren.length === 0) {
      return { power: 0, weaker: 0 }
    }

    const childrenVolumes: number[] = []

    // 2. For each child, calculate total volume of their subtree + themselves
    for (const child of directChildren) {
      // Get all descendants of this child
      const descendants = await db.rawQuery(
        `
        WITH RECURSIVE descendants AS (
          SELECT id
          FROM users
          WHERE parent_id = ?
          UNION ALL
          SELECT u.id
          FROM users u
          INNER JOIN descendants d ON u.parent_id = d.id
        )
        SELECT id FROM descendants
        `,
        [child.id]
      )

      const descendantIds = descendants.rows.map((r: any) => r.id)
      // Include the child itself
      const allIds = [child.id, ...descendantIds]

      // Calculate total approved purchases for these users up to endDate
      const query = Purchase.query()
        .whereIn('userId', allIds)
        .andWhereNotNull('approvedAt')
        .andWhereNull('cancelledAt')

      if (endDate) {
        query.andWhere('approvedAt', '<=', endDate.endOf('day').toSQL()!)
      }

      const result = await query.sum('amount as total')
      const total = Number(result[0].$extras.total) || 0
      childrenVolumes.push(total)
    }

    // 3. Identify Power and Weaker legs
    // Sort volumes descending
    childrenVolumes.sort((a, b) => b - a)

    const power = childrenVolumes.length > 0 ? childrenVolumes[0] : 0
    const weaker = childrenVolumes.slice(1).reduce((sum, val) => sum + val, 0)

    return { power, weaker, legAmounts: childrenVolumes }
  }

  static async getSalaryStats(user: User) {
    // 1. Fetch all salaries
    const salaries = await user.related('salaries').query()

    let totalUnlocked = 0
    let totalLocked = 0
    let totalAllTime = 0

    const now = DateTime.now().setZone(env.get('TZ'))

    for (const salary of salaries) {
      if (!salary.info) continue
      const amount = salary.info.reward
      totalAllTime += amount

      const createdAt = salary.createdAt.setZone(env.get('TZ'))
      let unlockDate: DateTime

      if (createdAt.day <= 15) {
        // Created 1st-15th -> Available 20th of Next Month
        unlockDate = createdAt.plus({ months: 1 }).set({ day: 20 }).startOf('day')
      } else {
        // Created 16th-End -> Available 5th of Month after Next
        unlockDate = createdAt.plus({ months: 2 }).set({ day: 5 }).startOf('day')
      }

      if (now >= unlockDate) {
        totalUnlocked += amount
      } else {
        totalLocked += amount
      }
    }

    // 2. Fetch withdrawn amount
    const withdrawnRes = await db
      .from('withdrawls')
      .where('user_id', user.id)
      .where('type', 'salary')
      .whereIn('status', ['pending', 'approved'])
      .sum('amount as total')

    const totalWithdrawn = Number(withdrawnRes[0].total) || 0

    return {
      totalAllTime,
      totalUnlocked,
      totalLocked,
      totalWithdrawn,
      availableBalance: Math.max(0, totalUnlocked - totalWithdrawn),
    }
  }

  static async getDashboardMetrics(user: User) {
    // 1. My Directs & Direct Business
    const directChildren = await user.related('children').query()
    const myDirects = directChildren.length

    let directBusiness = 0
    if (myDirects > 0) {
      const directIds = directChildren.map((c) => c.id)
      const res = await Purchase.query()
        .whereIn('userId', directIds)
        .andWhereNotNull('approvedAt')
        .andWhereNull('cancelledAt')
        .sum('amount as total')
      directBusiness = Number(res[0].$extras.total) || 0
    }

    // 2. My Business (Personal)
    const personalRes = await user
      .related('purchases')
      .query()
      .whereNotNull('approvedAt')
      .andWhereNull('cancelledAt')
      .sum('amount as total')
    const myBusiness = Number(personalRes[0].$extras.total) || 0

    // My Business this month
    const startOfMonth = DateTime.now().startOf('month').toSQLDate()
    const personalMonthRes = await user
      .related('purchases')
      .query()
      .whereNotNull('approvedAt')
      .andWhereNull('cancelledAt')
      .where('approved_at', '>=', startOfMonth)
      .sum('amount as total')
    const myBusinessMonth = Number(personalMonthRes[0].$extras.total) || 0

    // 3. My Team & Team Business
    const descendantsResult = await db.rawQuery(
      `
      WITH RECURSIVE descendants AS (
        SELECT id
        FROM users
        WHERE parent_id = ?
        UNION ALL
        SELECT u.id
        FROM users u
        INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT id FROM descendants
      `,
      [user.id]
    )

    const descendantIds = descendantsResult.rows.map((r: any) => r.id)
    const myTeam = descendantIds.length

    let teamBusiness = 0
    let teamBusinessMonth = 0
    if (myTeam > 0) {
      const teamRes = await Purchase.query()
        .whereIn('userId', descendantIds)
        .andWhereNotNull('approvedAt')
        .andWhereNull('cancelledAt')
        .sum('amount as total')
      teamBusiness = Number(teamRes[0].$extras.total) || 0

      const teamMonthRes = await Purchase.query()
        .whereIn('userId', descendantIds)
        .andWhereNotNull('approvedAt')
        .andWhereNull('cancelledAt')
        .where('approved_at', '>=', startOfMonth)
        .sum('amount as total')
      teamBusinessMonth = Number(teamMonthRes[0].$extras.total) || 0
    }

    // 4. Power & Weaker (Lifetime up to now)
    // We use the helper to get stats for all legs
    const {
      power: powerToday,
      weaker: weakerToday,
      legAmounts,
    } = await this.getPowerAndWeaker(user)

    return {
      myDirects,
      myTeam,
      myBusiness,
      myBusinessMonth,
      directBusiness,
      teamBusiness,
      teamBusinessMonth,
      powerToday,
      weakerToday,
      designation: this.getSalaryInfo(legAmounts || [])?.designation || 'N/A',
    }
  }

  static async getSalaryRewards(
    user: User,
    filters: {
      page?: number
      limit?: number
      month?: string
      year?: string
    } = {}
  ) {
    const { page = 1, limit = 10, month, year } = filters

    const query = user.related('salaries').query().orderBy('createdAt', 'desc')

    if (year) {
      if (month) {
        const date = DateTime.fromObject({ year: Number(year), month: Number(month) })
        if (date.isValid) {
          query.whereBetween('created_at', [
            date.startOf('month').toSQL()!,
            date.endOf('month').toSQL()!,
          ])
        }
      } else {
        const date = DateTime.fromObject({ year: Number(year) })
        if (date.isValid) {
          query.whereBetween('created_at', [
            date.startOf('year').toSQL()!,
            date.endOf('year').toSQL()!,
          ])
        }
      }
    }

    const salaries = await query.paginate(page, limit)

    const allSalaries = await user.related('salaries').query().select('power', 'weaker')
    const totalAllTimeReward = allSalaries.reduce((sum, a) => {
      const info = a.info
      if (!info) return sum
      return sum + (info.reward || 0)
    }, 0)

    return {
      meta: {
        total: salaries.total,
        per_page: salaries.perPage,
        current_page: salaries.currentPage,
        last_page: salaries.lastPage,
        first_page: salaries.firstPage,
        first_page_url: salaries.getUrl(1),
        last_page_url: salaries.getUrl(salaries.lastPage),
        next_page_url: salaries.getNextPageUrl(),
        previous_page_url: salaries.getPreviousPageUrl(),
      },
      stats: {
        totalAllTimeReward,
      },
      data: salaries
        .toJSON()
        .data.map((a) => {
          const info = a.info
          if (!info) return null

          return {
            id: a.id,
            date: a.createdAt.toFormat('dd MMMM yyyy'),
            totalReward: info.reward,
            designation: info.designation,
            breakdown: {
              monthlyIncentive: info.reward,
              houseFund: null,
              travelAllowance: 0,
              carFund: null,
            },
            carryingForward: 0,
            criteria: info.criteria,
            topLeg: info.topLeg,
            otherLegs: info.otherLegs,
            totalBusiness: info.totalBusiness,
            matched: info.matched,
            power: a.power,
            weaker: a.weaker,
          }
        })
        .filter((item) => item !== null),
    }
  }

  /**
   * Compute total working-wallet-eligible income earned by a user during a specific month.
   * Excludes monthly investment return (handled separately by cashback-wallet payout).
   * Optimized to skip expensive genealogy scans when no downline activity exists.
   */
  static async getUserMonthlyWorkingIncome(user: User, month: DateTime): Promise<number> {
    const monthStr = month.toFormat('yyyy-MM')
    const monthStart = month.startOf('month')
    const monthEnd = month.endOf('month')

    let total = 0

    // 1. Activation Cashback (fast: just date math)
    if (user.activatedAt) {
      const activatedAt = DateTime.fromJSDate(new Date(user.activatedAt.toString()))
      const month1Date = activatedAt.plus({ months: 1 })
      const month2Date = activatedAt.plus({ months: 2 })
      const asOf = monthEnd
      if (asOf >= month1Date && month1Date.toFormat('yyyy-MM') === monthStr) total += 50
      if (asOf >= month2Date && month2Date.toFormat('yyyy-MM') === monthStr) total += 50
    }

    // Quick check: does user have any direct children?
    const directChildrenCountRes = await user.related('children').query().count('* as total')
    const hasDirects = Number(directChildrenCountRes[0].$extras.total) > 0

    if (hasDirects) {
      // 2. Activation Sponsor (fast: count children activated this month)
      const sponsorCountRes = await user
        .related('children')
        .query()
        .whereNotNull('activated_at')
        .whereBetween('activated_at', [monthStart.toSQL()!, monthEnd.toSQL()!])
        .count('* as total')
      total += Number(sponsorCountRes[0].$extras.total) * 100

      // 3. Activation Level — incremental amount earned during this month
      const activationLevelEnd = await this.getActivationLevelRewards(user, {
        limit: 1,
        asOf: monthEnd,
      })
      const eligibleAtEnd = activationLevelEnd.stats.totalEligible

      const activationLevelStart = await this.getActivationLevelRewards(user, {
        limit: 1,
        asOf: monthStart.minus({ days: 1 }),
      })
      const eligibleAtStart = activationLevelStart.stats.totalEligible
      total += Math.max(0, eligibleAtEnd - eligibleAtStart)

      // 4. Level Income (purchase-based) — use pre-computed thisMonthRewards in stats
      const levelRewards = await this.getLevelRewards(user, { limit: 1, asOf: monthEnd })
      total += levelRewards.stats.thisMonthRewards || 0

      // 5. EMI Level Income — use pre-computed thisMonthRewards in stats
      const emiRewards = await this.getEmiLevelRewards(user, { limit: 1, asOf: monthEnd })
      total += emiRewards.stats.thisMonthRewards || 0
    }

    // 6. Salary (performance incentive) — count when created
    const salaries = await user
      .related('salaries')
      .query()
      .whereBetween('created_at', [monthStart.toSQL()!, monthEnd.toSQL()!])
    const salaryInMonth = salaries.reduce((sum, s) => sum + (s.info?.reward || 0), 0)
    total += salaryInMonth

    return Math.round(total * 100) / 100
  }

  static getAchievementInfo(powerAmount: number, weakerAmount: number) {
    const totalAmount = powerAmount + weakerAmount

    // 1. Sort ascending to calculate cumulative criteria
    const ascendingRewards = [...ACHIEVEMENT_REWARD_CONFIG].sort((a, b) => a.criteria - b.criteria)

    // 2. Calculate cumulative criteria
    let cumulativeSum = 0
    const cumulativeRewards = ascendingRewards.map((r) => {
      cumulativeSum += r.criteria
      return {
        ...r,
        cumulativeCriteria: cumulativeSum,
      }
    })

    // 3. Sort achievement rewards in descending order by CUMULATIVE criteria
    const descendingRewards = cumulativeRewards.sort(
      (a, b) => b.cumulativeCriteria - a.cumulativeCriteria
    )

    // Iterate through achievement tiers to find the highest one that meets the criteria
    for (const reward of descendingRewards) {
      const C = reward.cumulativeCriteria

      // The Conditions: 60/40 rule
      const meetsTotal = totalAmount >= C
      const meetsPower = powerAmount >= C * 0.6
      const meetsWeaker = weakerAmount >= C * 0.4

      // Return immediately if all conditions pass
      if (meetsTotal && meetsPower && meetsWeaker) {
        return {
          criteria: reward.criteria,
          reward: reward.reward,
        }
      }
    }

    // Return null if no criteria matches
    return null
  }
}
