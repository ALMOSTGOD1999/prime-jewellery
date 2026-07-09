import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('entity_type').notNullable()
      table.integer('entity_id').notNullable()
      table.string('field').notNullable()
      table.text('old_value').nullable()
      table.text('new_value').notNullable()
      table.integer('changed_by').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.string('reason').nullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
