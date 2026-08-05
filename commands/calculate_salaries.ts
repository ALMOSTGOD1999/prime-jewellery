import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { schedule } from 'adonisjs-scheduler'
import { DateTime } from 'luxon'

import { UserRoleEnum } from '#enums/user'
import User from '#models/user'
import RewardService from '#services/reward_service'
import env from '#start/env'
import router from '@adonisjs/core/services/router'

// @schedule((s) => s.everySecond()) // this is for testing the scheduler
// Run once a month: last day at 23:59
@schedule((s) => s.timezone(env.get('TZ')).lastDayOfMonth('23:59'))
export default class CalculateSalaries extends BaseCommand {
  static commandName = 'calculate:salaries'
  static description = 'Calculate performance incentive once a month (end of month)'
  static options: CommandOptions = { startApp: true }

  @args.string({ required: false, description: 'Month in YYYY-MM format (e.g. 2026-06)' })
  declare month?: string

  async run() {
    const targetMonth = this.month
      ? DateTime.fromISO(this.month + '-01').startOf('month')
      : DateTime.now().setZone(env.get('TZ')).startOf('month')

    this.logger.info(
      `Starting performance incentive calculation for ${targetMonth.toFormat('yyyy-MM')}...`
    )

    router.commit()

    const users = await User.query()
      .whereNotNull('activatedAt')
      .andWhere('role', UserRoleEnum.USER)
      .andWhere('status', 'active')

    // endDate = last day of target month (for purchase cutoff)
    const endDate = targetMonth.endOf('month')
    // createdAt = last day of target month at 23:59
    const createdAt = targetMonth.endOf('month').set({ hour: 23, minute: 59 })
    // Business accumulation window: trailing 6 months
    const windowStart = targetMonth.minus({ months: 5 }).startOf('month')

    let created = 0
    let paid = 0
    let expired = 0

    for (const user of users) {
      try {
        // Compute business within the trailing 6-month window
        const { power, weaker, legAmounts } = await RewardService.getPowerAndWeaker(
          user,
          endDate,
          windowStart
        )

        const currentBusiness = (legAmounts || []).reduce((sum: number, v: number) => sum + v, 0)

        // ---------------------------------------------------------------
        // Phase 1: Resolve pending incentives
        // Check if any pending incentive has achieved the 20% growth
        // requirement or has exceeded the 3-month conversion window.
        // ---------------------------------------------------------------
        const pendingSalaries = await user
          .related('salaries')
          .query()
          .where('status', 'pending')
          .orderBy('created_at', 'asc')

        for (const pending of pendingSalaries) {
          const createdMonth = pending.createdAt.startOf('month')
          const monthsSince = Math.floor(targetMonth.diff(createdMonth, 'months').months)

          const qualifyingBusiness = Number(pending.qualifyingBusiness) || 0

          // Check 20% growth requirement
          if (qualifyingBusiness > 0 && currentBusiness >= qualifyingBusiness * 1.2) {
            pending.status = 'paid'
            pending.paidAt = createdAt
            await pending.save()
            paid++
            this.logger.info(
              `Incentive PAID for user ${user.id}: ${pending.info?.designation} ` +
                `(business ${currentBusiness} >= ${(qualifyingBusiness * 1.2).toFixed(0)} = 1.2x qualifying)`
            )
          } else if (monthsSince >= 3) {
            // 3 months passed without achieving 20% growth — expire
            pending.status = 'expired'
            await pending.save()
            expired++
            this.logger.info(
              `Incentive EXPIRED for user ${user.id}: ${pending.info?.designation} ` +
                `(business ${currentBusiness} < ${(qualifyingBusiness * 1.2).toFixed(0)} after ${monthsSince} months)`
            )
          }
          // else: still within window, leave pending for next run
        }

        // ---------------------------------------------------------------
        // Phase 2: Create new pending incentive if eligible
        // ---------------------------------------------------------------
        const eligibleInfo = RewardService.getSalaryInfo(legAmounts || [])

        if (!eligibleInfo) {
          continue
        }

        // Check for max payouts per designation (max 6 times, paid only)
        // Also skip if already got a salary this month
        const history = await user.related('salaries').query().orderBy('createdAt', 'desc')

        const thisMonth = history.filter(
          (h) => h.createdAt.startOf('month').toISODate() === targetMonth.toISODate()
        )
        if (thisMonth.length > 0) continue

        const paidCount = history.filter(
          (h) => h.status === 'paid' && h.info?.criteria === eligibleInfo.criteria
        ).length

        if (paidCount >= 6) {
          continue
        }

        // Only one active pending incentive per designation at a time
        const pendingSameRank = history.some(
          (h) => h.status === 'pending' && h.info?.criteria === eligibleInfo.criteria
        )
        if (pendingSameRank) {
          continue
        }

        // Create pending Salary record — payout requires 20% growth within next 3 months
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
          `Incentive PENDING for user ${user.id}: ${eligibleInfo.designation} ` +
            `(qualifying business: ${currentBusiness}, must grow to ${(currentBusiness * 1.2).toFixed(0)} within 3 months)`
        )
      } catch (error) {
        this.logger.error(`Error calculating incentive for user ${user.id}: ${error.message}`)
      }
    }

    this.logger.info(
      `Performance incentive calculation completed. ` +
        `${created} pending created, ${paid} paid, ${expired} expired.`
    )
  }
}
