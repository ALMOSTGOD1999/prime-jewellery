import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class ReconcileWorkingWallet extends BaseCommand {
  static commandName = 'reconcile:working-wallet'
  static description = 'Rebuild users.working_wallet from transaction history'
  static options: CommandOptions = { startApp: true }

  @args.string({
    required: false,
    description: 'Set to "apply" to actually fix values. Default is dry-run.',
  })
  declare mode: string

  async run() {
    const dryRun = (this.mode || '').trim().toLowerCase() !== 'apply'

    const users = await db.rawQuery(`
      SELECT id, name, working_wallet
      FROM users
      WHERE role = 'user' AND activated_at IS NOT NULL
      ORDER BY id
    `)

    let fixed = 0
    let alreadyCorrect = 0
    let totalMoved = 0

    for (const u of users.rows) {
      const uid = u.id

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
        fixed++
        totalMoved += Math.abs(diff)
        this.logger.warning(
          `PJ${String(uid).padStart(6, '0')} ${u.name}: DB=₹${dbValue.toFixed(2)} TX=₹${txSum.toFixed(2)} Δ=₹${diff.toFixed(2)}`
        )

        if (!dryRun) {
          await db.rawQuery(`UPDATE users SET working_wallet = ? WHERE id = ?`, [txSum, uid])
          this.logger.info(`  → Fixed`)
        }
      } else {
        alreadyCorrect++
      }
    }

    this.logger.info('')
    this.logger.info(`Total: ${users.rows.length} | OK: ${alreadyCorrect} | Mismatch: ${fixed}`)
    this.logger.info(`Total amount moved: ₹${totalMoved.toFixed(2)}`)
    this.logger.info(
      dryRun ? 'DRY RUN — no changes applied. Run with "apply" to fix.' : 'FIXES APPLIED.'
    )
  }
}
