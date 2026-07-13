import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckPrime2 extends BaseCommand {
  static commandName = 'check:prime2'
  static options: CommandOptions = { startApp: true }

  async run() {
    // Snapshot
    const snap = await db.rawQuery(
      `SELECT gross_amount, income_wallet_amount, repurchase_wallet_amount FROM monthly_income_snapshots WHERE user_id = 585222 AND month = '2026-06-01'`
    )
    if (snap.rows[0]) {
      const s = snap.rows[0]
      this.logger.info(`Snapshot: Gross ₹${Number(s.gross_amount)} | 70% ₹${Number(s.income_wallet_amount)} | 20% ₹${Number(s.repurchase_wallet_amount)}`)
    }

    // Transactions
    const txns = await db.rawQuery(
      `SELECT type, amount, remark FROM transactions WHERE user_id = 585222 AND (remark ILIKE '%working income%' OR remark ILIKE '%June 2026%' OR remark ILIKE '%performance incentive%') ORDER BY created_at DESC LIMIT 10`
    )
    this.logger.info('Transactions:')
    txns.rows.forEach((r: any) => this.logger.info(`  ${r.type}: ₹${r.amount} - ${r.remark}`))

    // Direct children count
    const children = await db.rawQuery(`SELECT count(*)::int as c FROM users WHERE parent_id = 585222`)
    this.logger.info(`Direct children: ${children.rows[0].c}`)

    // User status
    const u = await db.rawQuery(`SELECT wallet_balance, income_wallet, repurchase_wallet, status, activated_at FROM users WHERE id = 585222`)
    const ur = u.rows[0]
    this.logger.info(`Status: ${ur.status} | Activated: ${ur.activated_at}`)
    this.logger.info(`Wallet: ₹${Number(ur.wallet_balance)} | Income: ₹${Number(ur.income_wallet)} | Repurchase: ₹${Number(ur.repurchase_wallet)}`)
  }
}
