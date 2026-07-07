import type { HttpContext } from '@adonisjs/core/http'
import Withdrawl from '#models/withdrawl'
import { WithdrawlStatusEnum } from '#enums/withdrawl'
import { DateTime } from 'luxon'
import { updateWithdrawalValidator } from '#validators/admin_withdrawal'

export default class AdminWithdrawalController {
  async index({ inertia, request }: HttpContext) {
    const { page = 1, limit = 10, status = 'all' } = request.qs()

    const query = Withdrawl.query().preload('user')

    if (status && status !== 'all') {
      query.where('status', status)
    }

    const withdrawals = await query.orderBy('created_at', 'desc').paginate(page, limit)

    // Calculate statistics
    const stats = await Withdrawl.query()
      .groupBy('status')
      .select('status')
      .sum('amount as total')
      .pojo<{ status: string; total: number }>()

    const formattedStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
    }

    stats.forEach((stat) => {
      if (stat.status === WithdrawlStatusEnum.PENDING) formattedStats.pending = Number(stat.total)
      if (stat.status === WithdrawlStatusEnum.APPROVED) formattedStats.approved = Number(stat.total)
      if (stat.status === WithdrawlStatusEnum.REJECTED) formattedStats.rejected = Number(stat.total)
    })

    return inertia.render('admin/withdrawal/index', {
      withdrawals: withdrawals.serialize(),
      stats: formattedStats,
    })
  }

  async update({ params, request, response, session }: HttpContext) {
    const payload = await request.validateUsing(updateWithdrawalValidator)
    const withdrawal = await Withdrawl.findOrFail(params.id)

    if (payload.status === WithdrawlStatusEnum.APPROVED) {
      withdrawal.status = WithdrawlStatusEnum.APPROVED
      withdrawal.approvedAt = DateTime.now()
      withdrawal.rejectedAt = null
    } else if (payload.status === WithdrawlStatusEnum.REJECTED) {
      withdrawal.status = WithdrawlStatusEnum.REJECTED
      withdrawal.rejectedAt = DateTime.now()
      withdrawal.approvedAt = null
    }

    withdrawal.remark = payload.remark || null
    await withdrawal.save()

    session.flash('success', 'Withdrawal updated successfully')
    return response.redirect().back()
  }
}
