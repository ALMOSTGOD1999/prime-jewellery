import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import PayoutService from '#services/payout_service'
import PlatformConfig from '#models/platform_config'

export default class DeleteAndRepayout extends BaseCommand {
  static commandName = 'payout:delete-and-repayout'
  static description = 'Delete old June snapshots and run corrected working-wallet payout'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')

    this.logger.info(`Target month: ${monthStr}`)

    // 1. Check current state
    const snapCount = await db.rawQuery(
      `SELECT count(*)::int as total FROM monthly_income_snapshots WHERE month = ?`,
      [month.toISODate()!]
    )
    const txnCount = await db.rawQuery(
      `SELECT count(*)::int as total FROM transactions WHERE remark ILIKE '%working income%${month.toFormat('LLLL yyyy')}%'`
    )
    const incomeConfig = await PlatformConfig.get('income_wallet_payout_month')
    const workingConfig = await PlatformConfig.get('working_wallet_payout_month')

    this.logger.info(`Existing snapshots: ${snapCount.rows[0].total}`)
    this.logger.info(`Existing working transactions: ${txnCount.rows[0].total}`)
    this.logger.info(`Income wallet config: ${incomeConfig || 'unset'}`)
    this.logger.info(`Working wallet config: ${workingConfig || 'unset'}`)

    // 2. Delete old snapshots
    await db.rawQuery(`DELETE FROM monthly_income_snapshots WHERE month = ?`, [month.toISODate()!])
    this.logger.success('Deleted old snapshots for ' + monthStr)

    // 3. Reset working wallet config so it can be reprocessed
    await db
      .from('platform_configs')
      .where('key', 'working_wallet_payout_month')
      .update({ value: '' })
    this.logger.success('Reset working_wallet_payout_month config')

    // 4. Run working wallet payout
    // Admin ID = 1 (system/admin)
    const result = await PayoutService.processWorkingWalletPayout(month, 1)
    this.logger.success(
      `Working payout done: ${result.credited} users, total gross ₹${result.totalAmount.toLocaleString('en-IN')}`
    )

    // 5. Final state
    const finalSnap = await db.rawQuery(
      `SELECT count(*)::int as total, coalesce(sum(gross_amount),0)::float as gross FROM monthly_income_snapshots WHERE month = ?`,
      [month.toISODate()!]
    )
    this.logger.info(
      `Final snapshots: ${finalSnap.rows[0].total}, total gross ₹${Number(finalSnap.rows[0].gross).toLocaleString('en-IN')}`
    )
  }
}
