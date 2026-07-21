import type { HttpContext } from '@adonisjs/core/http'
import PayoutService from '#services/payout_service'
import cache from '@adonisjs/cache/services/main'
import db from '@adonisjs/lucid/services/db'

import GoldService from '#services/gold_service'
import DashboardMetricsService from '#services/dashboard_metrics_service'

export default class DashboardController {
  async index({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const uid = user.id

    if (user.role === 'admin') {
      const [goldPrice, stats] = await Promise.all([
        cache.getOrSet({
          key: 'gold-price',
          ttl: '1h',
          grace: '2h',
          factory: async () => GoldService.getLiveGoldPrice(),
        }),
        DashboardMetricsService.getAdminMetrics(),
      ])
      return inertia.render('admin/dashboard', { stats, goldPrice })
    }

    // All independent queries run in parallel
    const [goldPrice, metrics, isPayoutReleased, investmentReturnRes, repurchaseRes, workingRes] =
      await Promise.all([
        cache.getOrSet({
          key: 'gold-price',
          ttl: '1h',
          grace: '2h',
          factory: async () => GoldService.getLiveGoldPrice(),
        }),
        DashboardMetricsService.getMetrics(uid),
        PayoutService.isPayoutReleased(),
        db.rawQuery(
          `SELECT coalesce(sum(
             CASE
               WHEN type = 'wallet_credit' THEN amount
               WHEN type = 'wallet_debit' THEN -amount
               ELSE 0
             END
           ), 0)::float as total
           FROM transactions WHERE user_id = ? AND remark ILIKE '%investment return%' AND (remark ILIKE '%cashback wallet%' OR remark ILIKE '%income wallet%')`,
          [uid]
        ),
        db.rawQuery(
          `SELECT coalesce(sum(
             CASE
               WHEN type = 'wallet_credit' THEN amount
               WHEN type = 'wallet_debit' THEN -amount
               ELSE 0
             END
           ), 0)::float as total
           FROM transactions WHERE user_id = ? AND remark ILIKE '%repurchase wallet%'`,
          [uid]
        ),
        db.rawQuery(`SELECT working_wallet FROM users WHERE id = ?`, [uid]),
      ])

    return inertia.render('dashboard', {
      metrics,
      goldPrice,
      userId: uid,
      isPayoutReleased,
      incomeWallet: Number(investmentReturnRes.rows[0]?.total ?? 0),
      repurchaseWallet: Number(repurchaseRes.rows[0]?.total ?? 0),
      workingWallet: Number(workingRes.rows[0]?.working_wallet ?? 0),
    })
  }
}
