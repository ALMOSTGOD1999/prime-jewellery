import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FixWorkingWallet extends BaseCommand {
  static commandName = 'fix:working-wallet'
  static description = 'Find/fix users where working income went to wallet_balance instead of working_wallet'
  static options: CommandOptions = { startApp: true }

  async run() {
    // Find users who have working-income transactions but working_wallet = 0 while wallet_balance > 0
    const affected = await db.rawQuery(`
      SELECT
        u.id,
        u.name,
        u.wallet_balance,
        u.working_wallet,
        u.repurchase_wallet,
        t.amount as tx_amount,
        t.remark,
        t.created_at
      FROM users u
      INNER JOIN transactions t ON t.user_id = u.id
      WHERE t.remark ILIKE '%working wallet%'
        AND u.working_wallet = 0
        AND u.wallet_balance > 0
      ORDER BY u.id
    `)

    this.logger.info(`Found ${affected.rows.length} affected users`)
    for (const r of affected.rows) {
      this.logger.info(`PJ${String(r.id).padStart(6, '0')} ${r.name}: wallet_balance=₹${r.wallet_balance}, working_wallet=₹${r.working_wallet}, tx=₹${r.amount} — ${r.remark}`)
    }

    if (affected.rows.length === 0) {
      this.logger.info('No affected users found.')
      return
    }

    // Check if the user wants to fix PJ585222 specifically
    this.logger.info('')
    this.logger.info('Checking PJ585222 specifically...')
    const pj585222 = await db.rawQuery(`
      SELECT id, name, wallet_balance, working_wallet, repurchase_wallet
      FROM users WHERE id = 585222
    `)
    if (pj585222.rows.length > 0) {
      const u = pj585222.rows[0]
      this.logger.info(`PJ585222: wallet_balance=₹${u.wallet_balance}, working_wallet=₹${u.working_wallet}, repurchase_wallet=₹${u.repurchase_wallet}`)
    }
  }
}
