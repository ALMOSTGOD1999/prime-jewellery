import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckWorkingWallet extends BaseCommand {
  static commandName = 'check:working-wallet'
  static description = 'Check if a users working_wallet column matches snapshot expected value'
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
      const dbValue = Number(u.working_wallet || 0)

      // Source of truth: sum of snapshot income_wallet_amount for paid months
      const snapRes = await db.rawQuery(
        `SELECT coalesce(sum(income_wallet_amount), 0)::float as total FROM monthly_income_snapshots WHERE user_id = ? AND paid_out_at IS NOT NULL`,
        [uid]
      )
      const snapshotTotal = Number(snapRes.rows[0].total)
      const diff = dbValue - snapshotTotal

      if (Math.abs(diff) > 0.99) {
        mismatchCount++
        this.logger.warning(`MISMATCH: PJ${String(uid).padStart(6, '0')} ${u.name}`)
        this.logger.warning(`  DB working_wallet: ₹${dbValue.toFixed(2)}`)
        this.logger.warning(`  Snapshot expected: ₹${snapshotTotal.toFixed(2)}`)
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
