import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class ExplainWorkingWallet extends BaseCommand {
  static commandName = 'explain:working-wallet'
  static description = 'Show transaction breakdown for a users working wallet'
  static options: CommandOptions = { startApp: true }

  @args.string({
    required: false,
    description: 'User ID (e.g. 416427 or PJ416427)',
  })
  declare userId: string

  async run() {
    const rawInput = (this.userId || '').trim().toUpperCase()
    const userId = rawInput.replace(/^PJ/i, '')

    if (!userId) {
      this.logger.error('Please provide a user ID. Example: node ace explain:working-wallet 416427')
      return
    }

    const uid = Number(userId)

    // Get user info
    const userRes = await db.rawQuery(`SELECT id, name, working_wallet FROM users WHERE id = ?`, [
      uid,
    ])
    if (userRes.rows.length === 0) {
      this.logger.error(`User PJ${String(uid).padStart(6, '0')} not found`)
      return
    }
    const user = userRes.rows[0]
    const dbValue = Number(user.working_wallet || 0)

    // Get snapshot total — this is the source of truth for what was supposed to be paid
    const snapRes = await db.rawQuery(
      `SELECT coalesce(sum(income_wallet_amount), 0)::float as total FROM monthly_income_snapshots WHERE user_id = ? AND paid_out_at IS NOT NULL`,
      [uid]
    )
    const snapshotTotal = Number(snapRes.rows[0].total)

    // Get all working income transactions
    const txns = await db.rawQuery(
      `SELECT id, amount, type, remark, created_at
       FROM transactions
       WHERE user_id = ? AND (
         (remark ILIKE '%working income%' AND NOT (remark ILIKE '%repurchase%'))
         OR remark ILIKE '%Excess working wallet%'
       )
       ORDER BY created_at ASC`,
      [uid]
    )

    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  WORKING WALLET BREAKDOWN`)
    this.logger.info(`  User: PJ${String(uid).padStart(6, '0')} ${user.name}`)
    this.logger.info(`  DB Column: ₹${dbValue.toFixed(2)}`)
    this.logger.info(`  Snapshot Expected: ₹${snapshotTotal.toFixed(2)}`)
    this.logger.info(`══════════════════════════════════════════════════`)

    if (txns.rows.length === 0) {
      this.logger.info('No working income transactions found.')
    } else {
      const credits: { amount: number; remark: string; date: string }[] = []
      const debits: { amount: number; remark: string; date: string }[] = []

      for (const t of txns.rows) {
        const amount = Number(t.amount)
        const date = new Date(t.created_at).toLocaleDateString('en-IN')
        const remark = t.remark || ''

        if (t.type === 'wallet_credit') {
          credits.push({ amount, remark, date })
        } else if (t.type === 'wallet_debit') {
          debits.push({ amount, remark, date })
        }
      }

      // Print credits
      this.logger.info('')
      this.logger.info(`--- CREDITS (+) ---`)
      let creditSum = 0
      for (const c of credits) {
        creditSum += c.amount
        this.logger.info(
          `  + ₹${c.amount.toFixed(2)}  |  ${c.date}  |  ${c.remark.substring(0, 70)}`
        )
      }
      this.logger.info(`  Total Credits: +₹${creditSum.toFixed(2)}`)

      // Print debits
      let debitSum = 0
      if (debits.length > 0) {
        this.logger.info('')
        this.logger.info(`--- DEBITS (-) ---`)
        for (const d of debits) {
          debitSum += d.amount
          this.logger.info(
            `  - ₹${d.amount.toFixed(2)}  |  ${d.date}  |  ${d.remark.substring(0, 70)}`
          )
        }
        this.logger.info(`  Total Debits: -₹${debitSum.toFixed(2)}`)
      }

      // Transaction math
      const netFromTxns = creditSum - debitSum
      this.logger.info('')
      this.logger.info(`  Transaction Net: ₹${netFromTxns.toFixed(2)}`)
      if (Math.abs(netFromTxns - dbValue) > 0.01) {
        const missing = dbValue - netFromTxns
        this.logger.info(
          `  Transaction Gap: ₹${missing.toFixed(2)} (not all adjustments have audit records)`
        )
      }
    }

    // Final comparison against snapshot
    this.logger.info('')
    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  SUMMARY:`)
    this.logger.info(`    DB Column:        ₹${dbValue.toFixed(2)}`)
    this.logger.info(`    Snapshot Expected: ₹${snapshotTotal.toFixed(2)}`)
    this.logger.info(`══════════════════════════════════════════════════`)

    if (Math.abs(dbValue - snapshotTotal) > 0.99) {
      this.logger.warning('MISMATCH: DB column does not match snapshot expected value!')
    } else {
      this.logger.info('✅ DB column matches snapshot expected value.')
    }
  }
}
