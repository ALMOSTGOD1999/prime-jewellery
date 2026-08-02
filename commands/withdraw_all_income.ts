import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'

/**
 * One-off: execute the "Withdraw All Income Wallet" action for the pending
 * (previous month) payout that is still sitting in cashback wallets.
 *
 * - Approves all pending investment_income withdrawal requests
 * - Zeroes every user's cashback (income) wallet
 * - Keeps a wallet_debit history row per user
 * - Leaves working wallets unchanged
 *
 * Run: node ace withdraw-all-income
 */
export default class WithdrawAllIncome extends BaseCommand {
  static commandName = 'withdraw-all-income'
  static description =
    'Clear every user cashback (income) wallet, record history, leave working wallets unchanged'
  static options: CommandOptions = { startApp: true }

  async run() {
    // ── Before ────────────────────────────────────────────────────────────
    const before = await db.rawQuery(
      `SELECT count(*)::int AS users, coalesce(sum(income_wallet),0)::float AS total
       FROM users WHERE role != 'admin' AND income_wallet > 0`
    )
    const beforeUsers = Number(before.rows[0].users)
    const beforeTotal = Number(before.rows[0].total)

    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  WITHDRAW ALL — INCOME WALLET`)
    this.logger.info(`  Users with cashback balance: ${beforeUsers}`)
    this.logger.info(`  Total cashback in wallets:   ₹${beforeTotal.toLocaleString('en-IN')}`)
    this.logger.info(`══════════════════════════════════════════════════`)

    if (beforeUsers === 0) {
      this.logger.info('Nothing to clear — all cashback wallets are already empty.')
      return
    }

    // ── Execute ──────────────────────────────────────────────────────────
    // 1. Approve any pending income wallet withdrawal requests (existing behavior)
    const approved = await db.rawQuery(
      `UPDATE withdrawls SET status = 'approved', approved_at = NOW()
       WHERE type = 'investment_income' AND status = 'pending'`
    )
    this.logger.info(`Pending withdrawal requests approved: ${Number(approved.rowCount || 0)}`)

    // 2. Clear every cashback (income) wallet, recording history per user
    let cleared = 0
    let totalCleared = 0

    await db.transaction(async (trx) => {
      const users = await User.query({ client: trx })
        .whereNot('role', 'admin')
        .where('income_wallet', '>', 0)
        .select('id', 'income_wallet')

      for (const user of users) {
        const amount = Number(user.incomeWallet)
        if (amount <= 0) continue

        await Transaction.create(
          {
            userId: user.id,
            type: TransactionTypeEnum.WALLET_DEBIT,
            amount,
            remark: `Income wallet (cashback) withdrawal — payout cleared by admin (command)`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )

        user.useTransaction(trx)
        user.incomeWallet = 0
        await user.save()

        cleared++
        totalCleared += amount
      }
    })

    // ── After ─────────────────────────────────────────────────────────────
    const after = await db.rawQuery(
      `SELECT count(*)::int AS users, coalesce(sum(income_wallet),0)::float AS total
       FROM users WHERE role != 'admin' AND income_wallet > 0`
    )
    const afterUsers = Number(after.rows[0].users)
    const afterTotal = Number(after.rows[0].total)

    this.logger.info('')
    this.logger.info(`Cleared ${cleared} cashback wallets, total ₹${totalCleared.toLocaleString('en-IN')}`)
    this.logger.info(`Remaining users with cashback balance: ${afterUsers} (₹${afterTotal.toLocaleString('en-IN')})`)
    this.logger.info(`History: ${cleared} wallet_debit transactions created.`)
    this.logger.info(`Working wallets: unchanged.`)
  }
}
