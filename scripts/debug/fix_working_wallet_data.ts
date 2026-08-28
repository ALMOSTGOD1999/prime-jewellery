import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FixWorkingWalletData extends BaseCommand {
  static commandName = 'fix:working-wallet-data'
  static description =
    'Move working-income amounts from wallet_balance to working_wallet for affected users'
  static options: CommandOptions = { startApp: true }

  async run() {
    // 1. Find all users who have "Working wallet" transactions but working_wallet = 0
    const affected = await db.rawQuery(`
      SELECT
        u.id,
        u.name,
        u.wallet_balance,
        u.working_wallet,
        SUM(t.amount) as working_income_total
      FROM users u
      INNER JOIN transactions t ON t.user_id = u.id
        AND t.remark ILIKE '%working wallet%'
        AND t.type = 'wallet_credit'
      WHERE u.working_wallet = 0
        AND u.wallet_balance > 0
      GROUP BY u.id, u.name, u.wallet_balance, u.working_wallet
      ORDER BY u.id
    `)

    this.logger.info(
      `Found ${affected.rows.length} affected users with working income stuck in wallet_balance`
    )
    let safeToFix = 0
    let needsReview = 0
    let totalMoved = 0

    for (const r of affected.rows) {
      const id = r.id
      const name = r.name
      const walletBalance = Number(r.wallet_balance)
      const workingIncome = Number(r.working_income_total)

      if (walletBalance >= workingIncome) {
        safeToFix++
        totalMoved += workingIncome
        this.logger.info(
          `[SAFE] PJ${String(id).padStart(6, '0')} ${name}: move ₹${workingIncome.toFixed(2)} from wallet_balance to working_wallet`
        )
      } else {
        needsReview++
        this.logger.warning(
          `[REVIEW] PJ${String(id).padStart(6, '0')} ${name}: wallet_balance ₹${walletBalance.toFixed(2)} < working income ₹${workingIncome.toFixed(2)} — may have spent part of it`
        )
      }
    }

    this.logger.info('')
    this.logger.info(
      `Summary: ${safeToFix} safe to fix, ${needsReview} need manual review. Total to move: ₹${totalMoved.toFixed(2)}`
    )

    if (safeToFix === 0) {
      return
    }

    this.logger.info(`Auto-applying fix for ${safeToFix} users...`)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    let fixed = 0
    for (const r of affected.rows) {
      const id = r.id
      const walletBalance = Number(r.wallet_balance)
      const workingIncome = Number(r.working_income_total)

      if (walletBalance >= workingIncome) {
        await db.rawQuery(
          `UPDATE users SET wallet_balance = wallet_balance - ?, working_wallet = working_wallet + ? WHERE id = ?`,
          [workingIncome, workingIncome, id]
        )
        fixed++
        this.logger.success(
          `Fixed PJ${String(id).padStart(6, '0')}: moved ₹${workingIncome.toFixed(2)}`
        )
      }
    }

    this.logger.info(`Done! Fixed ${fixed} users.`)
  }
}
