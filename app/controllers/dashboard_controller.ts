import type { HttpContext } from '@adonisjs/core/http'
import PayoutService from '#services/payout_service'
import cache from '@adonisjs/cache/services/main'
import db from '@adonisjs/lucid/services/db'

import GoldService from '#services/gold_service'
import DashboardMetricsService from '#services/dashboard_metrics_service'

/** Remark patterns that identify which wallet a transaction belongs to. */
const WALLET_REMARK_PATTERNS: Record<string, string[]> = {
  income: [
    '%Cashback wallet%',
    '%Income wallet%',
    '%Income credited%',
  ],
  repurchase: [
    '%Repurchase wallet%',
    '%Repurchase credited%',
  ],
  working: [
    '%Working wallet%',
    '%Working income%',
  ],
}

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

    // All independent queries run in parallel. Wallet balances are read
    // directly from the users columns (the source of truth) rather than
    // re-derived from filtered transactions, which previously double-counted
    // membership-level income and could show a negative cashback wallet.
    const [goldPrice, metrics, isPayoutReleased, walletRes] = await Promise.all([
      cache.getOrSet({
        key: 'gold-price',
        ttl: '1h',
        grace: '2h',
        factory: async () => GoldService.getLiveGoldPrice(),
      }),
      DashboardMetricsService.getMetrics(uid),
      PayoutService.isPayoutReleased(),
      db.rawQuery(
        `SELECT income_wallet, repurchase_wallet, working_wallet FROM users WHERE id = ?`,
        [uid]
      ),
    ])

    return inertia.render('dashboard', {
      metrics,
      goldPrice,
      userId: uid,
      isPayoutReleased,
      incomeWallet: Math.max(0, Number(walletRes.rows[0]?.income_wallet ?? 0)),
      repurchaseWallet: Math.max(0, Number(walletRes.rows[0]?.repurchase_wallet ?? 0)),
      workingWallet: Math.max(0, Number(walletRes.rows[0]?.working_wallet ?? 0)),
    })
  }

  async walletHistory({ auth, inertia, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const wallet = (request.qs().wallet as string) || 'income'

    if (!['income', 'repurchase', 'working'].includes(wallet)) {
      return response.redirect().toRoute('dashboard.index')
    }

    const patterns = WALLET_REMARK_PATTERNS[wallet]
    const orConditions = patterns.map((p) => `remark LIKE '${p}'`).join(' OR ')

    // Fetch all wallet credit/debit transactions matching this wallet type.
    // `remark` is the only reliable way to distinguish wallet destinations
    // since the Transaction table has no explicit wallet_type column.
    const result = await db.rawQuery(
      `SELECT id, amount, type, remark, approved_at, created_at
       FROM transactions
       WHERE user_id = ?
         AND (type = 'wallet_credit' OR type = 'wallet_debit')
         AND (${orConditions})
       ORDER BY created_at DESC
       LIMIT 500`,
      [user.id]
    )

    const walletLabels: Record<string, string> = {
      income: 'Cashback Wallet',
      repurchase: 'Repurchase Wallet',
      working: 'Working Wallet',
    }

    return inertia.render('wallet-history', {
      wallet,
      walletLabel: walletLabels[wallet],
      transactions: result.rows,
    })
  }
}
