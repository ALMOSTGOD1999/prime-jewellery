import type { HttpContext } from '@adonisjs/core/http'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import { purchaseValidator } from '#validators/gold_validator'
import GoldService from '#services/gold_service'
import GoldBillingConfig from '#services/gold_billing_config'
import InvoiceService from '#services/invoice_service'
import User from '#models/user'

export default class GoldsController {
  async purchasePage({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { status = 'all' } = request.qs()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'createdAt', 'amount', 'status']
    const { sortBy = 'createdAt', sortOrder = 'desc' } = await filterValidator(
      allowedSortColumns
    ).validate(request.qs())

    const { balance, purchases, counts } = await GoldService.getPurchaseData(user, {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
    })

    const billingRates = await GoldBillingConfig.getRates()

    return inertia.render('gold/purchase', {
      balance,
      billingRates,
      user: {
        id: user.id,
        name: user.name,
        walletBalance: Number(user.walletBalance ?? 0),
        state: user.state,
      },
      purchases: {
        meta: purchases.getMeta(),
        data: purchases.serialize().data.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          buyerName: p.buyerName || user.name,
          quantity: p.quantity,
          status: p.cancelledAt
            ? 'cancelled'
            : p.stoppedAt
              ? 'stopped'
              : p.approvedAt
                ? 'approved'
                : p.rejectedAt
                  ? 'rejected'
                  : 'pending',
          createdAt: p.createdAt,
          approvedAt: p.approvedAt,
          rejectedAt: p.rejectedAt,
          stoppedAt: p.stoppedAt,
          cancelledAt: p.cancelledAt,
        })),
        counts,
      },
    })
  }

  async purchase({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(purchaseValidator)

    try {
      await GoldService.purchaseGold(user, payload)
      session.flash('success', 'Gold purchase completed successfully')
    } catch (error) {
      session.flashErrors({ form: error.message })
    }

    return response.redirect().back()
  }

  async searchCustomers({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const { q } = request.qs()

    if (!q || q.length < 2) {
      return response.ok({ data: [] })
    }

    const users = await User.query()
      .whereNot('role', 'admin')
      .whereNot('id', user.id)
      .where((builder) => {
        builder
          .whereILike('name', `%${q}%`)
          .orWhereILike('email', `%${q}%`)
          .orWhereILike('phone', `%${q}%`)
          .orWhere('id', Number.isInteger(Number(q)) ? Number(q) : -1)
      })
      .limit(10)
      .select('id', 'name', 'email', 'phone', 'wallet_balance', 'state')

    return response.ok({
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        walletBalance: Number(u.walletBalance ?? 0),
        state: u.state,
      })),
    })
  }

  async downloadPurchaseBill({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const purchaseId = params.id

    try {
      const pdfBytes = await InvoiceService.generateGoldPurchaseInvoice(purchaseId, user.id)

      response.header('Content-Type', 'application/pdf')
      response.header(
        'Content-Disposition',
        `attachment; filename="gold-purchase-invoice-${purchaseId}.pdf"`
      )
      return response.send(Buffer.from(pdfBytes))
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }
}
