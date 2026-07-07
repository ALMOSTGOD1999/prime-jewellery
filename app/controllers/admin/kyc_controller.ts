import type { HttpContext } from '@adonisjs/core/http'

import { approvalValidator } from '#validators/admin_validator'
import { filterValidator, paginationValidator } from '#validators/common_validator'
import KycService from '#services/kyc_service'

export default class AdminKycController {
  async index({ inertia, request }: HttpContext) {
    const { status = 'all' } = request.qs()
    const { page = 1, limit = 10 } = await paginationValidator.validate(request.qs())
    const allowedSortColumns = ['id', 'createdAt', 'approvedAt']
    const {
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = await filterValidator(allowedSortColumns).validate(request.qs())

    const { kycs, counts } = await KycService.getAdminKycs({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      status,
    })

    return inertia.render('admin/kyc', {
      requests: {
        meta: kycs.getMeta(),
        data: kycs.serialize().data.map((k: any) => ({
          id: k.id,
          panNumber: k.panNumber,
          aadhaarNumber: k.aadhaarNumber,
          panProof: k.panProof?.url,
          aadhaarProof: k.aadhaarProof?.url,
          status: k.approvedAt ? 'approved' : k.rejectedAt ? 'rejected' : 'pending',
          createdAt: k.createdAt,
          user: {
            id: k.user.id,
            name: k.user.name,
            email: k.user.email,
            phone: k.user.phone,
            avatar: k.user.avatar,
          },
        })),
        counts,
      },
    })
  }

  async update({ params, session, request, response }: HttpContext) {
    const { type } = await request.validateUsing(approvalValidator)

    await KycService.processKycUpdate(params.id, type as 'approved' | 'rejected')

    session.flash('success', `KYC details ${type} successfully`)
    return response.redirect().back()
  }
}
