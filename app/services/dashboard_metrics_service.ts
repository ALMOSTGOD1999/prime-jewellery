import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class DashboardMetricsService {
  /**
   * Fast dashboard metrics — all data in a single round-trip of queries.
   * Replaces the previous sequential N+1 approach in getDashboardMetrics + getPowerAndWeaker.
   */
  static async getMetrics(userId: number) {
    const startOfMonth = DateTime.now().startOf('month').toSQLDate()

    const [directRes, personalRes, personalMonthRes, descendantRes] = await Promise.all([
      // 1. Direct children + their direct business in one query
      db.rawQuery(
        `SELECT
          COUNT(*)::int as direct_count,
          COALESCE(SUM(direct_business), 0)::float as direct_business
         FROM (
           SELECT u.id,
             (SELECT COALESCE(SUM(p.amount), 0)
              FROM purchases p
              WHERE p.user_id = u.id
                AND p.approved_at IS NOT NULL
                AND p.cancelled_at IS NULL
             ) as direct_business
           FROM users u
           WHERE u.parent_id = ?
         ) sub`,
        [userId]
      ),

      // 2. Personal business (all-time)
      db.rawQuery(
        `SELECT COALESCE(SUM(amount), 0)::float as total
         FROM purchases
         WHERE user_id = ?
           AND approved_at IS NOT NULL
           AND cancelled_at IS NULL`,
        [userId]
      ),

      // 3. Personal business this month
      db.rawQuery(
        `SELECT COALESCE(SUM(amount), 0)::float as total
         FROM purchases
         WHERE user_id = ?
           AND approved_at IS NOT NULL
           AND cancelled_at IS NULL
           AND approved_at >= ?`,
        [userId, startOfMonth]
      ),

      // 4. All descendants with their purchase totals (one recursive CTE, one query)
      db.rawQuery(
        `WITH RECURSIVE descendants AS (
           SELECT u.id, u.parent_id
           FROM users u
           WHERE u.parent_id = ?
           UNION ALL
           SELECT u.id, u.parent_id
           FROM users u
           INNER JOIN descendants d ON u.parent_id = d.id
         ),
         leg_purchases AS (
           SELECT
             d.id,
             COALESCE(SUM(p.amount), 0) as volume
           FROM descendants d
           LEFT JOIN purchases p ON p.user_id = d.id
             AND p.approved_at IS NOT NULL
             AND p.cancelled_at IS NULL
           GROUP BY d.id
         ),
         -- Aggregate per direct child (leg)
         leg_totals AS (
           SELECT
             u.id as leg_owner_id,
             COALESCE(SUM(lp.volume), 0) as leg_volume
           FROM (
             SELECT id FROM users WHERE parent_id = ?
           ) u
           LEFT JOIN descendants d ON d.parent_id = u.id OR d.id = u.id
           LEFT JOIN purchases p ON p.user_id = d.id
             AND p.approved_at IS NOT NULL
             AND p.cancelled_at IS NULL
           GROUP BY u.id
         ),
         team_month AS (
           SELECT COALESCE(SUM(p.amount), 0)::float as month_total
           FROM descendants d
           INNER JOIN purchases p ON p.user_id = d.id
             AND p.approved_at IS NOT NULL
             AND p.cancelled_at IS NULL
             AND p.approved_at >= ?
         )
         SELECT
           (SELECT COUNT(*) FROM descendants)::int as team_count,
           (SELECT COALESCE(SUM(volume), 0)::float FROM leg_purchases) as team_business,
           (SELECT month_total FROM team_month) as team_business_month,
           COALESCE(
             (SELECT STRING_AGG(leg_volume::text, ',' ORDER BY leg_volume DESC) FROM leg_totals),
             ''
           ) as leg_volumes
        `,
        [userId, userId, startOfMonth]
      ),
    ])

    // Parse results
    const direct = directRes.rows[0]
    const myDirects = Number(direct.direct_count) || 0
    const directBusiness = Number(direct.direct_business) || 0

    const myBusiness = Number(personalRes.rows[0]?.total) || 0
    const myBusinessMonth = Number(personalMonthRes.rows[0]?.total) || 0

    const dRow = descendantRes.rows[0]
    const myTeam = Number(dRow.team_count) || 0
    const teamBusiness = Number(dRow.team_business) || 0
    const teamBusinessMonth = Number(dRow.team_business_month) || 0

    // Parse leg volumes string into sorted array
    const legVolumesStr = dRow.leg_volumes || ''
    const legVolumes: number[] = legVolumesStr ? legVolumesStr.split(',').map(Number) : []
    legVolumes.sort((a: number, b: number) => b - a)

    const powerToday = legVolumes.length > 0 ? legVolumes[0] : 0
    const weakerToday =
      legVolumes.length > 1 ? legVolumes.slice(1).reduce((a: number, b: number) => a + b, 0) : 0

    // Determine designation
    const designation = this.getDesignation(powerToday, weakerToday, legVolumes)

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
      designation,
    }
  }

  /**
   * Get admin dashboard stats (user counts + business totals)
   */
  static async getAdminMetrics() {
    const today = DateTime.now().startOf('day').toSQLDate()
    const startOfMonth = DateTime.now().startOf('month').toSQLDate()

    const [userStats, businessStats] = await Promise.all([
      db
        .from('users')
        .whereNot('role', 'admin')
        .select(
          db.raw('count(*) as total_users'),
          db.raw('count(case when activated_at is not null then 1 end) as active_users'),
          db.raw('count(case when created_at >= ? then 1 end) as today_users', [today]),
          db.raw('count(case when activated_at >= ? then 1 end) as today_active_users', [today]),
          db.raw('count(case when created_at >= ? then 1 end) as month_users', [startOfMonth]),
          db.raw('count(case when activated_at >= ? then 1 end) as month_active_users', [
            startOfMonth,
          ])
        )
        .first(),
      db
        .from('purchases')
        .whereNotNull('approved_at')
        .whereNull('cancelled_at')
        .select(
          db.raw('sum(amount) as total_business'),
          db.raw('sum(case when approved_at >= ? then amount else 0 end) as month_business', [
            startOfMonth,
          ]),
          db.raw('sum(case when approved_at >= ? then amount else 0 end) as today_business', [
            today,
          ])
        )
        .first(),
    ])

    return {
      totalUsers: Number(userStats.total_users),
      activeUsers: Number(userStats.active_users),
      todayUsers: Number(userStats.today_users),
      todayActiveUsers: Number(userStats.today_active_users),
      monthUsers: Number(userStats.month_users),
      monthActiveUsers: Number(userStats.month_active_users),
      business: {
        total: Number(businessStats.total_business) || 0,
        month: Number(businessStats.month_business) || 0,
        today: Number(businessStats.today_business) || 0,
      },
    }
  }

  private static getDesignation(power: number, weaker: number, _legVolumes: number[]): string {
    if (power === 0 || weaker === 0) return 'N/A'
    const total = power + weaker
    const descending = [
      { designation: 'King', criteria: 100000000000 },
      { designation: 'Emperor', criteria: 80000000000 },
      { designation: 'Master', criteria: 50000000000 },
      { designation: 'Supreme', criteria: 35000000000 },
      { designation: 'Legend', criteria: 25000000000 },
      { designation: 'Elite', criteria: 17000000000 },
      { designation: 'Royal', criteria: 12000000000 },
      { designation: 'Crown', criteria: 8000000000 },
      { designation: 'R Diamond', criteria: 3000000000 },
      { designation: 'C Diamond', criteria: 1000000000 },
      { designation: 'B Diamond', criteria: 500000000 },
      { designation: 'Diamond', criteria: 200000000 },
      { designation: 'Topaz', criteria: 100000000 },
      { designation: 'Sapphire', criteria: 50000000 },
      { designation: 'Ruby', criteria: 30000000 },
      { designation: 'Emerald', criteria: 10000000 },
      { designation: 'Platinum', criteria: 5000000 },
      { designation: 'Gold', criteria: 2500000 },
      { designation: 'Silver', criteria: 1000000 },
      { designation: 'Bronze', criteria: 500000 },
      { designation: 'Starter', criteria: 200000 },
    ]
    for (const rank of descending) {
      if (total >= rank.criteria && power >= rank.criteria * 0.6 && weaker >= rank.criteria * 0.4) {
        return rank.designation
      }
    }
    return 'N/A'
  }
}
