import type { HttpContext } from '@adonisjs/core/http'
import PayoutService from '#services/payout_service'
import type { PayoutPreviewResult } from '#services/payout_service'
import PlatformConfig from '#models/platform_config'
import ProcessWorkingPayout from '#jobs/process_working_payout'
import GeneratePayoutPreview from '#jobs/generate_payout_preview'
import User from '#models/user'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { PDF, rgb } from '@libpdf/core'

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

    // Prevent double-processing: block only when a NEWER month has already been
    // recorded. Re-running the current target month is allowed — paid
    // distributions are skipped inside processIncomeWalletPayout, so a re-run
    // never double-credits anyone and simply finishes any unpaid leftovers.
    const alreadyPaid = await PlatformConfig.get('income_wallet_payout_month')
    if (alreadyPaid) {
      const paidMonth = DateTime.fromISO(alreadyPaid + '-01').startOf('month')
      if (paidMonth > targetMonth) {
        session.flash(
          'errors.global',
          `Cannot process ${targetMonth.toFormat('yyyy-MM')} — a later payout month (${paidMonth.toFormat('yyyy-MM')}) is already recorded.`
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
      if (result.processed === 0) {
        session.flash(
          'success',
          `Cashback payout for ${targetMonth.toFormat('yyyy-MM')} is already complete — no unpaid distributions found.`
        )
      } else {
        session.flash('success', `Income payout done. ${result.processed} distributions.`)
      }
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
            remark: `Income wallet (cashback) withdrawal from investment return — payout cleared by admin #${admin.id}`,
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

  // ─── Payout Preview (cached) ──────────────────────────────────

  private cacheKey(month: string) {
    return `payout_preview_${month}`
  }

  private async getCachedPreview(month: string) {
    const raw = await PlatformConfig.get(this.cacheKey(month))
    return raw ? JSON.parse(raw) as PayoutPreviewResult : null
  }

  async preview({ inertia, request }: HttpContext) {
    const qs = request.qs() as Record<string, string>
    const month = qs.month
      ? DateTime.fromISO(qs.month + '-01').startOf('month')
      : DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')

    // Serve from cache — instant load
    const cached = await this.getCachedPreview(monthStr)

    // Build last 12 months for the dropdown
    const availableMonths: { value: string; label: string }[] = []
    for (let i = 0; i < 12; i++) {
      const m = DateTime.now().minus({ months: i })
      availableMonths.push({
        value: m.toFormat('yyyy-MM'),
        label: m.toFormat('LLLL yyyy'),
      })
    }

    return inertia.render('admin/payout/preview', {
      month: monthStr,
      users: cached?.users || [],
      summary: cached?.summary || { totalIncomeWallet: 0, totalWorkingWallet: 0, grandTotal: 0, eligibleUsers: 0 },
      availableMonths,
      generatedAt: cached ? (cached as any).generatedAt || null : null,
    })
  }

  async generate({ request, response, session }: HttpContext) {
    const qs = request.qs() as Record<string, string>
    const month = qs.month
      ? DateTime.fromISO(qs.month + '-01').startOf('month')
      : DateTime.now().minus({ months: 1 }).startOf('month')
    const monthStr = month.toFormat('yyyy-MM')

    // Check if already generating (prevent duplicate enqueues)
    const existingCache = await PlatformConfig.get(`payout_preview_generating_${monthStr}`)
    if (existingCache === 'true') {
      session.flash('info', `Payout preview for ${month.toFormat('LLLL yyyy')} is already being generated. Please wait...`)
      return response.redirect(`/admin/payout/preview?month=${monthStr}`)
    }

    // Mark as generating
    await PlatformConfig.set(`payout_preview_generating_${monthStr}`, 'true', 'payout_preview')

    // Enqueue the heavy computation as a background job
    await GeneratePayoutPreview.enqueue(monthStr)

    session.flash('success', `Payout preview generation for ${month.toFormat('LLLL yyyy')} started. This may take a few minutes — the page will refresh automatically.`)
    return response.redirect(`/admin/payout/preview?month=${monthStr}`)
  }

  async previewStatus({ request, response }: HttpContext) {
    const qs = request.qs() as Record<string, string>
    const month = qs.month || DateTime.now().minus({ months: 1 }).startOf('month').toFormat('yyyy-MM')

    const generating = await PlatformConfig.get(`payout_preview_generating_${month}`)
    const cached = await this.getCachedPreview(month)

    return response.json({
      generating: generating === 'true',
      ready: !!cached,
      generatedAt: cached ? (cached as any).generatedAt || null : null,
    })
  }

  async downloadPreview({ request, response }: HttpContext) {
    const qs = request.qs() as Record<string, string>
    if (!qs.month) {
      return response.status(400).send('month query parameter is required (YYYY-MM).')
    }

    const month = DateTime.fromISO(qs.month + '-01').startOf('month')
    const monthName = month.toFormat('LLLL yyyy')

    // Read from cache — no recomputation
    const cached = await this.getCachedPreview(month.toFormat('yyyy-MM'))
    if (!cached || cached.users.length === 0) {
      return response.status(404).send('No payout preview data found. Please generate the preview first from the preview page.')
    }

    const pdf = PDF.create()
    pdf.setTitle(`Payout Preview — ${monthName}`)

    let page = pdf.addPage({ size: 'a4' })
    const { height } = page
    const margin = 28
    const pageBottom = margin + 20
    let yPos = height - margin

    const dark = rgb(0.1, 0.1, 0.1)
    const muted = rgb(0.4, 0.4, 0.4)
    const headerBg = rgb(0.13, 0.27, 0.42)
    const green = rgb(0.1, 0.6, 0.3)
    const blue = rgb(0.2, 0.4, 0.7)
    const separatorColor = rgb(0.8, 0.8, 0.8)

    const drawTitle = (p: any, y: number) => {
      p.drawText('Prime Jewellery', {
        x: margin, y, size: 16, font: 'Helvetica-Bold', color: headerBg,
      })
      y -= 22
      p.drawText(`Payout Preview — ${monthName}`, {
        x: margin, y, size: 12, font: 'Helvetica-Bold', color: dark,
      })
      y -= 16
      p.drawText(
        `Eligible Users: ${cached.summary.eligibleUsers}  |  Grand Total: ₹${cached.summary.grandTotal.toLocaleString('en-IN')}  |  Generated: ${(cached as any).generatedAt ? DateTime.fromISO((cached as any).generatedAt).toFormat('dd-MM-yyyy hh:mm a') : DateTime.now().toFormat('dd-MM-yyyy hh:mm a')}`,
        { x: margin, y, size: 8, font: 'Helvetica', color: muted }
      )
      return y - 22
    }

    yPos = drawTitle(page, yPos)

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    const drawLine = (p: any, y: number) => {
      p.drawRectangle({
        x: margin, y: y - 1, width: 535, height: 0.5, color: separatorColor,
      })
      return y - 8
    }

    const drawField = (p: any, y: number, label: string, value: string, indent: number = 0) => {
      p.drawText(label, {
        x: margin + indent, y, size: 7, font: 'Helvetica', color: muted,
      })
      p.drawText(value, {
        x: margin + 180 + indent, y, size: 7, font: 'Helvetica-Bold', color: dark,
      })
      return y - 11
    }

    const drawSubtotal = (p: any, y: number, label: string, value: string) => {
      p.drawText(label, {
        x: margin, y, size: 7.5, font: 'Helvetica-Bold', color: blue,
      })
      p.drawText(value, {
        x: margin + 180, y, size: 7.5, font: 'Helvetica-Bold', color: blue,
      })
      return y - 12
    }

    const ROW_BLOCK = 11 // height per field line

    for (const user of cached.users) {
      // Estimate space needed for this user block
      const fieldsNeeded = 4 + // header + separator + combined total + blank
        (user.incomeWallet ? 8 : 0) + // income section fields
        (user.workingWallet ? 12 : 0) // working section fields

      if (yPos < pageBottom + fieldsNeeded * ROW_BLOCK) {
        page = pdf.addPage({ size: 'a4' })
        yPos = height - margin
        yPos = drawTitle(page, yPos)
      }

      // User header
      page.drawText(`${user.userName} (${user.userCode})`, {
        x: margin, y: yPos, size: 8, font: 'Helvetica-Bold', color: headerBg,
      })
      yPos -= 12
      yPos = drawLine(page, yPos)

      // Income Wallet section
      if (user.incomeWallet) {
        page.drawText('INCOME WALLET (Cashback)', {
          x: margin, y: yPos, size: 7.5, font: 'Helvetica-Bold', color: dark,
        })
        yPos -= 12
        yPos = drawField(page, yPos, 'Investment Amount:', fmt(user.incomeWallet.investmentAmount))
        yPos = drawField(page, yPos, 'Return Rate:', `${user.incomeWallet.returnRate}%`)
        yPos = drawField(page, yPos, 'Return Amount:', fmt(user.incomeWallet.returnAmount))
        page.drawText('→', { x: margin + 168, y: yPos + 11, size: 7, font: 'Helvetica-Bold', color: green })
        yPos = drawField(page, yPos, 'Income Wallet (70%):', fmt(user.incomeWallet.incomeShare))
        yPos = drawField(page, yPos, 'Repurchase (20%):', fmt(user.incomeWallet.repurchaseShare))
        yPos = drawField(page, yPos, 'Admin (10%):', fmt(user.incomeWallet.adminShare))
        yPos = drawLine(page, yPos)
      }

      // Working Wallet section
      if (user.workingWallet) {
        page.drawText('WORKING WALLET', {
          x: margin, y: yPos, size: 7.5, font: 'Helvetica-Bold', color: dark,
        })
        yPos -= 12
        yPos = drawField(page, yPos, 'Activation Cashback:', fmt(user.workingWallet.activationCashback))
        yPos = drawField(page, yPos, 'Activation Sponsor:', fmt(user.workingWallet.activationSponsor))
        yPos = drawField(page, yPos, 'Activation Level:', fmt(user.workingWallet.activationLevel))
        yPos = drawField(page, yPos, 'Level Income:', fmt(user.workingWallet.levelIncome))
        yPos = drawField(page, yPos, 'EMI Level Income:', fmt(user.workingWallet.emiLevelIncome))
        yPos = drawField(page, yPos, 'Salary:', fmt(user.workingWallet.salary))
        yPos = drawField(page, yPos, 'Gross Total:', fmt(user.workingWallet.grossTotal))
        page.drawText('→', { x: margin + 168, y: yPos + 11, size: 7, font: 'Helvetica-Bold', color: green })
        yPos = drawField(page, yPos, 'Working Wallet (70%):', fmt(user.workingWallet.workingShare))
        yPos = drawField(page, yPos, 'Repurchase (20%):', fmt(user.workingWallet.repurchaseShare))
        yPos = drawField(page, yPos, 'Admin (10%):', fmt(user.workingWallet.adminShare))
      }

      // Combined total
      yPos -= 2
      yPos = drawSubtotal(page, yPos, 'COMBINED TOTAL:', fmt(user.totalPayout))
      yPos -= 6
    }

    // Grand totals footer
    if (yPos < pageBottom + 60) {
      page = pdf.addPage({ size: 'a4' })
      yPos = height - margin
      yPos = drawTitle(page, yPos)
    }

    yPos = drawLine(page, yPos)
    page.drawText('GRAND TOTALS', {
      x: margin, y: yPos, size: 9, font: 'Helvetica-Bold', color: headerBg,
    })
    yPos -= 14
    yPos = drawField(page, yPos, 'Total Income Wallet Payout:', fmt(cached.summary.totalIncomeWallet))
    yPos = drawField(page, yPos, 'Total Working Wallet Payout:', fmt(cached.summary.totalWorkingWallet))
    page.drawText('→', { x: margin + 168, y: yPos + 11, size: 8, font: 'Helvetica-Bold', color: green })
    yPos = drawSubtotal(page, yPos, 'Grand Total:', fmt(cached.summary.grandTotal))
    yPos = drawField(page, yPos, 'Eligible Users:', String(cached.summary.eligibleUsers))

    // Footer
    page.drawText('Prime Jewellery — Payout Preview Report', {
      x: margin, y: pageBottom - 10, size: 8, font: 'Helvetica', color: muted,
    })

    const pdfBytes = await pdf.save()
    response.header('Content-Type', 'application/pdf')
    response.header(
      'Content-Disposition',
      `attachment; filename="payout-preview-${month.toFormat('yyyy-MM')}.pdf"`
    )
    return response.send(Buffer.from(pdfBytes))
  }
}
