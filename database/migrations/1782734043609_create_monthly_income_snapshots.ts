import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'monthly_income_snapshots'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('month').notNullable() // YYYY-MM-01 — start of month
      table.decimal('gross_amount', 12, 2).notNullable().defaultTo(0)
      table.decimal('income_wallet_amount', 12, 2).notNullable().defaultTo(0) // 70%
      table.decimal('repurchase_wallet_amount', 12, 2).notNullable().defaultTo(0) // 30%
      table.timestamp('paid_out_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['user_id', 'month'])
      table.index(['month', 'paid_out_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
