import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import PlatformConfig from '#models/platform_config'

export default class CheckIncomeState extends BaseCommand {
  static commandName = 'payout:check-income'
  static description = 'Check income wallet payout state'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')
    const monthName = month.toFormat('LLLL yyyy')

    const cfg = await PlatformConfig.get('income_wallet_payout_month')

    const dists = await db.rawQuery(
      `SELECT count(*)::int as total, coalesce(sum(return_amount),0)::float as gross FROM investment_return_distributions WHERE period_month = ?`,
      [month.toISODate()!]
    )

    const paidDists = await db.rawQuery(
      `SELECT count(*)::int as total FROM investment_return_distributions WHERE period_month = ? AND paid_out_at IS NOT NULL`,
      [month.toISODate()!]
    )

    const txns = await db.rawQuery(
      `SELECT count(*)::int as total, coalesce(sum(amount),0)::float as amount FROM transactions WHERE remark ILIKE ?`,
      [`%investment return%${monthName}%`]
    )

    this.logger.info(`Month: ${monthStr}`)
    this.logger.info(`Config: ${cfg || 'unset'}`)
    this.logger.info(`Distributions: ${dists.rows[0].total} total, gross ₹${Number(dists.rows[0].gross).toLocaleString('en-IN')}`)
    this.logger.info(`Paid distributions: ${paidDists.rows[0].total}`)
    this.logger.info(`Transactions: ${txns.rows[0].total}, amount ₹${Number(txns.rows[0].amount).toLocaleString('en-IN')}`)

    if (cfg === monthStr && paidDists.rows[0].total > 0) {
      this.logger.success('Income wallet payout APPEARS COMPLETE')
    } else if (dists.rows[0].total > 0 && paidDists.rows[0].total === 0) {
      this.logger.warning('Distributions exist but NOT YET PAID OUT')
    } else if (dists.rows[0].total === 0) {
      this.logger.warning('No distributions exist for this month')
    }
  }
}
