import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'investment_packages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 100).notNullable()
      table.decimal('min_amount', 12, 2).notNullable()
      table.decimal('max_amount', 12, 2).nullable()
      table.decimal('monthly_return_percent', 5, 2).notNullable()
      table.decimal('max_return_percent', 5, 2).notNullable().defaultTo(100)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
