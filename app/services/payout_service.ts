import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import PlatformConfig from '#models/platform_config'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import MonthlyIncomeSnapshot from '#models/monthly_income_snapshot'
import User from '#models/user'
import Purchase from '#models/purchase'
import Transaction from '#models/transaction'
import WalletService from '#services/wallet_service'
import { WithdrawlTypeEnum } from '#enums/withdrawl'
import { TransactionTypeEnum } from '#enums/transaction'
import InvestmentService from '#services/investment_service'

export default class PayoutService {
  static readonly INCOME_PERCENT = 0.7
  static readonly REPURCHASE_PERCENT = 0.2
  static readonly ADMIN_PERCENT = 0.1

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

  static async getDiagnostics(month: DateTime) {
    const period = month.startOf('month')
    const periodEnd = period.endOf('month')
    const [activeUsers, purchaseStats, investmentStats] = await Promise.all([
      User.query().where('role', 'user').whereNotNull('activated_at').count('* as total').first(),
      Purchase.query()
        .whereNotNull('approved_at')
        .whereNull('cancelled_at')
        .whereBetween('approved_at', [period.toSQL()!, periodEnd.toSQL()!])
        .count('* as count')
        .sum('amount as total')
        .first(),
      db.rawQuery(
        `SELECT count(*) as total FROM investments WHERE status = 'active' AND started_at <= ?`,
        [periodEnd.toSQL()!]
      ),
    ])
    return {
      activeUsers: Number(activeUsers?.$extras?.total || 0),
      junePurchaseCount: Number(purchaseStats?.$extras?.count || 0),
      junePurchaseAmount: Number(purchaseStats?.$extras?.total || 0),
      activeInvestments: Number(investmentStats?.rows?.[0]?.total || 0),
    }
  }

  static async getNextPayoutMonth(type: 'income' | 'working'): Promise<DateTime> {
    const last =
      type === 'income'
        ? await this.getIncomeWalletPayoutMonth()
        : await this.getWorkingWalletPayoutMonth()

    const now = DateTime.now().startOf('month')
    const previousMonth = now.minus({ months: 1 })

    if (!last || last > now) {
      return previousMonth
    }

    const candidate = last.plus({ months: 1 })

    if (candidate > previousMonth) {
      return previousMonth
    }

    return candidate
  }

  static async hasUnpaidIncomeDistributions(month: DateTime): Promise<boolean> {
    const period = month.startOf('month')
    const result = await InvestmentReturnDistribution.query()
      .where('period_month', period.toISODate()!)
      .whereNull('paid_out_at')
      .count('* as total')
      .first()
    return Number(result?.$extras.total || 0) > 0
  }

  static async hasUnpaidWorkingSnapshots(month: DateTime): Promise<boolean> {
    const period = month.startOf('month')
    const result = await MonthlyIncomeSnapshot.query()
      .where('month', period.toISODate()!)
      .whereNull('paid_out_at')
      .count('* as total')
      .first()
    return Number(result?.$extras.total || 0) > 0
  }

