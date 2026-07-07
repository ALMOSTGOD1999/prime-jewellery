import type { HttpContext } from '@adonisjs/core/http'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import Transaction from '#models/transaction'
import db from '@adonisjs/lucid/services/db'

export default class AdminStatementController {
  async index({ inertia, request }: HttpContext) {
    const { page = 1, limit = 20 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'amount', 'createdAt', 'type', 'userId']
    const filters = await filterValidator(allowedSortColumns).validate(request.qs())
    const sortBy = filters.sortBy || 'createdAt'
    const sortOrder = filters.sortOrder || 'desc'
    const search = filters.search || ''
    const qs = request.qs() as Record<string, string>
    const type = qs.type || 'all'

    const query = Transaction.query()
      .preload('user', (q) => q.select('id', 'name', 'email', 'phone'))
      .orderBy(sortBy, sortOrder as 'asc' | 'desc')

    if (type !== 'all') {
      query.where('type', type)
    }

    if (search) {
      query.whereHas('user', (userQuery) => {
        userQuery
          .where('name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
          .orWhere('phone', 'ilike', `%${search}%`)
      })
    }

    const transactions = await query.paginate(page, limit)

    // Get unique transaction types for filter dropdown
    const types = await db.from('transactions').distinct('type').orderBy('type')

    return inertia.render('admin/statements', {
      transactions: {
        meta: transactions.getMeta(),
        data: transactions.serialize().data.map((t: any) => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          remark: t.remark,
          createdAt: t.createdAt,
          approvedAt: t.approvedAt,
          user: t.user
            ? {
                id: t.user.id,
                name: t.user.name,
                email: t.user.email,
                phone: t.user.phone,
              }
            : null,
        })),
      },
      transactionTypes: types.map((t: any) => t.type),
    })
  }
}
