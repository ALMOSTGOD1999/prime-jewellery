import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const db = this.db

    // 1. Zero out ALL income and repurchase wallets that have June payout
    await db.rawQuery(`UPDATE users SET income_wallet = 0 WHERE income_wallet > 0`)
    await db.rawQuery(`UPDATE users SET repurchase_wallet = 0 WHERE repurchase_wallet > 0`)

    // 2. Delete ALL payout-related transactions
    await db.rawQuery(
      `DELETE FROM transactions WHERE remark ILIKE '%working income%' OR remark ILIKE '%investment return%' OR remark ILIKE '%Initial wallet balance%'`
    )

    // 3. Delete ALL snapshots
    await db.rawQuery(`DELETE FROM monthly_income_snapshots`)

    // 4. Delete ALL distributions
    await db.rawQuery(`DELETE FROM investment_return_distributions`)

    // 5. Reset configs
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
