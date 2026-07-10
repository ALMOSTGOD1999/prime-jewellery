import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import PayoutService from '#services/payout_service'
import RewardService from '#services/reward_service'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import PlatformConfig from '#models/platform_config'

export default class RunWorkingPayout extends BaseCommand {
  static commandName = 'payout:run-working'
  static description = 'Run corrected working-wallet payout for previous month'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')

    this.logger.info(`Month: ${monthStr}`)

    // Check if already done
    const alreadyPaid = await PlatformConfig.get('working_wallet_payout_month')
    if (alreadyPaid === monthStr) {
      this.logger.warning('Working payout already marked complete for ' + monthStr)
      return
    }

    const users = await User.query().where('role', 'user').whereNotNull('activated_at')
    this.logger.info(`Users to process: ${users.length}`)

    let created = 0
    let skipped = 0
    let errorCount = 0

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      if ((i + 1) % 10 === 0 || i === users.length - 1) {
        this.logger.info(`Progress: ${i + 1}/${users.length}`)
      }

      const existing = await MonthlyIncomeSnapshot.query()
        .where('user_id', user.id)
        .where('month', month.toISODate()!)
        .first()

      if (existing && existing.paidOutAt) {
        skipped++
        continue
      }

      try {
        const grossAmount = await RewardService.getUserMonthlyWorkingIncome(user, month)

        if (existing && !existing.paidOutAt) {
          // Update unpaid snapshot
          existing.grossAmount = grossAmount
          existing.incomeWalletAmount = Math.round(grossAmount * PayoutService.INCOME_PERCENT * 100) / 100
          existing.repurchaseWalletAmount = Math.round(grossAmount * PayoutService.REPURCHASE_PERCENT * 100) / 100
          await existing.save()
          created++
        } else if (grossAmount > 0) {
          await MonthlyIncomeSnapshot.create({
            userId: user.id,
            month,
            grossAmount,
            incomeWalletAmount: Math.round(grossAmount * PayoutService.INCOME_PERCENT * 100) / 100,
            repurchaseWalletAmount: Math.round(grossAmount * PayoutService.REPURCHASE_PERCENT * 100) / 100,
            paidOutAt: null,
          })
          created++
        }
      } catch (e: any) {
        errorCount++
        this.logger.error(`Error for user ${user.id}: ${e.message}`)
      }
    }

    this.logger.success(`Snapshots created/updated: ${created}, skipped: ${skipped}, errors: ${errorCount}`)

    // Now credit wallets
    const snapshots = await MonthlyIncomeSnapshot.query()
      .where('month', month.toISODate()!)
      .whereNull('paid_out_at')

    let credited = 0
    let totalAmount = 0

    for (const snapshot of snapshots) {
      const gross = Number(snapshot.grossAmount)
      const incomeAmount = Math.round(gross * PayoutService.INCOME_PERCENT * 100) / 100
      const repurchaseAmount = Math.round(gross * PayoutService.REPURCHASE_PERCENT * 100) / 100

      await PayoutService.creditIncomeWallet(
        snapshot.userId,
        incomeAmount,
        1,
        `Income wallet (70%) from working income for ${month.toFormat('LLLL yyyy')}`
      )
      if (repurchaseAmount > 0) {
        await db.transaction(async (trx) => {
          const user = await User.query({ client: trx }).where('id', snapshot.userId).firstOrFail()
          user.walletBalance = Number(user.walletBalance ?? 0) + repurchaseAmount
          await user.save()
          await (await import('#models/transaction')).default.create(
            {
              userId: snapshot.userId,
              type: 'wallet_credit',
              amount: repurchaseAmount,
              remark: `Repurchase wallet (20%) from working income for ${month.toFormat('LLLL yyyy')}`,
              approvedAt: DateTime.now(),
            },
            { client: trx }
          )
        })
      }

      snapshot.paidOutAt = DateTime.now()
      await snapshot.save()
      credited++
      totalAmount += gross
    }

    await PlatformConfig.set(
      'working_wallet_payout_month',
      month.toFormat('yyyy-MM'),
      'payout',
      'Working Wallet Payout Month',
      'Last month for which working wallet payout was processed'
    )

    this.logger.success(
      `Payout complete: ${credited} users credited, total gross ₹${totalAmount.toLocaleString('en-IN')}`
    )
  }
}
