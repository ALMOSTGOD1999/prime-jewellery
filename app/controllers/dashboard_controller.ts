import type { HttpContext } from '@adonisjs/core/http'
import RewardService from '#services/reward_service'
import PayoutService from '#services/payout_service'
import cache from '@adonisjs/cache/services/main'
import db from '@adonisjs/lucid/services/db'

import UserService from '#services/user_service'
import GoldService from '#services/gold_service'

export default class DashboardController {
  async index({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()

    const goldPrice = await cache.getOrSet({
      key: 'gold-price',
      ttl: '1h',
      grace: '2h',
      factory: async () => GoldService.getLiveGoldPrice(),
    })

    if (user.role === 'admin') {
      const stats = await UserService.getAdminDashboardMetrics()
      return inertia.render('admin/dashboard', { stats, goldPrice })
    }
    const metrics = await RewardService.getDashboardMetrics(user)
    const isPayoutReleased = await PayoutService.isPayoutReleased()

    // Compute total working income from transactions
    const workingRes = await db.rawQuery(
      `SELECT coalesce(sum(amount), 0)::float as total FROM transactions WHERE user_id = ? AND type = 'wallet_credit' AND remark ILIKE '%working income%'`,
      [user.id]
    )

    return inertia.render('dashboard', {
      metrics,
      goldPrice,
      userId: user.id,
      isPayoutReleased,
      incomeWallet: Number(user.incomeWallet ?? 0),
      workingWallet: Number(workingRes.rows[0]?.total ?? 0),
    })
  }
}
