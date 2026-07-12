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
  declare month: string | null

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

    let created = 0

    for (const user of users) {
      try {
        const { power, weaker, legAmounts } = await RewardService.getPowerAndWeaker(user, endDate)

        const eligibleInfo = RewardService.getSalaryInfo(legAmounts || [])

        if (!eligibleInfo) {
          continue
        }

        // Check for max payouts per designation (max 6 times)
        // Also skip if already got a salary this month
        const history = await user.related('salaries').query().orderBy('createdAt', 'desc')

        const thisMonth = history.filter(
          (h) => h.createdAt.startOf('month').toISODate() === targetMonth.toISODate()
        )
        if (thisMonth.length > 0) continue

        const count = history.filter((h) => h.info?.criteria === eligibleInfo.criteria).length

        if (count >= 6) {
          continue
        }

        // Create Salary Record with backdated created_at
        await user.related('salaries').create({
          power: Math.floor(power),
          weaker: Math.floor(weaker),
          createdAt,
          updatedAt: createdAt,
        })

        created++
        this.logger.info(
          `Performance incentive created for user ${user.id}: ${eligibleInfo.designation}`
        )
      } catch (error) {
        this.logger.error(`Error calculating incentive for user ${user.id}: ${error.message}`)
      }
    }

    this.logger.info(`Performance incentive calculation completed. ${created} records created.`)
  }
}
