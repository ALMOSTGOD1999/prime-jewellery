import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class ShowPayoutSummary extends BaseCommand {
  static commandName = 'payout:show-summary'
  static description = 'Show detailed payout summary for June 2026'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthName = month.toFormat('LLLL yyyy')

    // Income wallet transactions
    const incomeTxns = await db.rawQuery(
      `SELECT user_id, u.name, t.amount, t.remark
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.remark ILIKE '%investment return%${monthName}%'
       ORDER BY t.amount DESC
       LIMIT 20`
    )

    // Working wallet transactions
    const workingTxns = await db.rawQuery(
      `SELECT user_id, u.name, t.amount, t.remark
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.remark ILIKE '%working income%${monthName}%'
         AND t.remark ILIKE '%income wallet (70%)%'
       ORDER BY t.amount DESC
       LIMIT 20`
    )

    // Top earners combined
    const topEarners = await db.rawQuery(
      `SELECT t.user_id, u.name,
         coalesce(sum(t.amount) FILTER (WHERE t.remark ILIKE '%investment return%'), 0)::float as income_return,
         coalesce(sum(t.amount) FILTER (WHERE t.remark ILIKE '%working income%'), 0)::float as working_income
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.remark ILIKE '%${monthName}%'
         AND (t.remark ILIKE '%investment return%' OR t.remark ILIKE '%working income%')
         AND t.remark ILIKE '%income wallet (70%)%'
       GROUP BY t.user_id, u.name
       ORDER BY (coalesce(sum(t.amount) FILTER (WHERE t.remark ILIKE '%investment return%'), 0) + coalesce(sum(t.amount) FILTER (WHERE t.remark ILIKE '%working income%'), 0)) DESC
       LIMIT 15`
    )

    this.logger.info('=== INCOME WALLET (3% Investment Return) ===')
    for (const row of incomeTxns.rows) {
      this.logger.info(`User ${row.user_id} (${row.name}): ₹${Number(row.amount).toLocaleString('en-IN')} — ${row.remark}`)
    }

    this.logger.info('')
    this.logger.info('=== WORKING WALLET (Commissions) ===')
    for (const row of workingTxns.rows) {
      this.logger.info(`User ${row.user_id} (${row.name}): ₹${Number(row.amount).toLocaleString('en-IN')} — ${row.remark}`)
    }

    this.logger.info('')
    this.logger.info('=== TOP EARNERS (Combined) ===')
    for (const row of topEarners.rows) {
      const total = Number(row.income_return) + Number(row.working_income)
      this.logger.info(
        `User ${row.user_id} (${row.name}): income ₹${Number(row.income_return).toLocaleString('en-IN')}, working ₹${Number(row.working_income).toLocaleString('en-IN')}, total ₹${total.toLocaleString('en-IN')}`
      )
    }
  }
}
