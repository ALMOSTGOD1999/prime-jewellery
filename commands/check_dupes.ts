import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckDupes extends BaseCommand {
  static commandName = 'check:dupes'
  static options: CommandOptions = { startApp: true }

  async run() {
    // Check Prime (585222) transactions
    const txns = await db.rawQuery(
      `SELECT type, amount, remark, created_at FROM transactions
       WHERE user_id = 585222 AND (remark ILIKE '%June 2026%' OR remark ILIKE '%working income%')
       ORDER BY created_at DESC LIMIT 20`
    )
    this.logger.info('Prime. (585222) transactions:')
    txns.rows.forEach((r: any) => this.logger.info(`  ${r.type}: ₹${r.amount} | ${r.remark} | ${r.created_at}`))

    // Check wallet
    const u = await db.rawQuery(`SELECT wallet_balance, income_wallet, repurchase_wallet FROM users WHERE id = 585222`)
    const ur = u.rows[0]
    this.logger.info(`\nWallet: ₹${Number(ur.wallet_balance)} | Income: ₹${Number(ur.income_wallet)} | Repurchase: ₹${Number(ur.repurchase_wallet)}`)

    // Check snapshot
    const snap = await db.rawQuery(`SELECT * FROM monthly_income_snapshots WHERE user_id = 585222 AND month = '2026-06-01'`)
    this.logger.info(`Snapshots for June: ${snap.rows.length}`)
    snap.rows.forEach((s: any) => this.logger.info(`  Gross ₹${s.gross_amount} | Paid: ${s.paid_out_at}`))

    // Check for duplicate snapshots/transactions across all users
    const dupSnaps = await db.rawQuery(
      `SELECT user_id, count(*)::int as c FROM monthly_income_snapshots WHERE month = '2026-06-01' GROUP BY user_id HAVING count(*) > 1`
    )
    this.logger.info(`\nUsers with duplicate snapshots: ${dupSnaps.rows.length}`)
    dupSnaps.rows.forEach((r: any) => this.logger.info(`  User ${r.user_id}: ${r.c} snapshots`))

    // Check payout config
    const cfg = await db.rawQuery(`SELECT value FROM platform_configs WHERE key = 'working_wallet_payout_month'`)
    this.logger.info(`\nPayout config: ${cfg.rows[0]?.value || 'empty'}`)
  }
}
