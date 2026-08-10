import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckUserWallets extends BaseCommand {
  static commandName = 'check-user-wallets'
  static description = 'Check wallet balances and July transactions for a user'
  static options: CommandOptions = { startApp: true }

  async run() {
    const username = 'PJ577611'

    // 1. User info
    const users = await db.rawQuery(
      `SELECT id, username, working_wallet, income_wallet, repurchase_wallet, status, activated_at FROM users WHERE username = ?`,
      [username]
    )
    console.log('\n=== USER ===')
    console.log(JSON.stringify(users.rows[0], null, 2))

    if (!users.rows[0]) {
      this.logger.error('User not found')
      return
    }

    const userId = users.rows[0].id

    // 2. All wallet transactions (last 30 days)
    const txns = await db.rawQuery(
      `SELECT id, type, amount, remark, created_at FROM transactions WHERE user_id = ? AND created_at >= '2026-07-01' AND created_at < '2026-08-01' ORDER BY created_at`,
      [userId]
    )
    console.log('\n=== JULY TRANSACTIONS ===')
    console.log(`Count: ${txns.rows.length}`)
    for (const t of txns.rows) {
      console.log(`  ${t.type} | ₹${t.amount} | ${t.remark} | ${t.created_at}`)
    }

    // 3. July snapshot
    const snaps = await db.rawQuery(
      `SELECT * FROM monthly_income_snapshots WHERE user_id = ? AND month = '2026-07-01'`,
      [userId]
    )
    console.log('\n=== JULY SNAPSHOT ===')
    console.log(JSON.stringify(snaps.rows, null, 2))

    // 4. All-time wallet transactions
    const allTxns = await db.rawQuery(
      `SELECT id, type, amount, remark, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [userId]
    )
    console.log('\n=== LAST 20 TRANSACTIONS (ALL TIME) ===')
    for (const t of allTxns.rows) {
      console.log(`  ${t.type} | ₹${t.amount} | ${t.remark} | ${t.created_at}`)
    }

    // 5. Salary records
    const salaries = await db.rawQuery(
      `SELECT id, power, weaker, status, qualifying_business, paid_at, created_at FROM salaries WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )
    console.log('\n=== SALARY RECORDS ===')
    console.log(JSON.stringify(salaries.rows, null, 2))

    // 6. Check platform config
    const config = await db.rawQuery(
      `SELECT key, value FROM platform_configs WHERE key IN ('income_wallet_payout_month', 'working_wallet_payout_month')`
    )
    console.log('\n=== PAYOUT CONFIGS ===')
    for (const c of config.rows) {
      console.log(`  ${c.key} = ${c.value}`)
    }

    await db.manager.close('read')
  }
}
