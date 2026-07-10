import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import InvestmentService from '#services/investment_service'
import PayoutService from '#services/payout_service'
import PlatformConfig from '#models/platform_config'

export default class RunIncomePayout extends BaseCommand {
  static commandName = 'payout:run-income'
  static description = 'Distribute June investment returns and credit income wallets'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')

    this.logger.info(`Target month: ${monthStr}`)

    // Check if already done
    const alreadyPaid = await PlatformConfig.get('income_wallet_payout_month')
    if (alreadyPaid === monthStr) {
      this.logger.warning('Income payout already done for ' + monthStr)
      return
    }

    // 1. Create distribution records (the 3% returns)
    this.logger.info('Creating investment return distributions...')
    const distResult = await InvestmentService.distributeMonthlyReturns(month)
    this.logger.success(
      `Distributions: ${distResult.processed} created, ${distResult.skipped} skipped, ${distResult.maxReturnReached} max-return-closed`
    )

    // 2. Credit wallets
    this.logger.info('Crediting income & repurchase wallets...')
    const payoutResult = await PayoutService.processIncomeWalletPayout(month, 1)
    this.logger.success(
      `Income payout done: ${payoutResult.processed} users credited`
    )
  }
}
