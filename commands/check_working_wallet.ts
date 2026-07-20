import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckWorkingWallet extends BaseCommand {
  static commandName = 'check:working-wallet'
  static description = 'Check if users working_wallet column matches their transaction history'
  static options: CommandOptions = { startApp: true }

  async run() {
    const targetUserId = await this.prompt.ask('Enter user ID to check (or leave blank for all):')

    // For a specific user or all users
    const userFilter = targetUserId.trim()
      ? `WHERE id = ${Number(targetUserId)}`
      : `WHERE role = 'user' AND activated_at IS NOT NULL`

    const users = await db.rawQuery(`
      SELECT id, name, wallet_balance, income_wallet, repurchase_wallet, working_wallet, status
      FROM users
      ${userFilter}
      ORDER BY id
    `)

    let mismatchCount = 0

    for (const u of users.rows) {
      const uid = u.id

      // Calculate working wallet from transactions (same query as dashboard)
      const txSumRes = await db.rawQuery(
        `SELECT coalesce(sum(
           CASE
             WHEN type = 'wallet_credit' THEN amount
             WHEN type = 'wallet_debit' THEN -amount
             ELSE 0
           END
         ), 0)::float as total
         FROM transactions WHERE user_id = ? AND remark ILIKE '%working income%' AND NOT (remark ILIKE '%repurchase%')`,
        [uid]
      )
      const txSum = Number(txSumRes.rows[0].total)
      const dbValue = Number(u.working_wallet || 0)
      const diff = Math.abs(txSum - dbValue)

      // Also get ALL working-income-related transactions for inspection
      const allWorkingTxns = await db.rawQuery(
        `SELECT amount, type, remark, created_at
         FROM transactions WHERE user_id = ? AND remark ILIKE '%working income%'
         ORDER BY created_at ASC`,
        [uid]
      )

      // Count txns that match dashboard query vs all working income txns
      const matchingTxns = allWorkingTxns.rows.filter((t: any) =>
        /working wallet|cashback wallet|income wallet/i.test(t.remark)
      )
      const nonMatchingTxns = allWorkingTxns.rows.filter(
        (t: any) => !/working wallet|cashback wallet|income wallet/i.test(t.remark)
      )

      if (diff > 0.01 || nonMatchingTxns.length > 0) {
        mismatchCount++
        this.logger.warning(`══════════════════════════════════════════════════`)
        this.logger.warning(`  MISMATCH: PJ${String(uid).padStart(6, '0')} ${u.name}`)
        this.logger.warning(`  DB working_wallet: ₹${dbValue.toFixed(2)}`)
        this.logger.warning(`  TX sum (dashboard):  ₹${txSum.toFixed(2)}`)
        this.logger.warning(`  DIFFERENCE: ₹${(dbValue - txSum).toFixed(2)}`)
        this.logger.warning(`  Status: ${u.status}`)
        this.logger.warning(`  Total working-income txns: ${allWorkingTxns.rows.length}`)
        this.logger.warning(`  Matching dashboard query: ${matchingTxns.length}`)
        this.logger.warning(`  NOT matching dashboard query: ${nonMatchingTxns.length}`)

        if (nonMatchingTxns.length > 0) {
          this.logger.warning(`  --- TXNS missed by dashboard query ---`)
          for (const t of nonMatchingTxns) {
            this.logger.warning(`    ₹${Number(t.amount).toFixed(2)} | ${t.type} | ${t.remark}`)
          }
        }
        this.logger.warning(`══════════════════════════════════════════════════`)
      } else {
        this.logger.info(
          `✅ PJ${String(uid).padStart(6, '0')} ${u.name}: DB=₹${dbValue.toFixed(2)} TX=₹${txSum.toFixed(2)} — OK`
        )
      }
    }

    this.logger.info('')
    this.logger.info(`Checked ${users.rows.length} users. ${mismatchCount} mismatches found.`)
  }
}
