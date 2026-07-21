import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { cuid } from '@adonisjs/core/helpers'

export default class CreateMissingReversals extends BaseCommand {
  static commandName = 'create:missing-reversals'
  static description = 'Create missing audit reversal transactions for half-fixed June 2026 users'
  static options: CommandOptions = { startApp: true }

  @args.string({
    required: false,
    description: 'Set to "apply" to actually create transactions. Default is dry-run.',
  })
  declare mode: string

  async run() {
    const dryRun = (this.mode || '').trim().toLowerCase() !== 'apply'
    const june = DateTime.fromISO('2026-06-01').startOf('month')

    // These 3 users had salaries deleted but reversal transactions failed to create
    const halfFixedUsers = [
      { uid: 7791, oldRank: 'Silver', newRank: 'Bronze', excessSalary: 3000 },
      { uid: 416427, oldRank: 'Gold', newRank: 'NO RANK', excessSalary: 15999 },
      { uid: 560846, oldRank: 'Bronze', newRank: 'Starter', excessSalary: 1500 },
    ]

    this.logger.info(`══════════════════════════════════════════════════`)
    this.logger.info(`  CREATE MISSING REVERSAL TRANSACTIONS`)
    this.logger.info(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLYING'}`)
    this.logger.info(`══════════════════════════════════════════════════`)

    for (const u of halfFixedUsers) {
      const uid = u.uid
      const excessWorking = Math.round(u.excessSalary * 0.7 * 100) / 100
      const excessRepurchase = Math.round(u.excessSalary * 0.2 * 100) / 100

      // Check if reversal transactions already exist
      const existingRes = await db.rawQuery(
        `SELECT count(*)::int as total FROM transactions
         WHERE user_id = ? AND remark ILIKE '%REVERSAL%' AND remark ILIKE '%June 2026%'`,
        [uid]
      )
      const alreadyExists = existingRes.rows[0].total > 0

      if (alreadyExists) {
        this.logger.info(
          `PJ${String(uid).padStart(6, '0')}: Reversal transactions already exist. Skipping.`
        )
        continue
      }

      this.logger.info(`PJ${String(uid).padStart(6, '0')}:`)
      this.logger.info(`  Excess salary:     ₹${u.excessSalary.toLocaleString('en-IN')}`)
      this.logger.info(`  Working reversal:  ₹${excessWorking.toLocaleString('en-IN')}`)
      this.logger.info(`  Repurchase rev:    ₹${excessRepurchase.toLocaleString('en-IN')}`)

      if (!dryRun) {
        await db.rawQuery(
          `INSERT INTO transactions (id, user_id, amount, type, remark, created_at, updated_at, approved_at)
           VALUES (?, ?, ?, 'wallet_debit', ?, NOW(), NOW(), NOW())`,
          [
            cuid(),
            uid,
            excessWorking,
            `REVERSAL: Excess working wallet from June 2026 payout (old rank: ${u.oldRank}, correct: ${u.newRank})`,
          ]
        )
        await db.rawQuery(
          `INSERT INTO transactions (id, user_id, amount, type, remark, created_at, updated_at, approved_at)
           VALUES (?, ?, ?, 'wallet_debit', ?, NOW(), NOW(), NOW())`,
          [
            cuid(),
            uid,
            excessRepurchase,
            `REVERSAL: Excess repurchase wallet from June 2026 payout (old rank: ${u.oldRank}, correct: ${u.newRank})`,
          ]
        )
        this.logger.info(`  → Created missing reversal transactions.`)
      }
    }

    this.logger.info('')
    this.logger.info(
      dryRun ? 'DRY RUN — no transactions created.' : 'Done! Missing reversal transactions created.'
    )
    this.logger.info('')
    this.logger.info(
      'IMPORTANT: Do NOT run "reconcile:working-wallet" before this command completes!'
    )
    this.logger.info(
      'Reconcile would re-inflate the wallets since there were no debit transactions yet.'
    )
  }
}
