import type { HttpContext } from '@adonisjs/core/http'
import PayoutService from '#services/payout_service'
import PlatformConfig from '#models/platform_config'
import { DateTime } from 'luxon'

export default class AdminPayoutController {
  async index({ inertia }: HttpContext) {
    try {
      const incomeMonth = await PayoutService.getIncomeWalletPayoutMonth()
      const workingMonth = await PayoutService.getWorkingWalletPayoutMonth()
      const nextIncomeMonth = await PayoutService.getNextPayoutMonth('income')
      const nextWorkingMonth = await PayoutService.getNextPayoutMonth('working')

      let hasUnpaidIncome = false
      let hasUnpaidWorking = false
      let diagnostic = {
        activeUsers: 0,
        junePurchaseCount: 0,
        junePurchaseAmount: 0,
        activeInvestments: 0,
      }

      try {
        hasUnpaidIncome = await PayoutService.hasUnpaidIncomeDistributions(nextIncomeMonth)
      } catch {
        hasUnpaidIncome = false
      }
      try {
        hasUnpaidWorking = await PayoutService.hasUnpaidWorkingSnapshots(nextWorkingMonth)
      } catch {
        hasUnpaidWorking = false
      }
      try {
        diagnostic = await PayoutService.getDiagnostics(nextIncomeMonth)
      } catch {
        /* ignore */
      }

      const now = DateTime.now().startOf('month')
      const incomeIsFuture = incomeMonth && incomeMonth > now
      const workingIsFuture = workingMonth && workingMonth > now

      return inertia.render('admin/payout', {
        incomeWalletPayoutMonth: incomeMonth?.toFormat('yyyy-MM') ?? null,
        workingWalletPayoutMonth: workingMonth?.toFormat('yyyy-MM') ?? null,
        nextIncomeMonth: nextIncomeMonth.toFormat('yyyy-MM'),
        nextWorkingMonth: nextWorkingMonth.toFormat('yyyy-MM'),
        hasUnpaidIncome,
        hasUnpaidWorking,
        needsReset: incomeIsFuture || workingIsFuture,
        diagnostic,
      })
    } catch {
      return inertia.render('admin/payout', {
        incomeWalletPayoutMonth: null,
        workingWalletPayoutMonth: null,
        nextIncomeMonth: DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM'),
        nextWorkingMonth: DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM'),
        hasUnpaidIncome: false,
        hasUnpaidWorking: false,
        needsReset: false,
        diagnostic: {
          activeUsers: 0,
          junePurchaseCount: 0,
          junePurchaseAmount: 0,
          activeInvestments: 0,
        },
      })
    }
  }

  async reset({ session, response }: HttpContext) {
    try {
      await PlatformConfig.set('income_wallet_payout_month', '', 'payout')
      await PlatformConfig.set('working_wallet_payout_month', '', 'payout')
      session.flash('success', 'Payout months reset.')
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  async incomeWalletPayout({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const { month } = request.all()
    const targetMonth = month
      ? DateTime.fromISO(month + '-01').startOf('month')
      : await PayoutService.getNextPayoutMonth('income')

    const now = DateTime.now().startOf('month')
    if (targetMonth >= now) {
      session.flash('errors.global', `Cannot process ${targetMonth.toFormat('yyyy-MM')}.`)
      return response.redirect().back()
    }

    // Prevent double-processing
    const alreadyPaid = await PlatformConfig.get('income_wallet_payout_month')
    if (alreadyPaid) {
      const paidMonth = DateTime.fromISO(alreadyPaid + '-01').startOf('month')
      if (paidMonth >= targetMonth) {
        session.flash(
          'errors.global',
          `Income payout for ${targetMonth.toFormat('yyyy-MM')} already done.`
        )
        return response.redirect().back()
      }
    }

    try {
      const result = await PayoutService.processIncomeWalletPayout(targetMonth, admin.id)
      session.flash('success', `Income payout done. ${result.processed} distributions.`)
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }

  async workingWalletPayout({ auth, request, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const { month } = request.all()
    const targetMonth = month
      ? DateTime.fromISO(month + '-01').startOf('month')
      : await PayoutService.getNextPayoutMonth('working')

    const now = DateTime.now().startOf('month')
    if (targetMonth >= now) {
      session.flash('errors.global', `Cannot process ${targetMonth.toFormat('yyyy-MM')}.`)
      return response.redirect().back()
    }

    // Prevent double-processing (duplicate credits)
    const alreadyPaid = await PlatformConfig.get('working_wallet_payout_month')
    if (alreadyPaid) {
      const paidMonth = DateTime.fromISO(alreadyPaid + '-01').startOf('month')
      if (paidMonth >= targetMonth) {
        session.flash(
          'errors.global',
          `Working payout for ${targetMonth.toFormat('yyyy-MM')} already done. Duplicate prevented.`
        )
        return response.redirect().back()
      }
    }

    try {
      const result = await PayoutService.processWorkingWalletPayout(targetMonth, admin.id)
      session.flash(
        'success',
        `Working payout done. ${result.credited} users, ₹${result.totalAmount.toLocaleString('en-IN')}.`
      )
    } catch (error) {
      session.flash('errors.global', error.message)
    }
    return response.redirect().back()
  }
}
