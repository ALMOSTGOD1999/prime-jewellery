import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'banks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .primary()
      table.string('name').notNullable()
      table.string('branch').notNullable()
      table.string('ifsc').notNullable()
      table.string('holder_name').notNullable()
      table.string('account_number').notNullable()
      table.string('upi').nullable()
      table.json('qr').nullable()
      table.timestamp('approved_at').nullable()
      table.timestamp('rejected_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
