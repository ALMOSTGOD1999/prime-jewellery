import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
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

  /**
   * GET /dashboard/team?page=1
   * Paginated list of all team members (10 per page) with active/inactive status.
   */
  async team({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = Math.max(1, Number(request.qs().page) || 1)
    const limit = 10
    const offset = (page - 1) * limit

    const countRes = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM users WHERE parent_id = ?
         UNION ALL SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
       )
       SELECT COUNT(*)::int as total FROM descendants`,
      [user.id]
    )
    const total = countRes.rows[0]?.total || 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    const membersRes = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM users WHERE parent_id = ?
         UNION ALL SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
       )
       SELECT u.id, u.name, u.activated_at, u.created_at, u.status,
              (SELECT COALESCE(SUM(p.amount), 0) FROM purchases p WHERE p.user_id = u.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL) as total_business
       FROM users u
       INNER JOIN descendants d ON u.id = d.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
    )

    return inertia.render('dashboard/team', {
      members: membersRes.rows,
      page,
      totalPages,
      total,
    })
  }

  /**
   * GET /dashboard/directs
   * List of direct referrals for the current user.
   */
  async directs({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()

    const directsRes = await db.rawQuery(
      `SELECT u.id, u.name, u.activated_at, u.created_at, u.status, u.leg,
              (SELECT COALESCE(SUM(p.amount), 0) FROM purchases p WHERE p.user_id = u.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL) as total_business,
              (SELECT COUNT(*) FROM users c WHERE c.parent_id = u.id) as team_count
       FROM users u
       WHERE u.parent_id = ?
       ORDER BY u.created_at DESC`,
      [user.id]
    )

    return inertia.render('dashboard/directs', {
      directs: directsRes.rows,
      total: directsRes.rows.length,
    })
  }

  /**
   * GET /dashboard/self-business
   * Current user's own purchase history.
   */
  async selfBusiness({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()

    const purchasesRes = await db.rawQuery(
      `SELECT id, amount, buyer_name, quantity, gold_weight, gold_carat, gold_rate,
              gold_price, making_charges, gst_amount, hallmark_charges, additional_charges,
              approved_at, rejected_at, cancelled_at, stopped_at, remark, created_at
       FROM purchases
       WHERE user_id = ? AND approved_at IS NOT NULL AND cancelled_at IS NULL
       ORDER BY approved_at DESC`,
      [user.id]
    )

    const totalRes = await db.rawQuery(
      `SELECT COALESCE(SUM(amount), 0)::float as total
       FROM purchases WHERE user_id = ? AND approved_at IS NOT NULL AND cancelled_at IS NULL`,
      [user.id]
    )

    return inertia.render('dashboard/self-business', {
      purchases: purchasesRes.rows,
      total: Number(totalRes.rows[0]?.total || 0),
    })
  }

  /**
   * GET /dashboard/self-investment
   * Current user's investment return history.
   */
  async selfInvestment({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()

    const distributionsRes = await db.rawQuery(
      `SELECT ird.id, ird.period_month, ird.investment_amount, ird.return_amount,
              ird.income_amount, ird.gold_amount, ird.paid_out_at, ird.created_at,
              i.amount as investment_total, i.started_at, i.closed_at, i.status as investment_status
       FROM investment_return_distributions ird
       INNER JOIN investments i ON ird.investment_id = i.id
       WHERE ird.user_id = ?
       ORDER BY ird.period_month DESC`,
      [user.id]
    )

    const totalReturnRes = await db.rawQuery(
      `SELECT COALESCE(SUM(ird.return_amount), 0)::float as total_return,
              COALESCE(SUM(ird.income_amount), 0)::float as total_income,
              COALESCE(SUM(ird.gold_amount), 0)::float as total_gold
       FROM investment_return_distributions ird
       WHERE ird.user_id = ?`,
      [user.id]
    )

    const investmentsRes = await db.rawQuery(
      `SELECT i.id, i.amount, i.status, i.started_at, i.closed_at, i.monthly_return_rate,
              p.id as purchase_id
       FROM investments i
       LEFT JOIN purchases p ON i.purchase_id = p.id
       WHERE i.user_id = ?
       ORDER BY i.started_at DESC`,
      [user.id]
    )

    return inertia.render('dashboard/self-investment', {
      distributions: distributionsRes.rows,
      investments: investmentsRes.rows,
      summary: {
        totalReturn: Number(totalReturnRes.rows[0]?.total_return || 0),
        totalIncome: Number(totalReturnRes.rows[0]?.total_income || 0),
        totalGold: Number(totalReturnRes.rows[0]?.total_gold || 0),
      },
    })
  }

  /**
   * GET /dashboard/team-business?page=1
   * All purchases across the entire team (paginated).
   */
  async teamBusiness({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = Math.max(1, Number(request.qs().page) || 1)
    const limit = 20
    const offset = (page - 1) * limit

    const countRes = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM users WHERE parent_id = ?
         UNION ALL SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
       )
       SELECT COUNT(*)::int as total FROM purchases p
       INNER JOIN descendants d ON p.user_id = d.id
       WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL`,
      [user.id]
    )
    const total = countRes.rows[0]?.total || 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    const purchasesRes = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM users WHERE parent_id = ?
         UNION ALL SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
       )
       SELECT p.id, p.amount, p.buyer_name, p.approved_at, p.created_at,
              u.id as member_id, u.name as member_name
       FROM purchases p
       INNER JOIN descendants d ON p.user_id = d.id
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL
       ORDER BY p.approved_at DESC
       LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
    )

    return inertia.render('dashboard/team-business', {
      purchases: purchasesRes.rows,
      page,
      totalPages,
      total,
    })
  }

  /**
   * GET /dashboard/business-month?page=1
   * Team purchases for the current month only (paginated).
   */
  async businessMonth({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = Math.max(1, Number(request.qs().page) || 1)
    const limit = 20
    const offset = (page - 1) * limit
    const startOfMonth = DateTime.now().startOf('month').toSQLDate()

    const countRes = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM users WHERE parent_id = ?
         UNION ALL SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
       )
       SELECT COUNT(*)::int as total FROM purchases p
       INNER JOIN descendants d ON p.user_id = d.id
       WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL AND p.approved_at >= ?`,
      [user.id, startOfMonth]
    )
    const total = countRes.rows[0]?.total || 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    const purchasesRes = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM users WHERE parent_id = ?
         UNION ALL SELECT u.id FROM users u INNER JOIN descendants d ON u.parent_id = d.id
       )
       SELECT p.id, p.amount, p.buyer_name, p.approved_at, p.created_at,
              u.id as member_id, u.name as member_name
       FROM purchases p
       INNER JOIN descendants d ON p.user_id = d.id
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.approved_at IS NOT NULL AND p.cancelled_at IS NULL AND p.approved_at >= ?
       ORDER BY p.approved_at DESC
       LIMIT ? OFFSET ?`,
      [user.id, startOfMonth, limit, offset]
    )

    return inertia.render('dashboard/business-month', {
      purchases: purchasesRes.rows,
      page,
      totalPages,
      total,
      month: DateTime.now().toFormat('MMMM yyyy'),
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
