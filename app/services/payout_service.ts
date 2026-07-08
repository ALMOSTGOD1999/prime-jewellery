import { DateTime } from 'luxon'
import PlatformConfig from '#models/platform_config'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import User from '#models/user'
import Purchase from '#models/purchase'
import WalletService from '#services/wallet_service'
import db from '@adonisjs/lucid/services/db'
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
    return income >= now.minus({ months: 1 }) && working >= now.minus({ months: 1 })
  }

  static async getNextPayoutMonth(type: 'income' | 'working'): Promise<DateTime> {
    const last =
      type === 'income'
        ? await this.getIncomeWalletPayoutMonth()
        : await this.getWorkingWalletPayoutMonth()

    const now = DateTime.now().startOf('month')
    if (!last) {
      return now.minus({ months: 1 })
    }

    return last.plus({ months: 1 })
  }

  /**
   * Snapshot all user incomes for a given month.
   * Computes total income from all sources for each activated user.
   */
  static async snapshotMonthlyIncomes(month: DateTime) {
    const period = month.startOf('month')
    const periodEnd = period.endOf('month')

    const users = await User.query().where('role', 'user').whereNotNull('activated_at')

    let created = 0

    for (const user of users) {
      // Skip if snapshot already exists
      const existing = await MonthlyIncomeSnapshot.query()
        .where('user_id', user.id)
        .where('month', period.toISODate()!)
        .first()
      if (existing) continue

      // Sum approved purchases for this user in the month
      const purchaseRes = await Purchase.query()
        .where('user_id', user.id)
        .whereNotNull('approved_at')
        .whereNull('cancelled_at')
        .whereBetween('approved_at', [period.toSQL()!, periodEnd.toSQL()!])
        .sum('amount as total')
      const purchaseAmount = Number(purchaseRes[0].$extras.total || 0)

      // Sum direct referrals' purchase amounts as their activation/sponsor income
      const children = await user.related('children').query().whereNotNull('activated_at')
      let sponsorIncome = 0
      for (const child of children) {
        const childPurchases = await Purchase.query()
          .where('user_id', child.id)
          .whereNotNull('approved_at')
          .whereNull('cancelled_at')
          .whereBetween('approved_at', [period.toSQL()!, periodEnd.toSQL()!])
          .sum('amount as total')
        sponsorIncome += Number(childPurchases[0].$extras.total || 0)
      }

      const grossAmount = purchaseAmount + sponsorIncome

      if (grossAmount <= 0) continue

      // 70% income wallet, 30% repurchase wallet
      const incomeWalletAmount = Math.round(grossAmount * 0.7 * 100) / 100
      const repurchaseWalletAmount = Math.round(grossAmount * 0.3 * 100) / 100

      await MonthlyIncomeSnapshot.create({
        userId: user.id,
        month: period,
        grossAmount,
        incomeWalletAmount,
        repurchaseWalletAmount,
        paidOutAt: null,
      })

      created++
    }

    return { created, month: period.toISODate()! }
  }

  static async processIncomeWalletPayout(month: DateTime, adminId: number) {
    const period = month.startOf('month')
    const distributions = await InvestmentReturnDistribution.query()
      .where('period_month', period.toISODate()!)
      .whereNull('paid_out_at')

    let processed = 0

    for (const distribution of distributions) {
      const goldTransaction = await WalletService.creditWallet(
        distribution.userId,
        Number(distribution.goldAmount),
        adminId,
        `Gold wallet share from monthly investment return for ${period.toFormat('LLLL yyyy')}`
      )

      const incomeTransaction = await WalletService.creditWallet(
        distribution.userId,
        Number(distribution.incomeAmount),
        adminId,
        `Income wallet share from monthly investment return for ${period.toFormat('LLLL yyyy')}`
      )

      const user = await User.findOrFail(distribution.userId)
      user.incomeWallet = Number(user.incomeWallet ?? 0) + Number(distribution.incomeAmount)
      await user.save()

      distribution.goldTransactionId = goldTransaction.id
      distribution.incomeWalletTransactionId = incomeTransaction.id
      distribution.paidOutAt = DateTime.now()
      await distribution.save()

      processed += 1
    }

    await PlatformConfig.set(
      'income_wallet_payout_month',
      period.toFormat('yyyy-MM'),
      'payout',
      'Income Wallet Payout Month',
      'Last month for which income wallet payout was processed'
    )

    return { processed, month: period.toISODate()! }
  }

  static async processWorkingWalletPayout(month: DateTime, adminId: number) {
    const period = month.startOf('month')

    // First, compute snapshots for this month if not already done
    await this.snapshotMonthlyIncomes(period)

    // Credit pending snapshots to user wallets
    const snapshots = await MonthlyIncomeSnapshot.query()
      .where('month', period.toISODate()!)
      .whereNull('paid_out_at')

    let credited = 0
    let totalAmount = 0

    for (const snapshot of snapshots) {
      // Credit 70% to income wallet
      const user = await User.findOrFail(snapshot.userId)
      user.incomeWallet = Number(user.incomeWallet ?? 0) + Number(snapshot.incomeWalletAmount)
      await user.save()

      // Credit 30% to main wallet as repurchase/gold
      if (snapshot.repurchaseWalletAmount > 0) {
        await WalletService.creditWallet(
          snapshot.userId,
          Number(snapshot.repurchaseWalletAmount),
          adminId,
          `Monthly income payout (30% repurchase) for ${period.toFormat('LLLL yyyy')}`
        )
      }

      snapshot.paidOutAt = DateTime.now()
      await snapshot.save()

      credited++
      totalAmount += Number(snapshot.grossAmount)
    }

    await PlatformConfig.set(
      'working_wallet_payout_month',
      period.toFormat('yyyy-MM'),
      'payout',
      'Working Wallet Payout Month',
      'Last month for which working wallet payout was processed'
    )

    return {
      credited,
      totalAmount,
      month: period.toISODate()!,
    }
  }

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
