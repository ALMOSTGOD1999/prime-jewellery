import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'purchases'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 25).primary()
      table.decimal('amount', 12, 2).notNullable()
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('approved_at').nullable()
      table.timestamp('rejected_at').nullable()
      table.timestamp('cancelled_at').nullable()
      table.timestamp('stopped_at').nullable()
      table.text('remark').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
