import { BaseCommand } from '@adonisjs/core/ace'
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

  async run() {
    this.logger.info('Starting performance incentive calculation...')

    router.commit()

    const users = await User.query()
      .whereNotNull('activatedAt')
      .andWhere('role', UserRoleEnum.USER)
      .andWhere('status', 'active')

    const endDate = DateTime.now().setZone(env.get('TZ')).endOf('day')

    for (const user of users) {
      try {
        // 1. Calculate Lifetime Power and Weaker
        const { power, weaker, legAmounts } = await RewardService.getPowerAndWeaker(user, endDate)

        const eligibleInfo = RewardService.getSalaryInfo(legAmounts || [])

        if (!eligibleInfo) {
          continue
        }

        // 2. Check for max payouts per designation (max 6 times)
        const history = await user.related('salaries').query().orderBy('createdAt', 'desc')

        const count = history.filter((h) => h.info?.criteria === eligibleInfo.criteria).length

        // Max 6 times for the same designation
        if (count >= 6) {
          continue
        }

        // 3. Create Salary Record
        await user.related('salaries').create({
          power: Math.floor(power),
          weaker: Math.floor(weaker),
        })

        this.logger.info(
          `Performance incentive created for user ${user.id}: ${eligibleInfo.designation}`
        )
      } catch (error) {
        this.logger.error(`Error calculating incentive for user ${user.id}: ${error.message}`)
      }
    }

    this.logger.info('Performance incentive calculation completed.')
  }
}
