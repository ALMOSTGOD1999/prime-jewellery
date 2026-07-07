import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'kycs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .primary()
      table.string('aadhaar_number').notNullable()
      table.json('aadhaar_proof').nullable()
      table.string('pan_number').notNullable()
      table.json('pan_proof').nullable()
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