  static async snapshotMonthlyIncomes(month: DateTime) {
    const period = month.startOf('month')
    const periodEnd = period.endOf('month')

    const users = await User.query().where('role', 'user').whereNotNull('activated_at')

    let created = 0

    for (const user of users) {
      const existing = await MonthlyIncomeSnapshot.query()
        .where('user_id', user.id)
        .where('month', period.toISODate()!)
        .first()
      if (existing) continue

      const purchaseRes = await Purchase.query()
        .where('user_id', user.id)
        .whereNotNull('approved_at')
        .whereNull('cancelled_at')
        .whereBetween('approved_at', [period.toSQL()!, periodEnd.toSQL()!])
        .sum('amount as total')
        .first()
      const purchaseAmount = Number(purchaseRes?.$extras?.total || 0)

      const children = await user.related('children').query().whereNotNull('activated_at')
      let sponsorIncome = 0
      for (const child of children) {
        const childPurchases = await Purchase.query()
          .where('user_id', child.id)
          .whereNotNull('approved_at')
          .whereNull('cancelled_at')
          .whereBetween('approved_at', [period.toSQL()!, periodEnd.toSQL()!])
          .sum('amount as total')
          .first()
        sponsorIncome += Number(childPurchases?.$extras?.total || 0)
      }

      const grossAmount = purchaseAmount + sponsorIncome

      if (grossAmount <= 0) continue

      const incomeWalletAmount = Math.round(grossAmount * this.INCOME_PERCENT * 100) / 100
      const repurchaseWalletAmount = Math.round(grossAmount * this.REPURCHASE_PERCENT * 100) / 100

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

  static async creditIncomeWallet(
    userId: number,
    amount: number,
    adminId: number,
    remark?: string
  ) {
    return db.transaction(async (trx) => {
      const user = await User.query({ client: trx }).where('id', userId).firstOrFail()
      const transaction = await Transaction.create(
        {
          userId,
          type: TransactionTypeEnum.WALLET_CREDIT,
          amount,
          remark: remark || `Income credited by admin #${adminId}`,
          approvedAt: DateTime.now(),
        },
        { client: trx }
      )
      const currentBalance = Number(user.incomeWallet ?? 0)
      user.incomeWallet = currentBalance + amount
      await user.save()
      return transaction
    })
  }

  static async processIncomeWalletPayout(month: DateTime, adminId: number) {
    const period = month.startOf('month')
    const now = DateTime.now().startOf('month')
    const previousMonth = now.minus({ months: 1 })

    if (period > previousMonth) {
      throw new Error(
        `Cannot process payout for ${period.toFormat('yyyy-MM')} — month not completed yet.`
      )
    }

    let distributions = await InvestmentReturnDistribution.query()
      .where('period_month', period.toISODate()!)
      .whereNull('paid_out_at')

    if (distributions.length === 0) {
      const { processed: created } = await InvestmentService.distributeMonthlyReturns(period)
      if (created > 0) {
        distributions = await InvestmentReturnDistribution.query()
          .where('period_month', period.toISODate()!)
          .whereNull('paid_out_at')
      }
    }

    let processed = 0

    for (const distribution of distributions) {
      const gross = Number(distribution.returnAmount)
      const incomeAmount = Math.round(gross * this.INCOME_PERCENT * 100) / 100
      const repurchaseAmount = Math.round(gross * this.REPURCHASE_PERCENT * 100) / 100

      const repurchaseTransaction = await WalletService.creditWallet(
        distribution.userId,
        repurchaseAmount,
        adminId,
        `Repurchase wallet (20%) from investment return for ${period.toFormat('LLLL yyyy')}`
      )
      const incomeTransaction = await this.creditIncomeWallet(
        distribution.userId,
        incomeAmount,
        adminId,
        `Income wallet (70%) from investment return for ${period.toFormat('LLLL yyyy')}`
      )

      distribution.goldTransactionId = repurchaseTransaction.id
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
    const now = DateTime.now().startOf('month')
    const previousMonth = now.minus({ months: 1 })

    if (period > previousMonth) {
      throw new Error(
        `Cannot process payout for ${period.toFormat('yyyy-MM')} — month not completed yet.`
      )
    }

    try {
      await this.snapshotMonthlyIncomes(period)
    } catch (error) {
      await PlatformConfig.set(
        'working_wallet_payout_month',
        period.toFormat('yyyy-MM'),
        'payout',
        'Working Wallet Payout Month',
        'Last month for which working wallet payout was processed'
      )
      throw error
    }

    const snapshots = await MonthlyIncomeSnapshot.query()
      .where('month', period.toISODate()!)
      .whereNull('paid_out_at')

    let credited = 0
    let totalAmount = 0

    for (const snapshot of snapshots) {
      const gross = Number(snapshot.grossAmount)
      const incomeAmount = Math.round(gross * this.INCOME_PERCENT * 100) / 100
      const repurchaseAmount = Math.round(gross * this.REPURCHASE_PERCENT * 100) / 100

      await this.creditIncomeWallet(
        snapshot.userId,
        incomeAmount,
        adminId,
        `Income wallet (70%) from working income for ${period.toFormat('LLLL yyyy')}`
      )
      if (repurchaseAmount > 0) {
        await WalletService.creditWallet(
          snapshot.userId,
          repurchaseAmount,
          adminId,
          `Repurchase wallet (20%) from working income for ${period.toFormat('LLLL yyyy')}`
        )
      }

      snapshot.paidOutAt = DateTime.now()
      await snapshot.save()
      credited++
      totalAmount += gross
    }

    await PlatformConfig.set(
      'working_wallet_payout_month',
      period.toFormat('yyyy-MM'),
      'payout',
      'Working Wallet Payout Month',
      'Last month for which working wallet payout was processed'
    )

    return { credited, totalAmount, month: period.toISODate()! }
  }

  static calculateWorkingWalletNetAmount(grossAmount: number) {
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
