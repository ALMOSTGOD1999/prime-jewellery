import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'

/**
 * One-off: reverse the duplicate June 2026 income that the original (buggy)
 * payout run credited into users' MAIN wallet (wallet_balance) instead of the
 * income wallet. The corrected July-11 run credited the same income again into
 * income_wallet, so every June recipient currently holds the June income twice.
 *
 * - Finds every user whose wallet_balance still holds their June income credit
 * - Debites that amount from wallet_balance
 * - Keeps a REVERSAL wallet_debit history row per user
 *
 * Run: node ace reverse-june-income-duplicate
 */
export default class ReverseJuneIncomeDuplicate extends BaseCommand {
  static commandName = 'reverse-june-income-duplicate'
  static description =
    'Reverse duplicate June 2026 income still sitting in users main wallets (REVERSAL history)'
  static options: CommandOptions = { startApp: true }

  async run() {
    const targets = await db.rawQuery(
      `SELECT u.id, u.name, u.wallet_balance, d.june_income
       FROM users u
       JOIN (
         SELECT user_id, coalesce(sum(income_amount),0)::float AS june_income
         FROM investment_return_distributions
         WHERE to_char(period_month, 'YYYY-MM') = '2026-06'
         GROUP BY user_id
       ) d ON d.user_id = u.id
       WHERE u.role != 'admin'
         AND u.wallet_balance > 0
       ORDER BY u.id`
    )

    const rows = targets.rows as {
      id: number
      name: string
      wallet_balance: string | number
      june_income: string | number
    }[]

    const beforeTotal = rows.reduce((s, r) => s + Number(r.wallet_balance), 0)

    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  REVERSE DUPLICATE JUNE 2026 INCOME`)
    this.logger.info(`  Affected users: ${rows.length}`)
    this.logger.info(`  Main-wallet balance before: ₹${beforeTotal.toLocaleString('en-IN')}`)
    this.logger.info(`══════════════════════════════════════════════════`)

    if (rows.length === 0) {
      this.logger.info('Nothing to reverse — no duplicate balances found.')
      return
    }

    let reversed = 0
    let totalReversed = 0

    await db.transaction(async (trx) => {
      for (const r of rows) {
        // Never debit more than the user currently holds
        const amount = Math.min(Number(r.wallet_balance), Number(r.june_income))
        if (amount <= 0) continue

        const current = await trx.from('users').where('id', r.id).select('wallet_balance').first()
        if (!current || Number(current.wallet_balance) < amount) continue

        await Transaction.create(
          {
            userId: r.id,
            type: TransactionTypeEnum.WALLET_DEBIT,
            amount,
            remark: `REVERSAL: Duplicate June 2026 income credited to main wallet (original payout run)`,
            approvedAt: DateTime.now(),
          },
          { client: trx }
        )

        await trx.rawQuery(
          'UPDATE users SET wallet_balance = GREATEST(wallet_balance - ?, 0) WHERE id = ?',
          [amount, r.id]
        )

        reversed++
        totalReversed += amount
      }
    })

    const after = await db.rawQuery(
      `SELECT count(*)::int AS users, coalesce(sum(wallet_balance),0)::float AS total
       FROM users u
       JOIN (
         SELECT user_id FROM investment_return_distributions
         WHERE to_char(period_month, 'YYYY-MM') = '2026-06' GROUP BY user_id
       ) d ON d.user_id = u.id
       WHERE u.role != 'admin' AND u.wallet_balance > 0`
    )

    this.logger.info('')
    this.logger.info(`Reversed ${reversed} users, total ₹${totalReversed.toLocaleString('en-IN')}`)
    this.logger.info(
      `June-recipient users still holding main-wallet balance: ${Number(after.rows[0].users)} (₹${Number(after.rows[0].total).toLocaleString('en-IN')})`
    )
    this.logger.info(`History: ${reversed} REVERSAL transactions created.`)
    this.logger.info(`Income wallet / working wallet / repurchase wallet: unchanged.`)
  }
}
