import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import PayoutService from '#services/payout_service'

export default class FixFailedPayouts extends BaseCommand {
  static commandName = 'payout:fix-failed'
  static description = 'Credit wallets for snapshots that failed during bulk payout'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthName = month.toFormat('LLLL yyyy')

    const snapshots = await MonthlyIncomeSnapshot.query()
      .where('month', month.toISODate()!)
      .whereNull('paid_out_at')

    if (snapshots.length === 0) {
      this.logger.success('No unpaid snapshots — all users already credited!')
      return
    }

    this.logger.info(`Fixing ${snapshots.length} unpaid snapshots...`)

    for (const snapshot of snapshots) {
      const gross = Number(snapshot.grossAmount)
      const incomeAmount = Math.round(gross * PayoutService.INCOME_PERCENT * 100) / 100
      const repurchaseAmount = Math.round(gross * PayoutService.REPURCHASE_PERCENT * 100) / 100

      try {
        await PayoutService.creditIncomeWallet(
          snapshot.userId,
          incomeAmount,
          1,
          `Income wallet (70%) from working income for ${monthName}`
        )

        if (repurchaseAmount > 0) {
          const { default: WalletService } = await import('#services/wallet_service')
          await WalletService.creditRepurchaseWallet(
            snapshot.userId,
            repurchaseAmount,
            1,
            `Repurchase wallet (20%) from working income for ${monthName}`
          )
        }

        snapshot.paidOutAt = DateTime.now()
        await snapshot.save()
        this.logger.success(`Fixed user ${snapshot.userId}: gross ₹${gross}`)
      } catch (e: any) {
        this.logger.error(`Failed again for user ${snapshot.userId}: ${e.message}`)
      }
    }
  }
}
