import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class ReconcileWorkingWallet extends BaseCommand {
  static commandName = 'reconcile:working-wallet'
  static description = 'Align users.working_wallet with snapshot expected values'
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
      const dbValue = Number(u.working_wallet || 0)

      // Source of truth: snapshot income_wallet_amount for paid months
      const snapRes = await db.rawQuery(
        `SELECT coalesce(sum(income_wallet_amount), 0)::float as total FROM monthly_income_snapshots WHERE user_id = ? AND paid_out_at IS NOT NULL`,
        [uid]
      )
      const snapshotTotal = Number(snapRes.rows[0].total)
      const diff = snapshotTotal - dbValue

      if (Math.abs(diff) > 0.99) {
        fixed++
        totalMoved += Math.abs(diff)
        this.logger.warning(
          `PJ${String(uid).padStart(6, '0')} ${u.name}: DB=₹${dbValue.toFixed(2)} Snapshot=₹${snapshotTotal.toFixed(2)} Δ=₹${diff.toFixed(2)}`
        )

        if (!dryRun) {
          await db.rawQuery(`UPDATE users SET working_wallet = ? WHERE id = ?`, [
            snapshotTotal,
            uid,
          ])
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
