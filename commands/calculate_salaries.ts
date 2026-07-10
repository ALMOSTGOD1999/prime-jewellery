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
// Run twice a month: mid-month (15th) and end-month (last day)
@schedule((s) => s.timezone(env.get('TZ')).monthlyOn(15, '23:59'))
@schedule((s) => s.timezone(env.get('TZ')).lastDayOfMonth('23:59'))
export default class CalculateSalaries extends BaseCommand {
  static commandName = 'calculate:salaries'
  static description = 'Calculate salary rewards twice a month (mid and end)'

  static options: CommandOptions = { startApp: true }

  async run() {
    const today = DateTime.now().setZone(env.get('TZ'))
    const isMidMonth = today.day === 15

    const period = isMidMonth ? 'mid-month' : 'end-month'
    this.logger.info(`Starting salary calculation for ${period}...`)

    router.commit()

    const users = await User.query().whereNotNull('activatedAt').andWhere('role', UserRoleEnum.USER)
    const endDate = DateTime.now().setZone(env.get('TZ')).endOf('day')

    for (const user of users) {
      try {
        // 1. Calculate Lifetime Power and Weaker
        const { power, weaker, legAmounts } = await RewardService.getPowerAndWeaker(user, endDate)
        const total = power + weaker

        const eligibleInfo = RewardService.getSalaryInfo(legAmounts || [])

        if (!eligibleInfo) {
          continue
        }

        // 3. Check for Recurring Salary Rules
        // Get history of this specific designation for the user
        const history = await user.related('salaries').query().orderBy('createdAt', 'desc')

        const count = history.filter((h) => h.info?.criteria === eligibleInfo.criteria).length

        // Rule: Max 6 times for the same designation
        if (count >= 6) {
          // User has maxed out this designation.
          // TODO: Should we check for the NEXT level?
          // For now, we just skip. The user needs to reach the next level's criteria standardly.
          continue
        }

        // Rule: 10% Increase for recurring salaries
        if (count > 0) {
          // Calculate Target = BaseCriteria * (1.10 ^ count)
          const multiplier = Math.pow(1.1, count)
          const targetTotal = eligibleInfo.criteria * multiplier

          // Check if current total meets the new target
          if (total <= targetTotal) {
            continue
          }

          // Check 60/40 rule against the NEW target
          // Assumption: The ratio applies to the scaled target
          const targetPower = targetTotal * 0.6
          const targetWeaker = targetTotal * 0.4

          if (power < targetPower || weaker < targetWeaker) {
            // note: is this correct?
            continue
          }
        }

        // 4. Create Salary Record
        // We store the actual power/weaker amounts.
        // The 'extra' is computed on the fly in the model.
        await user.related('salaries').create({
          power: Math.floor(power),
          weaker: Math.floor(weaker),
        })

        this.logger.info(
          `Salary (${period}) created for user ${user.id}: ${eligibleInfo.designation}`
        )
      } catch (error) {
        this.logger.error(`Error calculating salary for user ${user.id}: ${error.message}`)
      }
    }

    this.logger.info(`Salary calculation for ${period} completed.`)
  }
}
