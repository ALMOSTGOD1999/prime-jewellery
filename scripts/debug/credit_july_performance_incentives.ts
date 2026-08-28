import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import RewardService from '#services/reward_service'
import WalletService from '#services/wallet_service'
import { UserRoleEnum } from '#enums/user'
import { TransactionTypeEnum } from '#enums/transaction'
import User from '#models/user'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import router from '@adonisjs/core/services/router'

/**
 * Credit July 2026 Performance Incentives to all eligible users' wallets.
 *
 * Correct rule used here (and in the monthly scheduler):
 *  - Eligible users (per designation config) receive the incentive EVERY
 *    month; it is payable immediately (no pending state).
 *  - The first credit anchors the qualifying business. Within the next 3
 *    months the user must grow total business by 20%, otherwise from the
 *    4th month the incentive stops.
 *
 * For July this credits 70% to the working wallet and 20% to the repurchase
 * wallet (matching how monthly working income was already paid out) and
 * updates the July snapshots so totals stay consistent.
 *
 * Run: node ace credit-july-performance-incentives
 * Preview (no DB writes): node ace credit-july-performance-incentives --dry-run
 */
export default class CreditJulyPerformanceIncentives extends BaseCommand {
  static commandName = 'credit-july-performance-incentives'
  static description = 'Credit July 2026 Performance Incentives to eligible users wallets'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({
    description: 'Preview the credit plan without writing to the database',
  })
  declare dryRun: boolean

