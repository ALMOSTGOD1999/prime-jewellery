import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FixPj617173Investment extends BaseCommand {
  static commandName = 'fix-pj617173-investment'
  static description = 'Correct PJ617173 investment from 601,000 to 200,000 (self investment) @ 3.5% Gold plan'
  static options: CommandOptions = { startApp: true }

  async run() {
    const userId = 617173

    const inv = await db.rawQuery(
      `SELECT id, amount, monthly_return_rate, status, purchase_id, remark FROM investments WHERE user_id = ? AND status = 'active'`,
      [userId]
    )
    const user = await db.rawQuery(`SELECT id, name, total_invested FROM users WHERE id = ?`, [userId])

    if (inv.rows.length === 0 || user.rows.length === 0) {
      this.logger.error('Investment or user not found')
      await db.manager.close('read')
      return
    }

    const currentAmount = Number(inv.rows[0].amount)
    const newAmount = 200000
    const delta = newAmount - currentAmount

    console.log('\n=== BEFORE ===')
    console.log('  User:', user.rows[0])
    console.log('  Investment:', inv.rows[0])

    // 1. Fix the investment record
    await db.rawQuery(
      `UPDATE investments SET amount = ?, monthly_return_rate = 3.5, remark = 'Corrected to actual self investment (was aggregate of 601,000)' WHERE id = ?`,
      [newAmount, inv.rows[0].id]
    )

    // 2. Fix user's total_invested (delta -401,000)
    await db.rawQuery(`UPDATE users SET total_invested = ? WHERE id = ?`, [newAmount, userId])

    const after = await db.rawQuery(
      `SELECT id, amount, monthly_return_rate, status, remark FROM investments WHERE id = ?`,
      [inv.rows[0].id]
    )
    const userAfter = await db.rawQuery(`SELECT id, name, total_invested FROM users WHERE id = ?`, [userId])

    console.log('\n=== AFTER ===')
    console.log('  User:', userAfter.rows[0])
    console.log('  Investment:', after.rows[0])
    console.log(`\n  Delta applied to total_invested: ${delta.toLocaleString('en-IN')}`)
    console.log('  New monthly return @3.5%: ₹7,000 (income 70% = ₹4,900)')

    await db.manager.close('read')
  }
}
