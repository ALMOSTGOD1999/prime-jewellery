import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'purchases'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('buyer_name', 100).nullable()
      table.decimal('quantity', 12, 3).notNullable().defaultTo(1)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('buyer_name')
      table.dropColumn('quantity')
    })
  }
}
