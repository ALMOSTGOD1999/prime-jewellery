import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import User from '#models/user'
import RewardService from '#services/reward_service'
import router from '@adonisjs/core/services/router'

/**
 * READ-ONLY. Prints the July 2026 component breakdown for specific users
 * using the real (fixed) reward code.
 *
 * Run: node ace debug-components
 */
export default class DebugComponents extends BaseCommand {
  static commandName = 'debug-components'
  static description = 'Print July 2026 working income component breakdown for selected users'
  static options: CommandOptions = { startApp: true }

  async run() {
    const july = DateTime.fromISO('2026-07-01').startOf('month')
    const monthStart = july.startOf('month')
    const monthEnd = july.endOf('month')
    const monthStr = july.toFormat('yyyy-MM')

    router.commit()

    const ids = [914883, 733333, 444473, 595444, 408872, 705745, 512416]

    for (const uid of ids) {
      const user = await User.find(uid)
      if (!user) {
        this.logger.info(`user ${uid}: not found`)
        continue
      }

      let cb = 0
      if (user.activatedAt) {
        const actAmt = Number(user.activationAmount) || 1000
        const monthlyCashback = (actAmt * 0.1) / 2
        const activatedAt = DateTime.fromJSDate(new Date(user.activatedAt.toString()))
        const m1 = activatedAt.plus({ months: 1 })
        const m2 = activatedAt.plus({ months: 2 })
        if (monthEnd >= m1 && m1.toFormat('yyyy-MM') === monthStr) cb += monthlyCashback
        if (monthEnd >= m2 && m2.toFormat('yyyy-MM') === monthStr) cb += monthlyCashback
      }

      const directChildren = await user.related('children').query()
      let sponsor = 0
      if (directChildren.length > 0) {
        const sponsorCountRes = await user
          .related('children')
          .query()
          .whereNotNull('activated_at')
          .whereBetween('activated_at', [monthStart.toSQL()!, monthEnd.toSQL()!])
          .count('* as total')
        sponsor =
          Number(sponsorCountRes[0].$extras.total) * ((Number(user.activationAmount) || 1000) * 0.1)
      }

      const level = await RewardService.getLevelRewards(user, { limit: 1, asOf: monthEnd })
      const emi = await RewardService.getEmiLevelRewards(user, { limit: 1, asOf: monthEnd })
      const actEnd = await RewardService.getActivationLevelRewards(user, { limit: 1, asOf: monthEnd })
      const actStart = await RewardService.getActivationLevelRewards(user, {
        limit: 1,
        asOf: monthStart.minus({ days: 1 }),
      })
      const actDelta = Math.max(0, actEnd.stats.totalEligible - actStart.stats.totalEligible)

      const salaries = await user
        .related('salaries')
        .query()
        .where('status', 'paid')
        .whereBetween('paid_at', [monthStart.toSQL()!, monthEnd.toSQL()!])
      const salary = salaries.reduce((sum, s) => sum + (s.info?.reward || 0), 0)

      const total = Math.round(
        (cb + sponsor + actDelta + (level.stats.thisMonthRewards || 0) + (emi.stats.thisMonthRewards || 0) + salary) * 100
      ) / 100

      this.logger.info(
        `user ${uid}: cashback=${cb} sponsor=${sponsor} actLevel=${actDelta} ` +
          `level=${level.stats.thisMonthRewards} emi=${emi.stats.thisMonthRewards} salary=${salary} => TOTAL ${total}`
      )
    }
  }
}
