import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const db = this.db

    // 1. Delete all wallet transactions from CSV import and payouts
    await db.rawQuery(`DELETE FROM transactions WHERE remark ILIKE '%Initial wallet balance%'`)
    await db.rawQuery(`DELETE FROM transactions WHERE remark ILIKE '%monthly working income%'`)
    await db.rawQuery(`DELETE FROM transactions WHERE remark ILIKE '%investment return%'`)
    await db.rawQuery(`DELETE FROM transactions WHERE remark ILIKE '%REVERSAL%Duplicate%'`)

    // 2. Delete all monthly income snapshots
    await db.rawQuery(`DELETE FROM monthly_income_snapshots`)

    // 3. Delete all investment return distributions
    await db.rawQuery(`DELETE FROM investment_return_distributions`)

    // 4. Reset all user wallets to 0
    await db.rawQuery(`UPDATE users SET wallet_balance = 0, income_wallet = 0`)

    // 5. Reset payout month configs
    await db.from('platform_configs').where('key', 'income_wallet_payout_month').update({ value: '' })
    await db.from('platform_configs').where('key', 'working_wallet_payout_month').update({ value: '' })
  }

  async down() {}
}
