import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const db = this.db

    // Reverse income wallet credits
    const incomeTxns = await db.rawQuery(
      `SELECT user_id, amount FROM transactions WHERE remark ILIKE '%income wallet%' AND remark ILIKE '%June 2026%'`
    )
    for (const t of incomeTxns.rows) {
      await db.rawQuery(
        `UPDATE users SET income_wallet = GREATEST(0, income_wallet - ?) WHERE id = ?`,
        [Number(t.amount), t.user_id]
      )
    }

    // Reverse repurchase credits (new code uses repurchase_wallet, old code used wallet_balance)
    const repurchaseTxns = await db.rawQuery(
      `SELECT user_id, amount FROM transactions WHERE (remark ILIKE '%repurchase wallet%' OR remark ILIKE '%Repurchase wallet%') AND remark ILIKE '%June 2026%'`
    )
    for (const t of repurchaseTxns.rows) {
      await db.rawQuery(
        `UPDATE users SET repurchase_wallet = GREATEST(0, repurchase_wallet - ?) WHERE id = ?`,
        [Number(t.amount), t.user_id]
      )
      await db.rawQuery(
        `UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?`,
        [Number(t.amount), t.user_id]
      )
    }

    // Delete all payout transactions
    await db.rawQuery(
      `DELETE FROM transactions WHERE remark ILIKE '%June 2026%' AND (remark ILIKE '%working income%' OR remark ILIKE '%investment return%')`
    )

    // Delete snapshots and distributions
    await db.rawQuery(
      `DELETE FROM monthly_income_snapshots WHERE to_char(month, 'YYYY-MM') = '2026-06'`
    )
    await db.rawQuery(
      `DELETE FROM investment_return_distributions WHERE to_char(period_month, 'YYYY-MM') = '2026-06'`
    )

    // Reset configs
    await db
      .from('platform_configs')
      .where('key', 'income_wallet_payout_month')
      .update({ value: '' })
    await db
      .from('platform_configs')
      .where('key', 'working_wallet_payout_month')
      .update({ value: '' })
  }

  async down() {}
}
