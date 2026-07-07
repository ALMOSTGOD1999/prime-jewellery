import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('income_wallet', 12, 2).notNullable().defaultTo(0)
      table.decimal('reward_wallet', 12, 2).notNullable().defaultTo(0)
      table.decimal('repurchase_wallet', 12, 2).notNullable().defaultTo(0)
      table.decimal('total_invested', 12, 2).notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('income_wallet')
      table.dropColumn('reward_wallet')
      table.dropColumn('repurchase_wallet')
      table.dropColumn('total_invested')
    })
  }
}
