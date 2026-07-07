import type { HttpContext } from '@adonisjs/core/http'

import { approvalValidator } from '#validators/admin_validator'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import TransactionService from '#services/transaction_service'

export default class AdminActivationController {
  async index({ inertia, request }: HttpContext) {
    const { status = 'all' } = request.qs()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'amount', 'utr', 'createdAt', 'approvedAt']
    const {
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = await filterValidator(allowedSortColumns).validate(request.qs())

    const { transactions, counts } = await TransactionService.getActivationRequests({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      status,
    })

    return inertia.render('admin/activation', {
      requests: {
        meta: transactions.getMeta(),
        data: transactions.serialize().data.map((t: any) => ({
          id: t.id,
          amount: t.amount,
          utr: t.utr,
          proof: t.proof,
          status: t.approvedAt ? 'approved' : t.rejectedAt ? 'rejected' : 'pending',
          createdAt: t.createdAt,
          user: {
            id: t.user.id,
            name: t.user.name,
            email: t.user.email,
            phone: t.user.phone,
            avatar: t.user.avatar,
          },
          source: t.source,
        })),
        counts,
      },
    })
  }

  async update({ params, session, request, response }: HttpContext) {
    const { type } = await request.validateUsing(approvalValidator)

    await TransactionService.processActivation(params.id, type as 'approved' | 'rejected')

    session.flash('success', `User activation ${type} successfully`)
    return response.redirect().back()
  }
}
