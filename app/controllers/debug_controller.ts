import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class DebugController {
  async payout({ response }: HttpContext) {
    const period = DateTime.now().minus({ months: 1 }).startOf('month')
    const periodEnd = period.endOf('month')

    const [purchaseStats, snapshotStats, distributionStats, investmentStats] = await Promise.all([
      // Check: approved purchases in June
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(amount),0)::float as total
         FROM purchases
         WHERE approved_at IS NOT NULL
         AND cancelled_at IS NULL
         AND approved_at >= ?
         AND approved_at <= ?`,
        [period.toSQL()!, periodEnd.toSQL()!]
      ),
      // Check: snapshots created for June
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(gross_amount),0)::float as total
         FROM monthly_income_snapshots
         WHERE month = ?`,
        [period.toISODate()!]
      ),
      // Check: investment distributions for June
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(return_amount),0)::float as total
         FROM investment_return_distributions
         WHERE period_month = ?`,
        [period.toISODate()!]
      ),
      // Check: active investments
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(amount),0)::float as total
         FROM investments
         WHERE status = 'active'`
      ),
    ])

    // Check a sample user's wallet
    const sampleUser = await db.rawQuery(
      `SELECT id, name, wallet_balance, income_wallet
       FROM users WHERE role = 'user' AND activated_at IS NOT NULL
       ORDER BY id LIMIT 3`
    )

    return response.json({
      period: period.toISODate(),
      purchases: purchaseStats.rows[0],
      snapshots: snapshotStats.rows[0],
      distributions: distributionStats.rows[0],
      investments: investmentStats.rows[0],
      sampleUsers: sampleUser.rows,
    })
  }
}
