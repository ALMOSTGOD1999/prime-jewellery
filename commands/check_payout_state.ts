import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class CheckPayoutState extends BaseCommand {
  static commandName = 'payout:check-state'
  static description = 'Check current payout state for previous month'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')

    const snap = await db.rawQuery(
      `SELECT count(*)::int as total, coalesce(sum(gross_amount),0)::float as gross FROM monthly_income_snapshots WHERE month = ?`,
      [month.toISODate()!]
    )
    const cfg = await db.from('platform_configs').where('key', 'working_wallet_payout_month').first()
    const txn = await db.rawQuery(
      `SELECT count(*)::int as total FROM transactions WHERE remark ILIKE ?`,
      [`%working income%for ${month.toFormat('LLLL yyyy')}%`]
    )

    this.logger.info(`Month: ${monthStr}`)
    this.logger.info(`Snapshots: ${snap.rows[0].total}, gross ₹${Number(snap.rows[0].gross).toLocaleString('en-IN')}`)
    this.logger.info(`Working config: ${cfg?.value || 'unset'}`)
    this.logger.info(`Working transactions: ${txn.rows[0].total}`)

    if (Number(snap.rows[0].total) === 0 && (cfg?.value || '') === '') {
      this.logger.warning('Working wallet payout NOT YET RUN for this month')
    } else if (Number(snap.rows[0].total) > 0 && (cfg?.value || '') === monthStr) {
      this.logger.success('Working wallet payout APPEARS COMPLETE for this month')
    } else {
      this.logger.warning('State is inconsistent — may need cleanup or re-run')
    }
  }
}
