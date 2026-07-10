import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import User from '#models/user'
import Transaction from '#models/transaction'

export default class DebugController {
  async payout({ response }: HttpContext) {
    const period = DateTime.now().minus({ months: 1 }).startOf('month')
    const periodEnd = period.endOf('month')

    const [
      purchaseStats,
      snapshotStats,
      snapshotPaid,
      distStats,
      invStats,
      recentTxns,
      sampleUser,
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
        `SELECT count(*)::int as total, count(*) FILTER (WHERE paid_out_at IS NOT NULL)::int as paid, count(*) FILTER (WHERE paid_out_at IS NULL)::int as unpaid, coalesce(sum(gross_amount) FILTER (WHERE paid_out_at IS NULL),0)::float as unpaid_amount FROM monthly_income_snapshots WHERE month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(
        `SELECT count(*)::int as count FROM investment_return_distributions WHERE period_month = ?`,
        [period.toISODate()!]
      ),
      db.rawQuery(`SELECT count(*)::int as count FROM investments WHERE status = 'active'`),
      db.rawQuery(
        `SELECT id, user_id, amount, type, remark, created_at FROM transactions ORDER BY created_at DESC LIMIT 20`
      ),
      db.rawQuery(
        `SELECT id, name, wallet_balance, income_wallet FROM users WHERE role = 'user' AND activated_at IS NOT NULL ORDER BY id LIMIT 5`
      ),
    ])

    return response.json({
      period: period.toISODate(),
      purchases: purchaseStats.rows[0],
      snapshots: snapshotStats.rows[0],
      snapshotPaidStatus: snapshotPaid.rows[0],
      distributions: distStats.rows[0],
      investments: invStats.rows[0],
      sampleUsers: sampleUser.rows,
      recentTransactions: recentTxns.rows,
    })
  }

  /**
   * Find and reverse duplicate June 2026 payout transactions.
   * Keeps only the FIRST credit per user per wallet type.
   */
  async cleanupPayout({ response }: HttpContext) {
    const remark = '%monthly working income for June 2026%'

    // Find all June 2026 payout transactions
    const allTxns = await Transaction.query()
      .where('remark', 'ILIKE', remark)
      .orderBy('created_at', 'asc')

    // Group by user_id + wallet type (income vs repurchase)
    const seen = new Map<string, string>() // key: "userId-type", value: txnId
    const toReverse: typeof allTxns = []

    for (const txn of allTxns) {
      const isIncome = txn.remark?.toLowerCase().includes('income wallet (70%)')
      const walletType = isIncome ? 'income' : 'repurchase'
      const key = `${txn.userId}-${walletType}`

      if (seen.has(key)) {
        // This is a duplicate — mark for reversal
        toReverse.push(txn)
      } else {
        seen.set(key, txn.id)
      }
    }

    // Reverse each duplicate: debit the wallet and create reversal transaction
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
            remark: `REVERSAL: Duplicate ${isIncome ? 'income' : 'repurchase'} wallet credit for June 2026 (original txn: ${txn.id})`,
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
