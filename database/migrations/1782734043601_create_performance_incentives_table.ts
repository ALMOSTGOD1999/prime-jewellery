import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'performance_incentives'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('title', 100).notNullable()
      table.decimal('business_target', 14, 2).notNullable()
      table.decimal('reward_amount', 12, 2).notNullable()
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
