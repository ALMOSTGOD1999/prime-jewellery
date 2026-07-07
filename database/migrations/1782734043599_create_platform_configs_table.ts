import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'platform_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('key', 100).notNullable().unique()
      table.text('value').notNullable()
      table.string('group', 50).notNullable().defaultTo('general')
      table.string('label', 200).nullable()
      table.string('description', 500).nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.index(['group'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
