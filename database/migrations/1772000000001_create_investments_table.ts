import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'investments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.decimal('amount', 12, 2).notNullable()
      table.decimal('monthly_return_rate', 5, 2).notNullable().defaultTo(3)
      table.enum('status', ['active', 'closed']).notNullable().defaultTo('active')
      table.timestamp('started_at').notNullable()
      table.timestamp('closed_at').nullable()
      table.text('remark').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
