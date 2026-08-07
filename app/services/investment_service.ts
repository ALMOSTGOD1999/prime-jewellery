import { DateTime } from 'luxon'

import Investment from '#models/investment'
import InvestmentPackage from '#models/investment_package'
import InvestmentReturnDistribution from '#models/investment_return_distribution'
import Purchase from '#models/purchase'
import User from '#models/user'
import Withdrawl from '#models/withdrawl'
import WalletService from '#services/wallet_service'
import { WithdrawlStatusEnum, WithdrawlTypeEnum } from '#enums/withdrawl'

const INCOME_WALLET_PERCENT = 70
const REPURCHASE_WALLET_PERCENT = 20
const ADMIN_CHARGE_PERCENT = 10

export default class InvestmentService {
  static incomeWalletPercent = INCOME_WALLET_PERCENT
  static repurchaseWalletPercent = REPURCHASE_WALLET_PERCENT
  static adminChargePercent = ADMIN_CHARGE_PERCENT
  static goldWalletPercent = REPURCHASE_WALLET_PERCENT

  static roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
  }

  static async findPackageForAmount(amount: number): Promise<InvestmentPackage> {
    const pkg = await InvestmentPackage.findPackageForAmount(amount)
    if (!pkg) {
      throw new Error(`No investment package found for amount ₹${amount.toLocaleString('en-IN')}`)
    }
    return pkg
  }

  static async calculateDistribution(investmentAmount: number, packageId?: number) {
    let monthlyReturnPercent = 3
    if (packageId) {
      const pkg = await InvestmentPackage.find(packageId)
      if (pkg) monthlyReturnPercent = pkg.monthlyReturnPercent
    } else {
      const pkg = await this.findPackageForAmount(investmentAmount)
      monthlyReturnPercent = pkg.monthlyReturnPercent
    }

    const returnAmount = this.roundMoney((investmentAmount * monthlyReturnPercent) / 100)
    const incomeAmount = this.roundMoney((returnAmount * INCOME_WALLET_PERCENT) / 100)
    const repurchaseAmount = this.roundMoney((returnAmount * REPURCHASE_WALLET_PERCENT) / 100)
    const adminCharge = this.roundMoney(returnAmount - incomeAmount - repurchaseAmount)

    return {
      returnAmount,
      incomeAmount,
      repurchaseAmount,
      adminCharge,
      monthlyReturnPercent,
    }
  }

  /**
   * Resolve the CURRENT amount of a self-investment. A gold purchase and an
   * investment are the same thing — every approved purchase is the underlying
   * self-investment, and the admin may reduce or add to it after the fact. The
   * linked purchase record is the source of truth, so its current amount is
   * used for the return calculation (falls back to the investment record).
   */
  static async getEffectiveAmount(investment: Investment): Promise<number> {
    if (investment.purchaseId) {
      const purchase = await Purchase.query()
        .select('amount', 'approvedAt', 'cancelledAt', 'stoppedAt')
        .where('id', investment.purchaseId)
        .first()
      if (purchase && purchase.approvedAt && !purchase.cancelledAt && !purchase.stoppedAt) {
        return Number(purchase.amount)
      }
    }
    return Number(investment.amount)
  }

  /**
   * Check if investment has reached its maximum return cap (e.g. 100% of investment)
   */
  static async hasReachedMaxReturn(investment: Investment): Promise<boolean> {
    const effectiveAmount = await this.getEffectiveAmount(investment)
    const pkg = await InvestmentPackage.findPackageForAmount(effectiveAmount)
    if (!pkg) return true

    const maxReturnPercent = pkg.maxReturnPercent
    const totalReturned = await InvestmentReturnDistribution.query()
      .where('investment_id', investment.id)
      .sum('return_amount as total')
      .first()

    const totalReturnAmount = Number(totalReturned?.$extras?.total || 0)
    const maxReturnAmount = this.roundMoney((effectiveAmount * maxReturnPercent) / 100)

    return totalReturnAmount >= maxReturnAmount
  }

  static async createInvestment(user: User, amount: number, remark?: string) {
    // Check wallet balance
    const walletBalance = Number(user.walletBalance ?? 0)
    if (walletBalance < amount) {
      throw new Error('Insufficient wallet balance')
    }

    if (amount < 10000) {
      throw new Error('Minimum investment amount is ₹10,000')
    }

    // Find the appropriate package for this amount
    const pkg = await this.findPackageForAmount(amount)

    // Deduct from wallet
    await WalletService.debitWallet(user.id, amount, 'Investment purchase')

    // Update total invested for user
    user.totalInvested = Number(user.totalInvested ?? 0) + amount
    await user.save()

    return Investment.create({
      userId: user.id,
      amount,
      monthlyReturnRate: pkg.monthlyReturnPercent,
      status: 'active',
      startedAt: DateTime.now(),
      remark: remark || null,
    })
  }

  static async getAvailablePackages() {
    return InvestmentPackage.getActivePackages()
  }

  static async getDashboard(
    user: User,
    { page = 1, limit = 10 }: { page?: number; limit?: number }
  ) {
    const [investments, packages, distributions, incomeStats, withdrawalStats] = await Promise.all([
      Investment.query().where('user_id', user.id).orderBy('created_at', 'desc'),
      InvestmentPackage.getActivePackages(),
      InvestmentReturnDistribution.query()
        .where('user_id', user.id)
        .preload('investment')
        .orderBy('period_month', 'desc')
        .paginate(page, limit),
      InvestmentReturnDistribution.query()
        .where('user_id', user.id)
        .sum('income_amount as total_income')
        .sum('gold_amount as total_gold')
        .sum('return_amount as total_return')
        .first(),
      Withdrawl.query()
        .where('user_id', user.id)
        .where('type', WithdrawlTypeEnum.INVESTMENT_INCOME)
        .whereIn('status', [WithdrawlStatusEnum.PENDING, WithdrawlStatusEnum.APPROVED])
        .sum('amount as total_withdrawn')
        .first(),
    ])

    const activeInvestmentAmount = investments
      .filter((investment) => investment.status === 'active')
      .reduce((total, investment) => total + Number(investment.amount || 0), 0)

    const stats = incomeStats?.$extras || {}
    const withdrawalExtras = withdrawalStats?.$extras || {}
    const totalIncome = Number(stats.total_income || 0)
    const totalWithdrawn = Number(withdrawalExtras.total_withdrawn || 0)

    return {
      investments,
      packages,
      distributions,
      stats: {
        activeInvestmentAmount,
        totalInvested: Number(user.totalInvested ?? 0),
        totalReturn: Number(stats.total_return || 0),
        totalIncome,
        totalGold: Number(stats.total_gold || 0),
        totalWithdrawn,
        availableIncome: Math.max(0, this.roundMoney(totalIncome - totalWithdrawn)),
        incomeWalletPercent: INCOME_WALLET_PERCENT,
        goldWalletPercent: REPURCHASE_WALLET_PERCENT,
      },
    }
  }

  static async requestIncomeWithdrawal(user: User, amount: number) {
    const { stats } = await this.getDashboard(user, { page: 1, limit: 1 })

    if (amount > stats.availableIncome) {
      throw new Error('Insufficient cashback wallet balance')
    }

    const bank = await user.related('bank').query().first()
    if (!bank?.approvedAt) {
      throw new Error(
        'Please add and approve your bank details before withdrawing investment income'
      )
    }

    await Withdrawl.create({
      userId: user.id,
      amount,
      type: WithdrawlTypeEnum.INVESTMENT_INCOME,
      status: WithdrawlStatusEnum.PENDING,
    })
  }

  static async distributeMonthlyReturns(
    periodMonth: DateTime<boolean> = DateTime.now().startOf('month')
  ) {
    const period = periodMonth.startOf('month')
    const investments = await Investment.query()
      .where('status', 'active')
      .where('started_at', '<=', period.endOf('month').toSQL()!)

    let processed = 0
    let skipped = 0
    let maxReturnReached = 0

    for (const investment of investments) {
      // Skip investments belonging to inactive users. Select only the columns
      // needed — loading the avatar attachment computes its URL, which fails
      // in console/CLI contexts (no HTTP routes are registered).
      const invUser = await User.query()
        .select('id', 'status')
        .where('id', investment.userId)
        .first()
      if (!invUser || invUser.status === 'inactive') {
        skipped += 1
        continue
      }

      // Check if investment has reached max return cap
      const reachedMax = await this.hasReachedMaxReturn(investment)
      if (reachedMax) {
        // Close the investment
        investment.status = 'closed'
        investment.closedAt = DateTime.now()
        investment.remark = 'Maximum return reached (100%)'
        await investment.save()
        maxReturnReached += 1
        continue
      }

      const existing = await InvestmentReturnDistribution.query()
        .where('investment_id', investment.id)
        .where('period_month', period.toISODate()!)
        .first()

      if (existing) {
        skipped += 1
        continue
      }

      const rate = Number(investment.monthlyReturnRate) || 3
      const investmentAmount = await this.getEffectiveAmount(investment)

      // Prorate return based on days active in the month. `started_at` is a
      // timezone-less `timestamp` whose wall-clock value is the UTC wall time
      // (Lucid serializes DateTimes to UTC), so its calendar date is read in
      // UTC. Converting through the local timezone instead (e.g. Asia/Kolkata)
      // would shift an evening UTC timestamp to the next local day and lose a
      // day of eligibility — e.g. a purchase recorded 2026-07-28T18:57Z would
      // start counting from July 29 instead of July 28.
      const startedAt = investment.startedAt.toUTC().startOf('day')
      const daysInMonth = period.daysInMonth!
      const startDay = startedAt.month === period.month ? startedAt.day : 1
      const activeDays = daysInMonth - startDay + 1
      const prorateFactor = activeDays / daysInMonth

      const returnAmount = this.roundMoney((investmentAmount * rate * prorateFactor) / 100)
      const incomeAmount = this.roundMoney((returnAmount * INCOME_WALLET_PERCENT) / 100)
      const repurchaseAmount = this.roundMoney((returnAmount * REPURCHASE_WALLET_PERCENT) / 100)

      await InvestmentReturnDistribution.create({
        investmentId: investment.id,
        userId: investment.userId,
        periodMonth: period,
        investmentAmount,
        returnAmount,
        incomeAmount,
        goldAmount: repurchaseAmount,
        goldTransactionId: null,
        incomeWalletTransactionId: null,
        paidOutAt: null,
      })

      processed += 1
    }

    return {
      processed,
      skipped,
      maxReturnReached,
      periodMonth: period.toISODate(),
    }
  }
}
