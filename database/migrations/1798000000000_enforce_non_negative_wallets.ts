import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Clear any pre-existing negative wallet balances before adding the
    // CHECK constraint so the migration does not fail on bad rows.
    await this.db.rawQuery(
      `UPDATE users SET
         income_wallet = GREATEST(COALESCE(income_wallet, 0), 0),
         repurchase_wallet = GREATEST(COALESCE(repurchase_wallet, 0), 0),
         working_wallet = GREATEST(COALESCE(working_wallet, 0), 0),
         reward_wallet = GREATEST(COALESCE(reward_wallet, 0), 0)
       WHERE income_wallet < 0 OR repurchase_wallet < 0 OR working_wallet < 0 OR reward_wallet < 0`
    )

    this.schema.alterTable('users', (table) => {
      table.check('income_wallet >= 0', [], 'users_income_wallet_non_negative')
      table.check('repurchase_wallet >= 0', [], 'users_repurchase_wallet_non_negative')
      table.check('working_wallet >= 0', [], 'users_working_wallet_non_negative')
      table.check('reward_wallet >= 0', [], 'users_reward_wallet_non_negative')
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropChecks(['users_income_wallet_non_negative'])
      table.dropChecks(['users_repurchase_wallet_non_negative'])
      table.dropChecks(['users_working_wallet_non_negative'])
      table.dropChecks(['users_reward_wallet_non_negative'])
    })
  }
}
