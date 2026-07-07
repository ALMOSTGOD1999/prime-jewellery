import type { HttpContext } from '@adonisjs/core/http'
import PayoutService from '#services/payout_service'
import { DateTime } from 'luxon'

export default class AdminPayoutController {
  async index({ inertia }: HttpContext) {
    const incomeMonth = await PayoutService.getIncomeWalletPayoutMonth()
    const workingMonth = await PayoutService.getWorkingWalletPayoutMonth()
    const nextIncomeMonth = await PayoutService.getNextPayoutMonth('income')
    const nextWorkingMonth = await PayoutService.getNextPayoutMonth('working')

    return inertia.render('admin/payout', {
      incomeWalletPayoutMonth: incomeMonth?.toFormat('yyyy-MM') ?? null,
      workingWalletPayoutMonth: workingMonth?.toFormat('yyyy-MM') ?? null,
      nextIncomeMonth: nextIncomeMonth.toFormat('yyyy-MM'),
      nextWorkingMonth: nextWorkingMonth.toFormat('yyyy-MM'),
    })
  }

  async incomeWalletPayout({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const { month } = request.all()
    const targetMonth = month
      ? DateTime.fromISO(month + '-01').startOf('month')
      : await PayoutService.getNextPayoutMonth('income')

    try {
      const result = await PayoutService.processIncomeWalletPayout(targetMonth, admin.id)
      session.flash(
        'success',
        `Income wallet payout completed for ${result.month}. Processed ${result.processed} distributions.`
      )
    } catch (error) {
      session.flash('errors.global', error.message)
    }

    return response.redirect().back()
  }

  async workingWalletPayout({ request, session, response }: HttpContext) {
    const { month } = request.all()
    const targetMonth = month
      ? DateTime.fromISO(month + '-01').startOf('month')
      : await PayoutService.getNextPayoutMonth('working')

    try {
      const result = await PayoutService.processWorkingWalletPayout(targetMonth)
      session.flash('success', `Working wallet payout completed for ${result.month}.`)
    } catch (error) {
      session.flash('errors.global', error.message)
    }

    return response.redirect().back()
  }
}
