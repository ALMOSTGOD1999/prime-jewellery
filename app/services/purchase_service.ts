import { DateTime } from 'luxon'

import PurchasePlan from '#models/purchase_plan'
import PurchasePackage from '#models/purchase_package'
import PurchaseReturn from '#models/purchase_return'
import Purchase from '#models/purchase'
import User from '#models/user'
import Withdrawl from '#models/withdrawl'
import { WithdrawlStatusEnum, WithdrawlTypeEnum } from '#enums/withdrawl'

const INCOME_WALLET_PERCENT = 70
const REPURCHASE_WALLET_PERCENT = 20
const ADMIN_CHARGE_PERCENT = 10

export default class PurchaseService {
  static incomeWalletPercent = INCOME_WALLET_PERCENT
  static repurchaseWalletPercent = REPURCHASE_WALLET_PERCENT
  static adminChargePercent = ADMIN_CHARGE_PERCENT
  static goldWalletPercent = REPURCHASE_WALLET_PERCENT

  static roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
  }

  static async findPackageForAmount(amount: number): Promise<PurchasePackage> {
    const pkg = await PurchasePackage.findPackageForAmount(amount)
    if (!pkg) {
      throw new Error(`No purchase package found for amount ₹${amount.toLocaleString('en-IN')}`)
    }
    return pkg
  }

  static async calculateDistribution(purchaseAmount: number, packageId?: number) {
    let monthlyReturnPercent = 3
    if (packageId) {
      const pkg = await PurchasePackage.find(packageId)
      if (pkg) monthlyReturnPercent = pkg.monthlyReturnPercent
    } else {
      const pkg = await this.findPackageForAmount(purchaseAmount)
      monthlyReturnPercent = pkg.monthlyReturnPercent
    }

    const returnAmount = this.roundMoney((purchaseAmount * monthlyReturnPercent) / 100)
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
   * Resolve the CURRENT amount of a purchase. Purchases earn monthly returns
   * and the admin may reduce or add to it after the fact. The linked purchase
   * record is the source of truth, so its current amount is used for the return
   * calculation (falls back to the purchase plan record).
   */
  static async getEffectiveAmount(purchasePlan: PurchasePlan): Promise<number> {
    if (purchasePlan.purchaseId) {
      const purchase = await Purchase.query()
        .select('amount', 'approvedAt', 'cancelledAt', 'stoppedAt')
        .where('id', purchasePlan.purchaseId)
        .first()
      if (purchase && purchase.approvedAt && !purchase.cancelledAt && !purchase.stoppedAt) {
        return Number(purchase.amount)
      }
    }
    return Number(purchasePlan.amount)
  }

  /**
   * Check if purchase has reached its maximum return cap (e.g. 100% of purchase)
   */
  static async hasReachedMaxReturn(purchasePlan: PurchasePlan): Promise<boolean> {
    const effectiveAmount = await this.getEffectiveAmount(purchasePlan)
    const pkg = await PurchasePackage.findPackageForAmount(effectiveAmount)
    if (!pkg) return true

    const maxReturnPercent = pkg.maxReturnPercent
    const totalReturned = await PurchaseReturn.query()
      .where('investment_id', purchasePlan.id)
      .sum('return_amount as total')
      .first()

    const totalReturnAmount = Number(totalReturned?.$extras?.total || 0)
    const maxReturnAmount = this.roundMoney((effectiveAmount * maxReturnPercent) / 100)

    return totalReturnAmount >= maxReturnAmount
  }

  static async getAvailablePackages() {
    return PurchasePackage.getActivePackages()
  }

  static async getDashboard(
    user: User,
    { page = 1, limit = 10 }: { page?: number; limit?: number }
  ) {
    const [purchasePlans, packages, distributions, incomeStats, withdrawalStats] = await Promise.all([
      PurchasePlan.query().where('user_id', user.id).orderBy('created_at', 'desc'),
      PurchasePackage.getActivePackages(),
      PurchaseReturn.query()
        .where('user_id', user.id)
        .preload('purchasePlan')
        .orderBy('period_month', 'desc')
        .paginate(page, limit),
      PurchaseReturn.query()
        .where('user_id', user.id)
        .sum('income_amount as total_income')
        .sum('gold_amount as total_gold')
        .sum('return_amount as total_return')
        .first(),
      Withdrawl.query()
        .where('user_id', user.id)
        .where('type', WithdrawlTypeEnum.PURCHASE_INCOME)
        .whereIn('status', [WithdrawlStatusEnum.PENDING, WithdrawlStatusEnum.APPROVED])
        .sum('amount as total_withdrawn')
        .first(),
    ])

    const activePurchaseAmount = purchasePlans
      .filter((plan) => plan.status === 'active')
      .reduce((total, plan) => total + Number(plan.amount || 0), 0)

    const stats = incomeStats?.$extras || {}
    const withdrawalExtras = withdrawalStats?.$extras || {}
    const totalIncome = Number(stats.total_income || 0)
    const totalWithdrawn = Number(withdrawalExtras.total_withdrawn || 0)

    return {
      purchasePlans,
      // Legacy alias
      investments: purchasePlans,
      packages,
      distributions,
      stats: {
        activePurchaseAmount,
        activeInvestmentAmount: activePurchaseAmount,
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
        'Please add and approve your bank details before withdrawing purchase income'
      )
    }

    await Withdrawl.create({
      userId: user.id,
      amount,
      type: WithdrawlTypeEnum.PURCHASE_INCOME,
      status: WithdrawlStatusEnum.PENDING,
    })
  }

  static async distributeMonthlyReturns(
    periodMonth: DateTime<boolean> = DateTime.now().startOf('month')
  ) {
    const period = periodMonth.startOf('month')
    const purchasePlans = await PurchasePlan.query()
      .where('status', 'active')
      .where('started_at', '<=', period.endOf('month').toSQL()!)

    let processed = 0
    let skipped = 0
    let maxReturnReached = 0

    for (const plan of purchasePlans) {
      const planUser = await User.query()
        .select('id', 'status')
        .where('id', plan.userId)
        .first()
      if (!planUser || planUser.status === 'inactive') {
        skipped += 1
        continue
      }

      // Guard: skip purchase plans with no valid approved purchase (orphans).
      if (plan.purchaseId) {
        const purchase = await Purchase.query()
          .select('id', 'approvedAt', 'cancelledAt', 'stoppedAt')
          .where('id', plan.purchaseId)
          .first()
        if (!purchase || !purchase.approvedAt || purchase.cancelledAt || purchase.stoppedAt) {
          plan.status = 'closed'
          plan.closedAt = DateTime.now()
          plan.remark = `Auto-closed: linked purchase ${!purchase ? 'not found' : !purchase.approvedAt ? 'not approved' : 'cancelled/stopped'}`
          await plan.save()
          skipped += 1
          continue
        }
      } else {
        plan.status = 'closed'
        plan.closedAt = DateTime.now()
        plan.remark = 'Auto-closed: no linked purchase'
        await plan.save()
        skipped += 1
        continue
      }

      const reachedMax = await this.hasReachedMaxReturn(plan)
      if (reachedMax) {
        plan.status = 'closed'
        plan.closedAt = DateTime.now()
        plan.remark = 'Maximum return reached (100%)'
        await plan.save()
        maxReturnReached += 1
        continue
      }

      const existing = await PurchaseReturn.query()
        .where('investment_id', plan.id)
        .where('period_month', period.toISODate()!)
        .first()

      if (existing) {
        skipped += 1
        continue
      }

      const rate = Number(plan.monthlyReturnRate) || 3
      const purchaseAmount = await this.getEffectiveAmount(plan)

      const startedAt = plan.startedAt.setZone('Asia/Kolkata').startOf('day')
      const monthEnd = period.endOf('month').setZone('Asia/Kolkata').startOf('day')
      const activeDays = Math.min(monthEnd.diff(startedAt, 'days').days + 1, 30)
      const prorateFactor = Math.max(activeDays, 1) / 30

      const returnAmount = this.roundMoney((purchaseAmount * rate * prorateFactor) / 100)
      const incomeAmount = this.roundMoney((returnAmount * INCOME_WALLET_PERCENT) / 100)
      const repurchaseAmount = this.roundMoney((returnAmount * REPURCHASE_WALLET_PERCENT) / 100)

      await PurchaseReturn.create({
        investmentId: plan.id,
        userId: plan.userId,
        periodMonth: period,
        investmentAmount: purchaseAmount,
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
