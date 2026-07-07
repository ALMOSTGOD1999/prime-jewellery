import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'purchases'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('gold_weight', 12, 3).nullable()
      table.string('gold_carat', 10).nullable()
      table.decimal('gold_rate', 12, 2).nullable()
      table.decimal('gold_price', 12, 2).nullable()
      table.decimal('making_charges', 12, 2).nullable()
      table.decimal('gst_amount', 12, 2).nullable()
      table.decimal('hallmark_charges', 12, 2).nullable()
      table.decimal('additional_charges', 12, 2).nullable()
      table.integer('total_items').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('gold_weight')
      table.dropColumn('gold_carat')
      table.dropColumn('gold_rate')
      table.dropColumn('gold_price')
      table.dropColumn('making_charges')
      table.dropColumn('gst_amount')
      table.dropColumn('hallmark_charges')
      table.dropColumn('additional_charges')
      table.dropColumn('total_items')
    })
  }
}
