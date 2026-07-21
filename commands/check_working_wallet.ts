import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckWorkingWallet extends BaseCommand {
  static commandName = 'check:working-wallet'
  static description = 'Check if a users working_wallet column matches their transaction history'
  static options: CommandOptions = { startApp: true }

  @args.string({
    required: false,
    description: 'User ID (e.g. 416427 or PJ416427). Leave blank to check all.',
  })
  declare userId: string

  async run() {
    const rawInput = (this.userId || '').trim().toUpperCase()
    const userId = rawInput.replace(/^PJ/i, '')

    const userFilter = userId
      ? `WHERE id = ${Number(userId)}`
      : `WHERE role = 'user' AND activated_at IS NOT NULL`

    const users = await db.rawQuery(`
      SELECT id, name, wallet_balance, income_wallet, repurchase_wallet, working_wallet, status
      FROM users
      ${userFilter}
      ORDER BY id
    `)

    if (users.rows.length === 0) {
      this.logger.error('No users found.')
      return
    }

    let mismatchCount = 0

    for (const u of users.rows) {
      const uid = u.id

      // Calculate working wallet from transactions
      const txSumRes = await db.rawQuery(
        `SELECT coalesce(sum(
           CASE
             WHEN type = 'wallet_credit' THEN amount
             WHEN type = 'wallet_debit' THEN -amount
             ELSE 0
           END
         ), 0)::float as total
         FROM transactions WHERE user_id = ? AND (
           (remark ILIKE '%working income%' AND NOT (remark ILIKE '%repurchase%'))
           OR remark ILIKE '%Excess working wallet%'
         )`,
        [uid]
      )
      const txSum = Number(txSumRes.rows[0].total)
      const dbValue = Number(u.working_wallet || 0)
      const diff = txSum - dbValue

      if (Math.abs(diff) > 0.01) {
        mismatchCount++
        this.logger.warning(`MISMATCH: PJ${String(uid).padStart(6, '0')} ${u.name}`)
        this.logger.warning(`  DB working_wallet: ₹${dbValue.toFixed(2)}`)
        this.logger.warning(`  TX sum:            ₹${txSum.toFixed(2)}`)
        this.logger.warning(`  DIFFERENCE:        ₹${diff.toFixed(2)}`)
        this.logger.warning(`  Status:            ${u.status}`)
      } else {
        this.logger.info(`OK: PJ${String(uid).padStart(6, '0')} ${u.name} = ₹${dbValue.toFixed(2)}`)
      }
    }

    this.logger.info('')
    this.logger.info(`Checked ${users.rows.length} users. ${mismatchCount} mismatches.`)
  }
}
