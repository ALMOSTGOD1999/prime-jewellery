import { DateTime } from 'luxon'
import PlatformConfig from '#models/platform_config'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import User from '#models/user'
import WalletService from '#services/wallet_service'
import { WithdrawlTypeEnum } from '#enums/withdrawl'

export default class PayoutService {
  static async getIncomeWalletPayoutMonth(): Promise<DateTime | null> {
    const monthStr = await PlatformConfig.get('income_wallet_payout_month')
    return monthStr ? DateTime.fromISO(monthStr + '-01').startOf('month') : null
  }

  static async getWorkingWalletPayoutMonth(): Promise<DateTime | null> {
    const monthStr = await PlatformConfig.get('working_wallet_payout_month')
    return monthStr ? DateTime.fromISO(monthStr + '-01').startOf('month') : null
  }

  static async getVisibleCutoff(): Promise<DateTime | null> {
    const income = await this.getIncomeWalletPayoutMonth()
    const working = await this.getWorkingWalletPayoutMonth()
    if (!income || !working) return null
    return income < working ? income : working
  }

  static async getVisibleCutoffEndOfMonth(): Promise<DateTime | null> {
    const cutoff = await this.getVisibleCutoff()
    return cutoff ? cutoff.endOf('month') : null
  }

  static async isPayoutReleased(): Promise<boolean> {
    const income = await this.getIncomeWalletPayoutMonth()
    const working = await this.getWorkingWalletPayoutMonth()
    if (!income || !working) return false

    const now = DateTime.now().startOf('month')
    // Both payouts must be at least for the previous month
    return income >= now.minus({ months: 1 }) && working >= now.minus({ months: 1 })
  }

  static async getNextPayoutMonth(type: 'income' | 'working'): Promise<DateTime> {
    const last =
      type === 'income'
        ? await this.getIncomeWalletPayoutMonth()
        : await this.getWorkingWalletPayoutMonth()

    const now = DateTime.now().startOf('month')
    if (!last) {
      // First ever payout: pay out the previous month
      return now.minus({ months: 1 })
    }

    const next = last.plus({ months: 1 })
    // Don't allow paying out future months
    if (next > now.minus({ months: 1 })) {
      return now.minus({ months: 1 })
    }
    return next
  }

  static async processIncomeWalletPayout(month: DateTime, adminId: number) {
    const period = month.startOf('month')
    const distributions = await InvestmentReturnDistribution.query()
      .where('period_month', period.toISODate()!)
      .whereNull('paid_out_at')

    let processed = 0

    for (const distribution of distributions) {
      // Credit gold amount to wallet balance
      const goldTransaction = await WalletService.creditWallet(
        distribution.userId,
        Number(distribution.goldAmount),
        adminId,
        `Gold wallet share from monthly investment return for ${period.toFormat('LLLL yyyy')}`
      )

      // Credit income amount to income wallet
      const incomeTransaction = await WalletService.creditWallet(
        distribution.userId,
        Number(distribution.incomeAmount),
        adminId,
        `Income wallet share from monthly investment return for ${period.toFormat('LLLL yyyy')}`
      )

      // Update user income wallet
      const user = await User.findOrFail(distribution.userId)
      user.incomeWallet = Number(user.incomeWallet ?? 0) + Number(distribution.incomeAmount)
      await user.save()

      // Update distribution record
      distribution.goldTransactionId = goldTransaction.id
      distribution.incomeWalletTransactionId = incomeTransaction.id
      distribution.paidOutAt = DateTime.now()
      await distribution.save()

      processed += 1
    }

    // Update config
    await PlatformConfig.set(
      'income_wallet_payout_month',
      period.toFormat('yyyy-MM'),
      'payout',
      'Income Wallet Payout Month',
      'Last month for which income wallet payout was processed'
    )

    return { processed, month: period.toISODate()! }
  }

  static async processWorkingWalletPayout(month: DateTime) {
    const period = month.startOf('month')

    // Update config
    await PlatformConfig.set(
      'working_wallet_payout_month',
      period.toFormat('yyyy-MM'),
      'payout',
      'Working Wallet Payout Month',
      'Last month for which working wallet payout was processed'
    )

    return { month: period.toISODate()! }
  }

  /**
   * Apply working wallet deductions:
   * - 10% admin charges
   * - 20% deducted after admin charges
   * Net amount = gross * 0.9 * 0.8 = gross * 0.72
   */
  static calculateWorkingWalletNetAmount(grossAmount: number): {
    gross: number
    adminCharges: number
    otherDeductions: number
    net: number
  } {
    const adminCharges = Math.round(grossAmount * 0.1 * 100) / 100
    const afterAdmin = grossAmount - adminCharges
    const otherDeductions = Math.round(afterAdmin * 0.2 * 100) / 100
    const net = Math.round((afterAdmin - otherDeductions) * 100) / 100

    return { gross: grossAmount, adminCharges, otherDeductions, net }
  }

  static isWorkingWalletWithdrawalType(type: WithdrawlTypeEnum): boolean {
    return [
      WithdrawlTypeEnum.ACTIVATION_CASHBACK,
      WithdrawlTypeEnum.ACTIVATION_SPONSOR,
      WithdrawlTypeEnum.ACTIVATION_LEVEL,
      WithdrawlTypeEnum.CASHBACK,
      WithdrawlTypeEnum.LEVEL,
      WithdrawlTypeEnum.SALARY,
      WithdrawlTypeEnum.EMI,
      WithdrawlTypeEnum.EMI_LEVEL,
    ].includes(type)
  }
}
