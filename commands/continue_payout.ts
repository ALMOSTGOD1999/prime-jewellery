import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import User from '#models/user'
import PayoutService from '#services/payout_service'
import RewardService from '#services/reward_service'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import PlatformConfig from '#models/platform_config'

export default class ContinuePayout extends BaseCommand {
  static commandName = 'payout:continue'
  static description = 'Continue working-wallet snapshot + payout from where it left off'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')
    const monthName = month.toFormat('LLLL yyyy')

    this.logger.info(`Continuing payout for ${monthStr}`)

    // 1. Finish snapshot creation for remaining users
    const users = await User.query().where('role', 'user').whereNotNull('activated_at')
    let created = 0
    let skipped = 0
    let zeroCount = 0
    let errorCount = 0

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      if ((i + 1) % 20 === 0 || i === 0 || i === users.length - 1) {
        this.logger.info(`Snapshot: ${i + 1}/${users.length}`)
      }

      const existing = await MonthlyIncomeSnapshot.query()
        .where('user_id', user.id)
        .where('month', month.toISODate()!)
        .first()

      if (existing) {
        skipped++
        continue
      }

      try {
        const grossAmount = await RewardService.getUserMonthlyWorkingIncome(user, month)

        if (grossAmount > 0) {
          await MonthlyIncomeSnapshot.create({
            userId: user.id,
            month,
            grossAmount,
            incomeWalletAmount: Math.round(grossAmount * PayoutService.INCOME_PERCENT * 100) / 100,
            repurchaseWalletAmount:
              Math.round(grossAmount * PayoutService.REPURCHASE_PERCENT * 100) / 100,
            paidOutAt: null,
          })
          created++
        } else {
          zeroCount++
        }
      } catch (e: any) {
        errorCount++
        this.logger.error(`Error user ${user.id}: ${e.message}`)
      }
    }

    this.logger.success(
      `Snapshots done: ${created} new, ${skipped} already existed, ${zeroCount} zero, ${errorCount} errors`
    )

    // 2. Credit wallets for all unpaid snapshots
    const snapshots = await MonthlyIncomeSnapshot.query()
      .where('month', month.toISODate()!)
      .whereNull('paid_out_at')

    this.logger.info(`Unpaid snapshots to credit: ${snapshots.length}`)

    let credited = 0
    let totalGross = 0

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i]
      if ((i + 1) % 20 === 0 || i === 0 || i === snapshots.length - 1) {
        this.logger.info(`Payout: ${i + 1}/${snapshots.length}`)
      }

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
        credited++
        totalGross += gross
      } catch (e: any) {
        this.logger.error(`Payout error user ${snapshot.userId}: ${e.message}`)
      }
    }

    await PlatformConfig.set(
      'working_wallet_payout_month',
      month.toFormat('yyyy-MM'),
      'payout',
      'Working Wallet Payout Month',
      'Last month for which working wallet payout was processed'
    )

    this.logger.success(
      `DONE: ${credited} users credited, total gross ₹${totalGross.toLocaleString('en-IN')}`
    )
  }
}
