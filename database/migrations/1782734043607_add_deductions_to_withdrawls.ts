import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'withdrawls'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('admin_charges', 12, 2).nullable().defaultTo(0)
      table.decimal('other_deductions', 12, 2).nullable().defaultTo(0)
      table.decimal('net_amount', 12, 2).nullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('admin_charges')
      table.dropColumn('other_deductions')
      table.dropColumn('net_amount')
    })
  }
}