  async run() {
    const july = DateTime.fromISO('2026-07-01').startOf('month')
    const remark70 = 'Working wallet (70%) from Performance Incentive for July 2026'
    const remark20 = 'Repurchase wallet (20%) from Performance Incentive for July 2026'

    this.logger.info('  CREDIT JULY 2026 PERFORMANCE INCENTIVES')
    if (this.dryRun) {
      this.logger.info('  [DRY RUN] - no changes will be written to the database')
    }
    this.logger.info('')

    router.commit()

    // ---------------------------------------------------------------
    // Step 0: Backfill the qualifying business (first-credit anchor) on
    // paid salaries that predate the anchor capture (e.g. June records).
    // ---------------------------------------------------------------
    if (!this.dryRun) {
      const backfillResult = await db.rawQuery(`
        UPDATE salaries
        SET qualifying_business = (power + weaker), updated_at = NOW()
        WHERE status = 'paid'
          AND (qualifying_business IS NULL OR qualifying_business = 0)
      `)
      const backfilled = backfillResult[0]?.rowCount ?? 0
      this.logger.info(`  Backfilled qualifying business anchor on ${backfilled} paid salary(ies)`)
    }

    // ---------------------------------------------------------------
    // Step 1: Resolve the July incentive for every active user
    // (only needed while July incentives remain unresolved; once every
    // July salary is paid, Step 2 simply credits the outstanding ones)
    // ---------------------------------------------------------------
    const julyCounts = await db
      .from('salaries')
      .select('status')
      .where('created_at', '>=', july.startOf('month').toSQL()!)
      .where('created_at', '<=', july.endOf('month').toSQL()!)

    const julyPaid = julyCounts.filter((s: any) => s.status === 'paid').length
    const julyPending = julyCounts.filter((s: any) => s.status !== 'paid').length
    this.logger.info(`  July salaries so far: ${julyPaid} paid, ${julyPending} unresolved`)
    this.logger.info('')

    const users = await User.query()
      .whereNotNull('activatedAt')
      .andWhere('role', UserRoleEnum.USER)
      .andWhere('status', 'active')

    const creditedUsers: { user: User; reward: number }[] = []
    let already = 0
    let growthFailed = 0
    let skipped = 0

    if (this.dryRun || julyPending > 0) {
      for (const user of users) {
        try {
          const result = await RewardService.resolveMonthlySalary(user, july, {
            preview: this.dryRun,
          })

          if (result.status === 'credited') {
            creditedUsers.push({ user, reward: result.reward || 0 })
            this.logger.info(`  July incentive CREATED/PAID for user ${user.id}: ${result.reward}`)
          } else if (result.status === 'already-credited') {
            already++
          } else if (result.status === 'growth-failed') {
            growthFailed++
          } else {
            skipped++
          }
        } catch (error: any) {
          this.logger.error(`  Error for user ${user.id}: ${error.message}`)
        }
      }

      this.logger.info(
        `  Resolved: ${creditedUsers.length} credited, ${already} already credited, ` +
          `${growthFailed} growth not met, ${skipped} not eligible`
      )
      this.logger.info('')
    } else {
      this.logger.info('  All July salaries already resolved - skipping resolution loop')
      this.logger.info('')
    }

    if (this.dryRun) {
      let projectedWorking = 0
      let projectedRepurchase = 0
      for (const { reward } of creditedUsers) {
        projectedWorking += Math.round(reward * 0.7 * 100) / 100
        projectedRepurchase += Math.round(reward * 0.2 * 100) / 100
      }
      this.logger.info(
        `  [DRY RUN] Projected wallet credits: working ₹${projectedWorking.toFixed(2)} + ` +
          `repurchase ₹${projectedRepurchase.toFixed(2)} (${creditedUsers.length} users)`
      )
      return
    }

    // ---------------------------------------------------------------
    // Step 2: Credit 70% working + 20% repurchase and update snapshots.
    // Iterates ALL paid July salaries (not just ones resolved in this
    // run) so the command is idempotent and completes the job even if a
    // previous run paid the salaries but died before crediting wallets.
    // ---------------------------------------------------------------
    const paidJulySalaries = await db
      .from('salaries')
      .select('id', 'user_id as userId', 'power', 'weaker')
      .where('status', 'paid')
      .where('created_at', '>=', july.startOf('month').toSQL()!)
      .where('created_at', '<=', july.endOf('month').toSQL()!)

    let totalWorking = 0
    let totalRepurchase = 0
    let usersCredited = 0

    for (const salary of paidJulySalaries) {
      const info = RewardService.getSalaryInfo([
        Math.floor(Number(salary.power)),
        Math.floor(Number(salary.weaker)),
      ])
      const reward = info?.reward || 0
      if (reward <= 0) continue

      const working = Math.round(reward * 0.7 * 100) / 100
      const repurchase = Math.round(reward * 0.2 * 100) / 100

      // Idempotency: skip users already credited for this incentive
      const duplicate = await db
        .from('transactions')
        .where('user_id', salary.userId)
        .where('type', TransactionTypeEnum.WALLET_CREDIT)
        .where('remark', remark70)
        .first()

      if (duplicate) {
        this.logger.info(`  Already credited for user ${salary.userId} (${reward}) - skipping`)
        continue
      }

      if (working > 0) {
        await WalletService.creditWorkingWallet(salary.userId, working, 1, remark70)
        totalWorking += working
      }
      if (repurchase > 0) {
        await WalletService.creditRepurchaseWallet(salary.userId, repurchase, 1, remark20)
        totalRepurchase += repurchase
      }

      const snapshot = await MonthlyIncomeSnapshot.query()
        .where('user_id', salary.userId)
        .where('month', july.toISODate()!)
        .first()

      if (snapshot) {
        snapshot.grossAmount = Math.round((Number(snapshot.grossAmount) + reward) * 100) / 100
        snapshot.incomeWalletAmount =
          Math.round((Number(snapshot.incomeWalletAmount || 0) + working) * 100) / 100
        snapshot.repurchaseWalletAmount =
          Math.round((Number(snapshot.repurchaseWalletAmount || 0) + repurchase) * 100) / 100
        await snapshot.save()
      } else {
        await MonthlyIncomeSnapshot.create({
          userId: salary.userId,
          month: july,
          grossAmount: reward,
          incomeWalletAmount: working,
          repurchaseWalletAmount: repurchase,
          paidOutAt: DateTime.now(),
        })
      }

      usersCredited++
      this.logger.info(
        `  Credited user ${salary.userId}: reward ${reward} -> working ${working} + repurchase ${repurchase}`
      )
    }

    this.logger.info('')
    this.logger.info('  JULY 2026 PERFORMANCE INCENTIVE CREDIT COMPLETE')
    this.logger.info(`    Users credited: ${usersCredited}`)
    this.logger.info(`    Working wallet (70%): ${totalWorking.toFixed(2)}`)
    this.logger.info(`    Repurchase wallet (20%): ${totalRepurchase.toFixed(2)}`)
  }
}
