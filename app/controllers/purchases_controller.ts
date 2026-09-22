import type { HttpContext } from '@adonisjs/core/http'

import PurchaseService from '#services/purchase_service'
import PayoutService from '#services/payout_service'
import { paginationValidator } from '#validators/common_validator'
import { withdrawPurchaseIncomeValidator } from '#validators/purchase_validator'

export default class PurchasesController {
  async index({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const { purchasePlans, distributions, stats } = await PurchaseService.getDashboard(user, {
      page,
      limit,
    })

    const visibleCutoff = await PayoutService.getVisibleCutoff()
    const isPayoutReleased = await PayoutService.isPayoutReleased()

    let filteredDistributions = distributions.serialize().data
    if (visibleCutoff) {
      const cutoffDate = visibleCutoff.toISODate()!
      filteredDistributions = filteredDistributions.filter((d: any) => d.periodMonth <= cutoffDate)
    } else {
      filteredDistributions = []
    }

    const visibleStats = isPayoutReleased
      ? stats
      : {
          activePurchaseAmount: stats.activePurchaseAmount,
          totalInvested: stats.totalInvested,
          totalReturn: 0,
          totalIncome: 0,
          totalGold: 0,
          totalWithdrawn: stats.totalWithdrawn,
          availableIncome: 0,
          incomeWalletPercent: stats.incomeWalletPercent,
          goldWalletPercent: stats.goldWalletPercent,
        }

    return inertia.render('purchases/index', {
      stats: visibleStats,
      isPayoutReleased,
      purchasePlans: purchasePlans.map((plan) => ({
        id: plan.id,
        amount: Number(plan.amount),
        monthlyReturnRate: Number(plan.monthlyReturnRate),
        status: plan.status,
        startedAt: plan.startedAt,
        closedAt: plan.closedAt,
        remark: plan.remark,
      })),
      // Legacy alias for backward compat
      investments: purchasePlans.map((plan) => ({
        id: plan.id,
        amount: Number(plan.amount),
        monthlyReturnRate: Number(plan.monthlyReturnRate),
        status: plan.status,
        startedAt: plan.startedAt,
        closedAt: plan.closedAt,
        remark: plan.remark,
      })),
      distributions: {
        meta: distributions.getMeta(),
        data: filteredDistributions.map((distribution: any) => ({
          id: distribution.id,
          purchasePlanId: distribution.investmentId,
          investmentId: distribution.investmentId,
          periodMonth: distribution.periodMonth,
          purchaseAmount: Number(distribution.investmentAmount),
          investmentAmount: Number(distribution.investmentAmount),
          returnAmount: Number(distribution.returnAmount),
          incomeAmount: Number(distribution.incomeAmount),
          goldAmount: Number(distribution.goldAmount),
          createdAt: distribution.createdAt,
        })),
      },
    })
  }

  async withdrawIncome({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { amount } = await request.validateUsing(withdrawPurchaseIncomeValidator)

    try {
      await PurchaseService.requestIncomeWithdrawal(user, amount)
      session.flash('success', 'Purchase income withdrawal request submitted successfully')
    } catch (error) {
      session.flash('errors.global', error.message)
    }

    return response.redirect().back()
  }
}
