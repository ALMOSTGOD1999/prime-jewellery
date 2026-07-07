import type { HttpContext } from '@adonisjs/core/http'

import InvestmentService from '#services/investment_service'
import PayoutService from '#services/payout_service'
import { paginationValidator } from '#validators/common_validator'
import {
  createInvestmentValidator,
  withdrawInvestmentIncomeValidator,
} from '#validators/investment_validator'

export default class InvestmentsController {
  async index({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const { investments, distributions, stats } = await InvestmentService.getDashboard(user, {
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

    // Also filter stats to only include paid-out distributions
    const visibleStats = isPayoutReleased
      ? stats
      : {
          activeInvestmentAmount: stats.activeInvestmentAmount,
          totalInvested: stats.totalInvested,
          totalReturn: 0,
          totalIncome: 0,
          totalGold: 0,
          totalWithdrawn: stats.totalWithdrawn,
          availableIncome: 0,
          incomeWalletPercent: stats.incomeWalletPercent,
          goldWalletPercent: stats.goldWalletPercent,
        }

    return inertia.render('investments/index', {
      stats: visibleStats,
      isPayoutReleased,
      investments: investments.map((investment) => ({
        id: investment.id,
        amount: Number(investment.amount),
        monthlyReturnRate: Number(investment.monthlyReturnRate),
        status: investment.status,
        startedAt: investment.startedAt,
        closedAt: investment.closedAt,
        remark: investment.remark,
      })),
      distributions: {
        meta: distributions.getMeta(),
        data: filteredDistributions.map((distribution: any) => ({
          id: distribution.id,
          investmentId: distribution.investmentId,
          periodMonth: distribution.periodMonth,
          investmentAmount: Number(distribution.investmentAmount),
          returnAmount: Number(distribution.returnAmount),
          incomeAmount: Number(distribution.incomeAmount),
          goldAmount: Number(distribution.goldAmount),
          createdAt: distribution.createdAt,
        })),
      },
    })
  }

  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { amount, remark } = await request.validateUsing(createInvestmentValidator)

    try {
      await InvestmentService.createInvestment(user, amount, remark)

      const rate = amount >= 500000 ? 8 : 6
      const returnAmount = InvestmentService.roundMoney((amount * rate) / 100)
      const incomeAmount = InvestmentService.roundMoney(
        (returnAmount * InvestmentService.incomeWalletPercent) / 100
      )
      const goldAmount = InvestmentService.roundMoney(returnAmount - incomeAmount)

      session.flash(
        'success',
        `Investment created. Monthly return will be ₹${returnAmount.toLocaleString('en-IN')} split as ₹${incomeAmount.toLocaleString('en-IN')} income and ₹${goldAmount.toLocaleString('en-IN')} gold wallet.`
      )
    } catch (error) {
      session.flashErrors({ amount: error.message })
    }

    return response.redirect().back()
  }

  async withdrawIncome({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { amount } = await request.validateUsing(withdrawInvestmentIncomeValidator)

    try {
      await InvestmentService.requestIncomeWithdrawal(user, amount)
      session.flash('success', 'Investment income withdrawal request submitted successfully')
    } catch (error) {
      session.flash('errors.global', error.message)
    }

    return response.redirect().back()
  }
}
