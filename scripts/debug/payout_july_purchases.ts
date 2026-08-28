import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

import PayoutService from '#services/payout_service'
import User from '#models/user'

/**
 * One-off: run the July 2026 cashback (income) wallet payout after purchases
 * were backfilled into investments (migration 1796000000001).
 *
 * The payout is re-run safe: already-paid distributions are skipped, so this
 * only credits the newly created per-purchase investments (prorated from each
 * purchase's date).
 *
 * Run: node ace payout:july-purchases
 */
export default class PayoutJulyPurchases extends BaseCommand {
  static commandName = 'payout:july-purchases'
  static description =
    'Run the July 2026 income (cashback) wallet payout for investments created from gold purchases'
  static options: CommandOptions = { startApp: true }

  async run() {
    // Select only the id — the avatar attachment computes its URL eagerly,
    // which fails in console/CLI contexts (no HTTP routes are registered).
    const admin = await User.query()
      .select('id')
      .where('role', 'admin')
      .orderBy('id', 'asc')
      .first()
    if (!admin) {
      this.logger.error('No admin user found — cannot run the payout.')
      return
    }

    const period = DateTime.fromISO('2026-07-01')
    this.logger.info(`Processing income (cashback) payout for ${period.toFormat('yyyy-MM')}...`)

    const result = await PayoutService.processIncomeWalletPayout(period, admin.id)

    this.logger.success(
      `Income payout for ${result.month} done. Processed: ${result.processed} distribution(s).`
    )
  }
}
