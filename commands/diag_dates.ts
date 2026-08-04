import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

import Investment from '#models/investment'
import InvestmentReturnDistribution from '#models/investment_return_distribution'

export default class DiagDates extends BaseCommand {
  static commandName = 'diag:dates'
  static description = 'Diagnose the prorated day counting for investments'
  static options: CommandOptions = { startApp: true }

  async run() {
    const period = DateTime.fromISO('2026-07-01').startOf('month')
    const daysInMonth = period.daysInMonth!

    const investments = await Investment.query()
      .where('status', 'active')
      .where('started_at', '<=', period.endOf('month').toSQL()!)
      .orderBy('user_id')

    for (const investment of investments) {
      const dist = await InvestmentReturnDistribution.query()
        .where('investment_id', investment.id)
        .where('period_month', period.toISODate()!)
        .first()

      // Current logic in distributeMonthlyReturns
      const startedAtCurrent = DateTime.fromJSDate(
        new Date(investment.startedAt.toString())
      ).startOf('day')
      const startDayCurrent = startedAtCurrent.month === period.month ? startedAtCurrent.day : 1
      const activeDaysCurrent = daysInMonth - startDayCurrent + 1

      // Alternative: interpret the stored wall-clock date as the calendar date (UTC components)
      const startedAtUtc = DateTime.fromJSDate(
        new Date(investment.startedAt.toString())
      ).toUTC()
      const startDayUtc = startedAtUtc.month === period.month ? startedAtUtc.day : 1
      const activeDaysUtc = daysInMonth - startDayUtc + 1

      this.logger.info(
        `inv#${investment.id} PJ${String(investment.userId).padStart(6, '0')} started=${investment.startedAt.toString()} | ` +
          `Lucid zone=${investment.startedAt.zoneName} day=${investment.startedAt.day} | ` +
          `current: startDay=${startDayCurrent} activeDays=${activeDaysCurrent} | ` +
          `stored-date: startDay=${startDayUtc} activeDays=${activeDaysUtc} | ` +
          `paid=${dist?.paidOutAt ? 'yes' : 'no'} return=${dist?.returnAmount}`
      )
    }
  }
}
