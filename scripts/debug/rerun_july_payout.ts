import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import PayoutService from '#services/payout_service'
import RewardService from '#services/reward_service'
import WalletService from '#services/wallet_service'
import { UserRoleEnum } from '#enums/user'
import User from '#models/user'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import PlatformConfig from '#models/platform_config'
import router from '@adonisjs/core/services/router'

/**
 * Re-run July 2026 payouts after revert, applying updated Level Income and
 * Performance Incentive rules. Should be run after `node ace revert-july-payout`.
 *
 * Steps:
 *   1. Run salary calculation for July (creates new pending salary records
 *      with new 60:40 rules and new rank tiers)
 *   2. Process cashback (income wallet) payout — distributes investment returns,
 *      credits 70% income + 20% repurchase
 *   3. Process working wallet payout — snapshots monthly working income
 *      (now including new Level Income + paid Performance Incentive),
 *      credits 70% working + 20% repurchase
 *
 * Run: node ace rerun-july-payout
 */
export default class RerunJulyPayout extends BaseCommand {
  static commandName = 'rerun-july-payout'
  static description = 'Re-run July 2026 payouts with updated Level Income and Performance Incentive rules'
  static options: CommandOptions = { startApp: true }

  async run() {
    const july = DateTime.fromISO('2026-07-01').startOf('month')
    const monthStr = july.toFormat('yyyy-MM')

    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  RE-RUN JULY 2026 PAYOUTS')
    this.logger.info('  With updated Level Income + Performance Incentive')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('')

    // ─── Step 1: Calculate Salaries (Performance Incentive) ───
    this.logger.info('─── Step 1: Calculating Performance Incentive (Salaries) ───')

    router.commit()

    const targetMonth = july

    const users = await User.query()
      .whereNotNull('activatedAt')
      .andWhere('role', UserRoleEnum.USER)
      .andWhere('status', 'active')

    let incentives = 0
    let already = 0
    let growthFailed = 0
    let skipped = 0

    for (const user of users) {
      try {
        const result = await RewardService.resolveMonthlySalary(user, targetMonth)

        if (result.status === 'credited') {
          incentives++
          this.logger.info(
            `  Incentive CREDITED for user ${user.id}: reward ${result.reward} ` +
              `(credited to wallet via the monthly payout snapshot flow)`
          )
        } else if (result.status === 'already-credited') {
          already++
        } else if (result.status === 'growth-failed') {
          growthFailed++
          this.logger.info(
            `  Incentive SKIPPED for user ${user.id}: 20% growth target not met since first credit`
          )
        } else {
          skipped++
        }
      } catch (error: any) {
        this.logger.error(`  Error for user ${user.id}: ${error.message}`)
      }
    }

    this.logger.info(
      `  Salaries: ${incentives} credited, ${already} already credited, ` +
        `${growthFailed} growth not met, ${skipped} not eligible`
    )
    this.logger.info('')

    // ─── Step 2: Process Cashback (Income Wallet) Payout ───
    this.logger.info('─── Step 2: Processing Cashback (Income Wallet) Payout ───')

    try {
      const incomeResult = await PayoutService.processIncomeWalletPayout(july, 1)
      this.logger.success(
        `  Cashback payout complete: ${incomeResult.processed} distributions paid`
      )
    } catch (error: any) {
      this.logger.error(`  Cashback payout failed: ${error.message}`)
      this.logger.info('  Continuing with working wallet payout...')
    }

    this.logger.info('')

    // ─── Step 3: Process Working Wallet Payout ───
    // Credit each snapshot in its OWN transaction to avoid the giant
    // single-transaction approach that times out Neon connections (~180s).
    this.logger.info('─── Step 3: Processing Working Wallet Payout ───')

    try {
      // 3a: Ensure snapshots exist (fast — skips existing)
      const snapResult = await PayoutService.snapshotMonthlyIncomes(july)
      this.logger.info(`  Snapshots created: ${snapResult.created} (skipped existing)`)

      // 3b: Credit each unpaid snapshot individually
      const unpaidSnapshots = await MonthlyIncomeSnapshot.query()
        .where('month', july.toISODate()!)
        .whereNull('paid_out_at')

      this.logger.info(`  Unpaid snapshots to credit: ${unpaidSnapshots.length}`)
      let credited = 0
      let totalAmount = 0

      for (const snapshot of unpaidSnapshots) {
        const snapStart = Date.now()
        try {
          // Skip inactive users
          const snapUser = await User.query().where('id', snapshot.userId).first()
          if (!snapUser || snapUser.status === 'inactive') {
            snapshot.paidOutAt = DateTime.now()
            await snapshot.save()
            this.logger.info(
              `  Snapshot ${snapshot.userId}: skipped (inactive)`
            )
            continue
          }

          const gross = Number(snapshot.grossAmount)
          const incomeAmount = Math.round(gross * 0.7 * 100) / 100
          const repurchaseAmount = Math.round(gross * 0.2 * 100) / 100

          // Each credit runs in its own transaction (no client param = standalone txn)
          await WalletService.creditWorkingWallet(
            snapshot.userId,
            incomeAmount,
            1,
            `Working wallet (70%) from working income for ${july.toFormat('LLLL yyyy')}`
          )
          if (repurchaseAmount > 0) {
            await WalletService.creditRepurchaseWallet(
              snapshot.userId,
              repurchaseAmount,
              1,
              `Repurchase wallet (20%) from working income for ${july.toFormat('LLLL yyyy')}`
            )
          }

          snapshot.paidOutAt = DateTime.now()
          await snapshot.save()
          credited++
          totalAmount += gross
          this.logger.info(
            `  Snapshot ${snapshot.userId}: ₹${gross.toLocaleString('en-IN')} (${Date.now() - snapStart}ms)`
          )
        } catch (error: any) {
          this.logger.error(
            `  Snapshot ${snapshot.userId}: FAILED (${Date.now() - snapStart}ms): ${error.message}`
          )
        }
      }

      // 3c: Record payout month
      await PlatformConfig.set(
        'working_wallet_payout_month',
        july.toFormat('yyyy-MM'),
        'payout',
        'Working Wallet Payout Month',
        'Last month for which working wallet payout was processed'
      )

      this.logger.success(
        `  Working payout complete: ${credited} users credited, gross ₹${totalAmount.toLocaleString('en-IN')}`
      )
    } catch (error: any) {
      this.logger.error(`  Working payout failed: ${error.message}`)
    }

    // ─── Summary ───
    this.logger.info('')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  JULY 2026 PAYOUT RE-RUN COMPLETE')
    this.logger.info('══════════════════════════════════════════════════')

    const snapCount = await db.rawQuery(
      `SELECT count(*)::int as total, coalesce(sum(gross_amount),0)::float as gross FROM monthly_income_snapshots WHERE month = ?`,
      [july.toISODate()!]
    )
    const salaryCount = await db.rawQuery(
      `SELECT count(*)::int as total FROM salaries WHERE created_at >= ? AND created_at <= ?`,
      [july.startOf('month').toSQL()!, july.endOf('month').toSQL()!]
    )
    const distCount = await db.rawQuery(
      `SELECT count(*)::int as total FROM investment_return_distributions WHERE period_month = ? AND paid_out_at IS NOT NULL`,
      [july.toISODate()!]
    )

    this.logger.info(`  Income payouts:    ${distCount.rows[0]?.total || 0} distributions`)
    this.logger.info(`  Working payouts:   ${snapCount.rows[0]?.total || 0} snapshots (gross ₹${Number(snapCount.rows[0]?.gross || 0).toLocaleString('en-IN')})`)
    this.logger.info(`  Salaries created:  ${salaryCount.rows[0]?.total || 0}`)
    this.logger.info(`  Month:             ${monthStr}`)
    this.logger.info('══════════════════════════════════════════════════')
  }
}
