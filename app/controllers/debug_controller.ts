import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import User from '#models/user'
import Transaction from '#models/transaction'

export default class DebugController {
  async payout({ response, request }: HttpContext) {
    const period = DateTime.now().minus({ months: 1 }).startOf('month')
    const periodEnd = period.endOf('month')
    const page = Math.max(1, Number(request.qs().page || 1))
    const limit = 100
    const offset = (page - 1) * limit

    const [
      purchaseStats,
      snapshotStats,
      snapshotPaid,
      distStats,
      invStats,
      sampleUser,
      allTxns,
      reversalTxns,
      txnCount,
    ] = await Promise.all([
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(amount),0)::float as total FROM purchases WHERE approved_at IS NOT NULL AND cancelled_at IS NULL AND approved_at >= ? AND approved_at <= ?`,
        [period.toSQL()!, periodEnd.toSQL()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as count, coalesce(sum(gross_amount),0)::float as total FROM monthly_income_snapshots WHERE month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as total, count(*) FILTER (WHERE paid_out_at IS NOT NULL)::int as paid, count(*) FILTER (WHERE paid_out_at IS NULL)::int as unpaid FROM monthly_income_snapshots WHERE month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as count FROM investment_return_distributions WHERE period_month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(`SELECT count(*)::int as count FROM investments WHERE status = 'active'`),
      db.rawQuery(
        `SELECT id, name, wallet_balance, income_wallet FROM users WHERE role = 'user' AND activated_at IS NOT NULL ORDER BY id LIMIT 5`
      ),
      // ALL June payout transactions (paginated)
      db.rawQuery(
        `SELECT t.id, t.user_id, u.name as user_name, t.amount, t.type, t.remark, t.created_at
         FROM transactions t LEFT JOIN users u ON t.user_id = u.id
         WHERE t.remark ILIKE '%working income for June 2026%'
         ORDER BY t.created_at ASC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      // Reversal transactions for June
      db.rawQuery(
        `SELECT t.id, t.user_id, u.name as user_name, t.amount, t.remark, t.created_at
         FROM transactions t LEFT JOIN users u ON t.user_id = u.id
         WHERE t.remark ILIKE '%REVERSAL%June 2026%'
         ORDER BY t.created_at ASC`
      ),
      // Total count
      db.rawQuery(
        `SELECT count(*)::int as total FROM transactions WHERE remark ILIKE '%working income for June 2026%'`
      ),
    ])

    const totalTxns = txnCount.rows[0].total
    const totalPages = Math.ceil(totalTxns / limit)

    // Count unique users who received payout (only non-reversal)
    const paidUserIds = new Set()
    allTxns.rows.forEach((t: any) => {
      if (!t.remark?.includes('REVERSAL')) paidUserIds.add(t.user_id)
    })

    return response.json({
      period: period.toISODate(),
      summary: {
        purchases: purchaseStats.rows[0],
        snapshots: snapshotStats.rows[0],
        snapshotPaid: snapshotPaid.rows[0],
        distributions: distStats.rows[0],
        investments: invStats.rows[0],
        uniquePaidUsers: paidUserIds.size,
      },
      transactions: {
        page,
        totalPages,
        total: totalTxns,
        perPage: limit,
        data: allTxns.rows,
      },
      reversals: {
        count: reversalTxns.rows.length,
        data: reversalTxns.rows,
      },
      sampleUsers: sampleUser.rows,
    })
  }

  async cleanupPayout({ response }: HttpContext) {
    const remark = '%monthly working income for June 2026%'
    const allTxns = await Transaction.query()
      .where('remark', 'ILIKE', remark)
      .orderBy('created_at', 'asc')

    const seen = new Map<string, string>()
    const toReverse: typeof allTxns = []

    for (const txn of allTxns) {
      const isIncome = txn.remark?.toLowerCase().includes('income wallet (70%)')
      const walletType = isIncome ? 'income' : 'repurchase'
      const key = `${txn.userId}-${walletType}`
      if (seen.has(key)) {
        toReverse.push(txn)
      } else {
        seen.set(key, txn.id)
      }
    }

    let reversed = 0
    let totalReversed = 0

    for (const txn of toReverse) {
      const user = await User.find(txn.userId)
      if (!user) continue
      const isIncome = txn.remark?.toLowerCase().includes('income wallet (70%)')
      const amount = Number(txn.amount)

      await db.transaction(async (trx) => {
        if (isIncome) {
          user.incomeWallet = Number(user.incomeWallet ?? 0) - amount
        } else {
          user.walletBalance = Number(user.walletBalance ?? 0) - amount
        }
        await user.useTransaction(trx).save()
        await Transaction.create(
          {
            userId: txn.userId,
            amount,
            type: 'wallet_debit' as any,
            remark: `REVERSAL: Duplicate ${isIncome ? 'income' : 'repurchase'} June 2026 (orig: ${txn.id})`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )
      })

      reversed++
      totalReversed += amount
    }

    return response.json({
      message: `Reversed ${reversed} duplicate transactions, total ₹${totalReversed.toLocaleString('en-IN')}.`,
      duplicatesFound: toReverse.length,
      duplicates: toReverse.map((t) => ({
        id: t.id,
        userId: t.userId,
        amount: t.amount,
        remark: t.remark,
      })),
    })
  }
}
