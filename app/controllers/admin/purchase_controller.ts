import type { HttpContext } from '@adonisjs/core/http'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import GoldService from '#services/gold_service'
import InvoiceService from '#services/invoice_service'
import { approvalValidator, purchaseUpdateValidator } from '#validators/admin_validator'

export default class AdminPurchaseController {
  async index({ inertia, request }: HttpContext) {
    const { status = 'all' } = request.qs()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'amount', 'createdAt', 'approvedAt']
    const {
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = await filterValidator(allowedSortColumns).validate(request.qs())

    const purchases = await GoldService.getAdminPurchases({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      status,
    })

    return inertia.render('admin/purchases/index', {
      purchases: {
        meta: purchases.getMeta(),
        data: purchases.serialize().data.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          buyerName: p.buyerName || p.user.name,
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
          user: {
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
            phone: p.user.phone,
            avatar: p.user.avatar?.url,
          },
        })),
      },
    })
  }

  async update({ params, session, request, response }: HttpContext) {
    const { type, remark } = await request.validateUsing(approvalValidator)

    await GoldService.processPurchase(
      params.id,
      type as 'approved' | 'rejected' | 'stopped' | 'cancelled',
      remark
    )

    session.flash('success', `Purchase request ${type} successfully`)
    return response.redirect().back()
  }

  async updateDetails({ params, session, request, response }: HttpContext) {
    const data = await request.validateUsing(purchaseUpdateValidator)

    await GoldService.updatePurchaseDetails(params.id, data)

    session.flash('success', 'Purchase details updated successfully')
    return response.redirect().back()
  }

  async downloadInvoice({ params, response }: HttpContext) {
    try {
      const pdfBytes = await InvoiceService.generateGoldPurchaseInvoiceForAdmin(params.id)

      response.header('Content-Type', 'application/pdf')
      response.header(
        'Content-Disposition',
        `attachment; filename="purchase-invoice-${params.id}.pdf"`
      )
      return response.send(Buffer.from(pdfBytes))
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async history({ inertia, params, request }: HttpContext) {
    const { status = 'all' } = request.qs()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'amount', 'createdAt', 'approvedAt']
    const { sortBy = 'createdAt', sortOrder = 'desc' } = await filterValidator(
      allowedSortColumns
    ).validate(request.qs())

    const { user, purchases } = await GoldService.getUserPurchases(params.userId, {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
    })

    return inertia.render('admin/purchases/history', {
      targetUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar?.url,
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
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar?.url,
          },
        })),
      },
    })
  }
}
