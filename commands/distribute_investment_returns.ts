import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { schedule } from 'adonisjs-scheduler'
import { DateTime } from 'luxon'

import InvestmentService from '#services/investment_service'
import env from '#start/env'

@schedule((s) => s.timezone(env.get('TZ')).monthlyOn(1, '00:05'))
export default class DistributeInvestmentReturns extends BaseCommand {
  static commandName = 'investments:distribute-returns'
  static description = 'Distribute monthly investment returns: 70% income wallet and 30% gold wallet'

  static options: CommandOptions = { startApp: true }

  async run() {
    const period = DateTime.now().setZone(env.get('TZ')).startOf('month')
    const result = await InvestmentService.distributeMonthlyReturns(period)

    this.logger.success(
      `Investment returns distributed for ${result.periodMonth}. Processed: ${result.processed}, skipped: ${result.skipped}`
    )
  }
}
