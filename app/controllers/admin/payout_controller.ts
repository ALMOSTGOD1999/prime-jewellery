import type { HttpContext } from '@adonisjs/core/http'
import PayoutService from '#services/payout_service'
import PlatformConfig from '#models/platform_config'
import ProcessWorkingPayout from '#jobs/process_working_payout'
import User from '#models/user'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'
import db from '@adonisjs/lucid/services/db'
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
      await PayoutService.releasePayoutLock('income')
      await PayoutService.releasePayoutLock('working')
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

    // Atomic in-progress lock: a second click while the first request is still
    // running is rejected instead of double-crediting users.
    const acquired = await PayoutService.acquirePayoutLock('income', targetMonth)
    if (!acquired) {
      session.flash(
        'errors.global',
        `Income payout for ${targetMonth.toFormat('yyyy-MM')} is already in progress. Please wait for it to finish.`
      )
      return response.redirect().back()
    }

    try {
      const result = await PayoutService.processIncomeWalletPayout(targetMonth, admin.id)
      session.flash('success', `Income payout done. ${result.processed} distributions.`)
    } catch (error) {
      session.flash('errors.global', error.message)
    } finally {
      await PayoutService.releasePayoutLock('income')
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

    // Atomic in-progress lock: held from enqueue until the background job
    // finishes, so a double-click cannot enqueue two jobs for the same month.
    const acquired = await PayoutService.acquirePayoutLock('working', targetMonth)
    if (!acquired) {
      session.flash(
        'errors.global',
        `Working payout for ${targetMonth.toFormat('yyyy-MM')} is already in progress. Please wait for it to finish.`
      )
      return response.redirect().back()
    }

    try {
      // The working payout computation is heavy (several minutes), so it runs
      // in the background. The job credits wallets for the full target month
      // (day 1 → last day), records the payout month, and releases the lock.
      await ProcessWorkingPayout.enqueue(targetMonth.toFormat('yyyy-MM'), admin.id)
      session.flash(
        'success',
        `Working payout for ${targetMonth.toFormat('yyyy-MM')} started in the background. Wallets will be credited automatically once processing completes (usually a few minutes).`
      )
    } catch (error) {
      session.flash('errors.global', error.message)
      await PayoutService.releasePayoutLock('working')
    }
    return response.redirect().back()
  }

  async withdrawAllIncome({ auth, session, response }: HttpContext) {
    const admin = auth.getUserOrFail()

    // 1. Approve all pending income wallet withdrawal requests (existing behavior)
    await db.rawQuery(
      `UPDATE withdrawls SET status = 'approved', approved_at = NOW() WHERE type = 'investment_income' AND status = 'pending'`
    )

    // 2. Clear every user's cashback (income) wallet so the amount leaves the
    //    system, while keeping a per-user audit trail (wallet_debit history).
    //    Working wallets are intentionally left unchanged.
    let cleared = 0
    let totalCleared = 0

    await db.transaction(async (trx) => {
      const users = await User.query({ client: trx })
        .whereNot('role', 'admin')
        .where('income_wallet', '>', 0)
        .select('id', 'income_wallet')

      for (const user of users) {
        const amount = Number(user.incomeWallet)
        if (amount <= 0) continue

        await Transaction.create(
          {
            userId: user.id,
            type: TransactionTypeEnum.WALLET_DEBIT,
            amount,
            remark: `Income wallet (cashback) withdrawal — payout cleared by admin #${admin.id}`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )

        user.useTransaction(trx)
        user.incomeWallet = 0
        await user.save()

        cleared++
        totalCleared += amount
      }
    })

    session.flash(
      'success',
      `All pending income wallet withdrawals approved. ${cleared} cashback wallets cleared (₹${totalCleared.toLocaleString('en-IN')}).`
    )
    return response.redirect().back()
  }

  async withdrawAllWorking({ auth, session, response }: HttpContext) {
    await auth.getUserOrFail()
    await db.rawQuery(
      `UPDATE withdrawls SET status = 'approved', approved_at = NOW() WHERE type != 'investment_income' AND status = 'pending'`
    )
    session.flash('success', 'All pending working wallet withdrawals approved.')
    return response.redirect().back()
  }
}
