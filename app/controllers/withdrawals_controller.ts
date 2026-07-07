import type { HttpContext } from '@adonisjs/core/http'
import PayoutService from '#services/payout_service'

export default class WithdrawalsController {
  async index({ inertia, auth, request }: HttpContext) {
    const { page = 1, limit = 10 } = request.qs()
    const user = auth.user!
    const isPayoutReleased = await PayoutService.isPayoutReleased()
    const visibleCutoffEnd = await PayoutService.getVisibleCutoffEndOfMonth()

    let query = user.related('withdrawls').query().orderBy('created_at', 'desc')

    if (!isPayoutReleased && visibleCutoffEnd) {
      query = query.where('created_at', '<=', visibleCutoffEnd.toSQL()!)
    } else if (!isPayoutReleased) {
      // No withdrawals visible if nothing was ever released
      query = query.whereRaw('1 = 0')
    }

    const withdrawals = await query.paginate(page, limit)

    return inertia.render('withdrawals/index', {
      withdrawals: withdrawals.serialize(),
      isPayoutReleased,
    })
  }
}
