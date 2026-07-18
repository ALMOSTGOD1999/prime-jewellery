import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckWallet extends BaseCommand {
  static commandName = 'check:wallet'
  static description = 'Check wallet details for a user'
  static options: CommandOptions = { startApp: true }

  async run() {
    const userId = 585222

    // User basic info
    const user = await db.rawQuery(
      `SELECT id, name, wallet_balance, income_wallet, reward_wallet, repurchase_wallet, working_wallet, total_invested, role, activated_at, status FROM users WHERE id = ?`,
      [userId]
    )
    if (user.rows.length === 0) {
      this.logger.error(`User ${userId} not found`)
      return
    }
    const u = user.rows[0]
    this.logger.info(`User: PJ${String(u.id).padStart(6, '0')} — ${u.name}`)
    this.logger.info(`Wallet Balance: ₹${u.wallet_balance}`)
    this.logger.info(`Income Wallet: ₹${u.income_wallet}`)
    this.logger.info(`Reward Wallet: ₹${u.reward_wallet}`)
    this.logger.info(`Repurchase Wallet: ₹${u.repurchase_wallet}`)
    this.logger.info(`Working Wallet: ₹${u.working_wallet}`)
    this.logger.info(`Total Invested: ₹${u.total_invested}`)
    this.logger.info(`Role: ${u.role}, Status: ${u.status}, Activated: ${u.activated_at}`)
    this.logger.info('')

    // All transactions
    this.logger.info('=== Transactions ===')
    const transactions = await db.rawQuery(
      `SELECT type, amount, remark, approved_at, created_at FROM transactions WHERE user_id = ? ORDER BY created_at ASC`,
      [userId]
    )
    let txTotal = 0
    for (const t of transactions.rows) {
      this.logger.info(
        `${t.type} — ₹${t.amount} — ${t.remark || ''} — ${t.approved_at || t.created_at}`
      )
      if (t.type === 'wallet_credit') txTotal += Number(t.amount)
      if (t.type === 'wallet_debit') txTotal -= Number(t.amount)
    }
    this.logger.info(
      `Transaction net: ₹${txTotal.toFixed(2)} (${transactions.rows.length} records)`
    )
    this.logger.info('')

    // Purchases
    this.logger.info('=== Purchases ===')
    const purchases = await db.rawQuery(
      `SELECT amount, approved_at, created_at, cancelled_at FROM purchases WHERE user_id = ? ORDER BY approved_at ASC`,
      [userId]
    )
    for (const p of purchases.rows) {
      this.logger.info(
        `Purchase ₹${p.amount} — approved: ${p.approved_at} — cancelled: ${p.cancelled_at || 'no'}`
      )
    }
    this.logger.info('')

    // Withdrawals
    this.logger.info('=== Withdrawals ===')
    const withdrawals = await db.rawQuery(
      `SELECT amount, status, type, created_at FROM withdrawls WHERE user_id = ? ORDER BY created_at ASC`,
      [userId]
    )
    let withdrawnTotal = 0
    for (const w of withdrawals.rows) {
      this.logger.info(`${w.type} — ₹${w.amount} — ${w.status} — ${w.created_at}`)
      if (w.status === 'approved' || w.status === 'pending') withdrawnTotal += Number(w.amount)
    }
    this.logger.info(`Total withdrawn (pending+approved): ₹${withdrawnTotal.toFixed(2)}`)
    this.logger.info('')

    this.logger.info('=== Downline Summary ===')
    const descendants = await db.rawQuery(
      `WITH RECURSIVE descendants AS (
        SELECT id, name, parent_id, 1 as depth
        FROM users WHERE parent_id = ?
        UNION ALL
        SELECT u.id, u.name, u.parent_id, d.depth + 1
        FROM users u INNER JOIN descendants d ON u.parent_id = d.id
        WHERE d.depth < 20
      )
      SELECT COUNT(*) as count, COALESCE(SUM(p.amount),0)::float as total_purchases
      FROM descendants d
      LEFT JOIN purchases p ON p.user_id = d.id AND p.approved_at IS NOT NULL AND p.cancelled_at IS NULL`,
      [userId]
    )
    const d = descendants.rows[0]
    this.logger.info(
      `Direct+Indirect members: ${d.count}, Total downline purchases: ₹${d.total_purchases}`
    )
  }
}
