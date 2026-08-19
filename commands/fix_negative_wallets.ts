import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'

/**
 * Corrective command: clamp any negative wallet balance(s) back to zero.
 *
 * Wallet balances must never go below zero. A negative value means a debit
 * was written that exceeded the real balance (e.g. membership-level income
 * that was counted as a debit but not as a matching credit). This command
 * restores the stored balance to 0 and records an audit transaction so the
 * correction is visible in the ledger.
 *
 * Run: node ace fix-negative-wallets
 *      node ace fix-negative-wallets PJ779764
 */
export default class FixNegativeWallets extends BaseCommand {
  static commandName = 'fix-negative-wallets'
  static description = 'Clamp any negative wallet balance(s) back to zero'
  static options: CommandOptions = { startApp: true }

  @args.string({ required: false, description: 'Restrict the fix to a single username' })
  declare username: string

  async run() {
    const clampColumns = [
      { column: 'income_wallet', label: 'income' },
      { column: 'repurchase_wallet', label: 'repurchase' },
      { column: 'working_wallet', label: 'working' },
      { column: 'reward_wallet', label: 'reward' },
    ]

    const username = this.username?.trim() || undefined

    // Find affected users (optionally scoped to one username).
    const users = await db.rawQuery(
      `SELECT id, username, income_wallet, repurchase_wallet, working_wallet, reward_wallet
       FROM users
       WHERE role != 'admin'
         AND (income_wallet < 0 OR repurchase_wallet < 0 OR working_wallet < 0 OR reward_wallet < 0)
         ${username ? 'AND username = ?' : ''}`,
      username ? [username] : []
    )

    const affected = users.rows
    if (affected.length === 0) {
      this.logger.info('No negative wallet balances found.')
      return
    }

    this.logger.info(`Found ${affected.length} user(s) with negative wallet balance(s).`)

    let fixed = 0
    await db.transaction(async (trx) => {
      for (const row of affected) {
        for (const { column, label } of clampColumns) {
          const current = Number(row[column] ?? 0)
          if (current >= 0) continue

          const abs = Math.abs(current)
          await User.query({ client: trx })
            .where('id', row.id)
            .update({ [column]: 0 })

          await Transaction.create(
            {
              userId: row.id,
              type: TransactionTypeEnum.WALLET_CREDIT,
              amount: abs,
              remark: `REVERSAL: Corrected negative ${label} wallet (was −₹${abs.toFixed(2)})`,
              approvedAt: DateTime.now(),
            },
            { client: trx }
          )

          this.logger.info(
            `  User ${row.username} (id ${row.id}): ${label} wallet −₹${abs.toFixed(2)} → 0`
          )
          fixed++
        }
      }
    })

    this.logger.info(`Fixed ${fixed} negative wallet field(s).`)
  }
}