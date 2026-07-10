import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class DebugController {
  async payout({ response }: HttpContext) {
    const period = DateTime.now().minus({ months: 1 }).startOf('month')
    const periodEnd = period.endOf('month')

    const [
      purchaseStats,
      snapshotStats,
      snapshotPaid,
      distStats,
      invStats,
      recentTxns,
      sampleUser,
    ] = await Promise.all([
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(amount),0)::float as total
         FROM purchases WHERE approved_at IS NOT NULL AND cancelled_at IS NULL
         AND approved_at >= ? AND approved_at <= ?`,
        [period.toSQL()!, periodEnd.toSQL()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(gross_amount),0)::float as total
         FROM monthly_income_snapshots WHERE month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as total,
           count(*) FILTER (WHERE paid_out_at IS NOT NULL)::int as paid,
           count(*) FILTER (WHERE paid_out_at IS NULL)::int as unpaid,
           coalesce(sum(gross_amount) FILTER (WHERE paid_out_at IS NULL),0)::float as unpaid_amount
         FROM monthly_income_snapshots WHERE month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as count FROM investment_return_distributions WHERE period_month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(`SELECT count(*)::int as count FROM investments WHERE status = 'active'`),
      db.rawQuery(
        `SELECT id, user_id, amount, type, remark, created_at
         FROM transactions ORDER BY created_at DESC LIMIT 20`
      ),
      db.rawQuery(
        `SELECT id, name, wallet_balance, income_wallet
         FROM users WHERE role = 'user' AND activated_at IS NOT NULL
         ORDER BY id LIMIT 5`
      ),
    ])

    return response.json({
      period: period.toISODate(),
      purchases: purchaseStats.rows[0],
      snapshots: snapshotStats.rows[0],
      snapshotPaidStatus: snapshotPaid.rows[0],
      distributions: distStats.rows[0],
      investments: invStats.rows[0],
      sampleUsers: sampleUser.rows,
      recentTransactions: recentTxns.rows,
    })
  }
}
