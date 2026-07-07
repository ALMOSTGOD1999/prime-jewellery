import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'salaries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 25).primary()
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('power').notNullable()
      table.integer('weaker').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
