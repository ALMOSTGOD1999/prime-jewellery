import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import PayoutService from '#services/payout_service'
import RewardService from '#services/reward_service'
import { UserRoleEnum } from '#enums/user'
import User from '#models/user'
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
    const endDate = targetMonth.endOf('month')
    const createdAt = targetMonth.endOf('month').set({ hour: 23, minute: 59 })
    const windowStart = targetMonth.minus({ months: 5 }).startOf('month')

    const users = await User.query()
      .whereNotNull('activatedAt')
      .andWhere('role', UserRoleEnum.USER)
      .andWhere('status', 'active')

    let created = 0
    let paid = 0
    let expired = 0

    for (const user of users) {
      try {
        const { power, weaker, legAmounts } = await RewardService.getPowerAndWeaker(
          user,
          endDate,
          windowStart
        )

        const currentBusiness = (legAmounts || []).reduce((sum: number, v: number) => sum + v, 0)

        // Phase 1: Resolve pending incentives
        const pendingSalaries = await user
          .related('salaries')
          .query()
          .where('status', 'pending')
          .orderBy('created_at', 'asc')

        for (const pending of pendingSalaries) {
          const createdMonth = pending.createdAt.startOf('month')
          const monthsSince = Math.floor(targetMonth.diff(createdMonth, 'months').months)
          const qualifyingBusiness = Number(pending.qualifyingBusiness) || 0

          if (qualifyingBusiness > 0 && currentBusiness >= qualifyingBusiness * 1.2) {
            pending.status = 'paid'
            pending.paidAt = createdAt
            await pending.save()
            paid++
            this.logger.info(
              `  Incentive PAID for user ${user.id}: ${pending.info?.designation} ` +
                `(business ${currentBusiness} >= ${(qualifyingBusiness * 1.2).toFixed(0)})`
            )
          } else if (monthsSince >= 3) {
            pending.status = 'expired'
            await pending.save()
            expired++
            this.logger.info(
              `  Incentive EXPIRED for user ${user.id}: ${pending.info?.designation} ` +
                `(business ${currentBusiness} < ${(qualifyingBusiness * 1.2).toFixed(0)} after ${monthsSince} months)`
            )
          }
        }

        // Phase 2: Create new pending incentive if eligible
        const eligibleInfo = RewardService.getSalaryInfo(legAmounts || [])
        if (!eligibleInfo) continue

        const history = await user.related('salaries').query().orderBy('createdAt', 'desc')
        const thisMonth = history.filter(
          (h) => h.createdAt.startOf('month').toISODate() === targetMonth.toISODate()
        )
        if (thisMonth.length > 0) continue

        const paidCount = history.filter(
          (h) => h.status === 'paid' && h.info?.criteria === eligibleInfo.criteria
        ).length
        if (paidCount >= 6) continue

        const pendingSameRank = history.some(
          (h) => h.status === 'pending' && h.info?.criteria === eligibleInfo.criteria
        )
        if (pendingSameRank) continue

        await user.related('salaries').create({
          power: Math.floor(power),
          weaker: Math.floor(weaker),
          status: 'pending',
          qualifyingBusiness: Math.floor(currentBusiness),
          createdAt,
          updatedAt: createdAt,
        })

        created++
        this.logger.info(
          `  Incentive PENDING for user ${user.id}: ${eligibleInfo.designation} ` +
            `(qualifying business: ${currentBusiness}, must grow to ${(currentBusiness * 1.2).toFixed(0)} within 3 months)`
        )
      } catch (error: any) {
        this.logger.error(`  Error for user ${user.id}: ${error.message}`)
      }
    }

    this.logger.info(
      `  Salaries: ${created} pending created, ${paid} paid, ${expired} expired`
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
    this.logger.info('─── Step 3: Processing Working Wallet Payout ───')

    try {
      const workingResult = await PayoutService.processWorkingWalletPayout(july, 1)
      this.logger.success(
        `  Working payout complete: ${workingResult.credited} users credited, gross ₹${workingResult.totalAmount.toLocaleString('en-IN')}`
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
