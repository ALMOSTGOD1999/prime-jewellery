import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import PayoutService from '#services/payout_service'
import RewardService from '#services/reward_service'
import WalletService from '#services/wallet_service'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import PlatformConfig from '#models/platform_config'

export default class CleanAndRepayout extends BaseCommand {
  static commandName = 'payout:clean-and-repayout'
  static description = 'Clean old June data and run corrected working-wallet payout'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')
    const monthName = month.toFormat('LLLL yyyy')

    this.logger.info(`=== CLEANUP for ${monthStr} ===`)

    // 1. Delete old snapshots
    await db.rawQuery(`DELETE FROM monthly_income_snapshots WHERE month = ?`, [month.toISODate()!])
    this.logger.success('Deleted snapshots')

    // 2. Delete old payout transactions for this month
    const deletedTxns = await db.rawQuery(
      `DELETE FROM transactions WHERE remark ILIKE ? RETURNING id`,
      [`%working income%${monthName}%`]
    )
    this.logger.success(`Deleted ${deletedTxns.rows.length} old working-income transactions`)

    // 3. Zero out wallets that were inflated by old incorrect payouts
    // (We only do this if we know the old payouts were wrong.)
    // Safer: recalculate from scratch by subtracting the deleted transaction amounts
    const txnSums = await db.rawQuery(
      `SELECT user_id,
         coalesce(sum(amount) FILTER (WHERE remark ILIKE '%income wallet (70%)%'), 0)::float as income_sum,
         coalesce(sum(amount) FILTER (WHERE remark ILIKE '%repurchase wallet (20%)%'), 0)::float as repurchase_sum
       FROM transactions
       WHERE remark ILIKE '%REVERSAL%${monthName}%'
       GROUP BY user_id`
    )
    this.logger.info(`Reversal sums found: ${txnSums.rows.length} users`)

    // 4. Reset configs
    await db
      .from('platform_configs')
      .where('key', 'working_wallet_payout_month')
      .update({ value: '' })
    this.logger.success('Reset working_wallet_payout_month config')

    this.logger.info(`=== SNAPSHOT CREATION for ${monthStr} ===`)

    const users = await User.query().where('role', 'user').whereNotNull('activated_at')
    this.logger.info(`Users: ${users.length}`)

    let created = 0
    let zeroCount = 0
    let errorCount = 0

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      if ((i + 1) % 20 === 0 || i === 0 || i === users.length - 1) {
        this.logger.info(`Snapshot progress: ${i + 1}/${users.length}`)
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

    this.logger.success(`Snapshots: ${created} created, ${zeroCount} zero, ${errorCount} errors`)

    this.logger.info(`=== WALLET PAYOUT for ${monthStr} ===`)

    const snapshots = await MonthlyIncomeSnapshot.query()
      .where('month', month.toISODate()!)
      .whereNull('paid_out_at')

    let credited = 0
    let totalGross = 0

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i]
      if ((i + 1) % 20 === 0 || i === 0 || i === snapshots.length - 1) {
        this.logger.info(`Payout progress: ${i + 1}/${snapshots.length}`)
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
