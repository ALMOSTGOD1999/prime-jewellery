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

    let credited = 0
    let already = 0
    let growthFailed = 0
    let skipped = 0

    for (const user of users) {
      try {
        const result = await RewardService.resolveMonthlySalary(user, targetMonth)

        if (result.status === 'credited') {
          credited++
          this.logger.info(
            `Incentive CREDITED for user ${user.id}: reward ${result.reward} ` +
              `(credited to wallet via monthly payout snapshot flow)`
          )
        } else if (result.status === 'already-credited') {
          already++
        } else if (result.status === 'growth-failed') {
          growthFailed++
          this.logger.info(
            `Incentive SKIPPED for user ${user.id}: 20% growth target not met since first credit`
          )
        } else {
          skipped++
        }
      } catch (error) {
        this.logger.error(`Error calculating incentive for user ${user.id}: ${error.message}`)
      }
    }

    this.logger.info(
      `Performance incentive calculation completed. ` +
        `${credited} credited, ${already} already credited, ${growthFailed} growth not met, ${skipped} not eligible.`
    )
  }
}
