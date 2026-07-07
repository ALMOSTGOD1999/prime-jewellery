import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'investment_return_distributions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('investment_id').unsigned().notNullable().references('id').inTable('investments').onDelete('CASCADE')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('period_month').notNullable()
      table.decimal('investment_amount', 12, 2).notNullable()
      table.decimal('return_amount', 12, 2).notNullable()
      table.decimal('income_amount', 12, 2).notNullable()
      table.decimal('gold_amount', 12, 2).notNullable()
      table.string('gold_transaction_id', 25).nullable().references('id').inTable('transactions').onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['investment_id', 'period_month'])
      table.index(['user_id', 'period_month'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
