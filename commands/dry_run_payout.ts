import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import User from '#models/user'
import RewardService from '#services/reward_service'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import PayoutService from '#services/payout_service'

export default class DryRunPayout extends BaseCommand {
  static commandName = 'payout:dry-run'
  static description = 'Dry-run both payouts for the previous month'

  static options: CommandOptions = { startApp: true }

  async run() {
    const month = DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')

    // Income Wallet
    const distributions = await InvestmentReturnDistribution.query()
      .where('period_month', month.toISODate()!)
      .whereNull('paid_out_at')
    const incomeGross = distributions.reduce((s, d) => s + Number(d.returnAmount), 0)

    this.logger.info(`Month: ${monthStr}`)
    this.logger.info(
      `Income Wallet: ${distributions.length} distributions, gross ₹${incomeGross.toLocaleString('en-IN')}`
    )

    // Working Wallet (all users)
    const users = await User.query().where('role', 'user').whereNotNull('activated_at')
    let workingTotalGross = 0
    let workingTotalIncome70 = 0
    let paidUsers = 0
    for (const u of users) {
      const gross = await RewardService.getUserMonthlyWorkingIncome(u, month)
      if (gross > 0) {
        paidUsers++
        workingTotalGross += gross
        workingTotalIncome70 += Math.round(gross * 0.7 * 100) / 100
        if (paidUsers <= 5) {
          this.logger.info(
            `User ${u.id} (${u.name}): gross ₹${gross.toLocaleString('en-IN')}, income70 ₹${Math.round((gross * 0.7 * 100) / 100).toLocaleString('en-IN')}`
          )
        }
      }
    }
    this.logger.info(
      `Working Wallet: ${paidUsers} users, total gross ₹${workingTotalGross.toLocaleString('en-IN')}, total income70 ₹${workingTotalIncome70.toLocaleString('en-IN')}`
    )
  }
}
