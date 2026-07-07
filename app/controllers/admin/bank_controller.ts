import type { HttpContext } from '@adonisjs/core/http'

import { approvalValidator } from '#validators/admin_validator'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import BankService from '#services/bank_service'

export default class AdminBankController {
  async index({ inertia, request }: HttpContext) {
    const { status = 'all' } = request.qs()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'createdAt', 'approvedAt']
    const {
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = await filterValidator(allowedSortColumns).validate(request.qs())

    const { banks, counts } = await BankService.getAdminBanks({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      status,
    })

    return inertia.render('admin/bank', {
      requests: {
        meta: banks.getMeta(),
        data: banks.serialize().data.map((b: any) => ({
          id: b.id,
          name: b.name,
          branch: b.branch,
          ifsc: b.ifsc,
          holderName: b.holderName,
          accountNumber: b.accountNumber,
          upi: b.upi,
          qr: b.qr?.url,
          status: b.approvedAt ? 'approved' : b.rejectedAt ? 'rejected' : 'pending',
          createdAt: b.createdAt,
          user: {
            id: b.user.id,
            name: b.user.name,
            email: b.user.email,
            phone: b.user.phone,
            avatar: b.user.avatar,
          },
        })),
        counts,
      },
    })
  }

  async update({ params, session, request, response }: HttpContext) {
    const { type } = await request.validateUsing(approvalValidator)

    await BankService.processBankUpdate(params.id, type as 'approved' | 'rejected')

    session.flash('success', `Bank details ${type} successfully`)
    return response.redirect().back()
  }
}
