import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class AdminPayoutHistoryController {
  async index({ inertia, request }: HttpContext) {
    const qs = request.qs() as Record<string, string>
    const month = qs.month || DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM')
    const page = Math.max(1, Number(qs.page || 1))
    const limit = 50
    const offset = (page - 1) * limit

    // Get available months (from transactions and snapshots)
    const months = await db.rawQuery(
      `SELECT DISTINCT to_char(created_at, 'YYYY-MM') as month
       FROM transactions
       WHERE remark ILIKE '%working income%' OR remark ILIKE '%investment return%'
       UNION
       SELECT DISTINCT to_char(month, 'YYYY-MM') as month
       FROM monthly_income_snapshots
       WHERE paid_out_at IS NOT NULL
       ORDER BY month DESC`
    )

    // Get payout transactions for selected month
    const txns = await db.rawQuery(
      `SELECT t.id, t.user_id, u.name as user_name, t.amount, t.type, t.remark, t.created_at
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE (
         (t.remark ILIKE '%working income for ' || ? || '%')
         OR (t.remark ILIKE '%investment return for ' || ? || '%')
         OR (t.remark ILIKE '%REVERSAL%' || ? || '%')
       )
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [month, month, month, limit, offset]
    )

    // Count total
    const countResult = await db.rawQuery(
      `SELECT count(*)::int as total FROM transactions
       WHERE (
         (remark ILIKE '%working income for ' || ? || '%')
         OR (remark ILIKE '%investment return for ' || ? || '%')
         OR (remark ILIKE '%REVERSAL%' || ? || '%')
       )`,
      [month, month, month]
    )

    // Summary for selected month
    const summary = await db.rawQuery(
      `SELECT
         count(*)::int as total_txns,
         count(DISTINCT user_id)::int as unique_users,
         coalesce(sum(amount) FILTER (WHERE type = 'wallet_credit'), 0)::float as total_credited,
         coalesce(sum(amount) FILTER (WHERE type = 'wallet_debit'), 0)::float as total_reversed
       FROM transactions
       WHERE (
         (remark ILIKE '%working income for ' || ? || '%')
         OR (remark ILIKE '%investment return for ' || ? || '%')
         OR (remark ILIKE '%REVERSAL%' || ? || '%')
       )`,
      [month, month, month]
    )

    const totalRecords = countResult.rows[0].total

    return inertia.render('admin/payout/history', {
      months: months.rows.map((r: any) => r.month),
      selectedMonth: month,
      summary: summary.rows[0],
      transactions: {
        page,
        perPage: limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        data: txns.rows,
      },
    })
  }
}
