import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'investment_return_distributions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('paid_out_at').nullable()
      table
        .string('income_wallet_transaction_id', 25)
        .nullable()
        .references('id')
        .inTable('transactions')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('paid_out_at')
      table.dropColumn('income_wallet_transaction_id')
    })
  }
}
