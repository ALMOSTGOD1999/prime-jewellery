import type { HttpContext } from '@adonisjs/core/http'
import RewardService from '#services/reward_service'
import PayoutService from '#services/payout_service'
import cache from '@adonisjs/cache/services/main'

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

    return inertia.render('dashboard', { metrics, goldPrice, userId: user.id, isPayoutReleased })
  }
}
