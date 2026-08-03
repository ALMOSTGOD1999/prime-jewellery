import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Link investments back to the gold purchase they were created from.
 *
 * Gold purchases and investments are the same thing — every approved purchase
 * is a self-investment. This column lets us keep the two records in sync
 * (amount edits, approve/reject/stop/cancel) and makes the linkage explicit.
 */
export default class extends BaseSchema {
  protected tableName = 'investments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('purchase_id', 25)
        .nullable()
        .unique()
        .references('id')
        .inTable('purchases')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['purchase_id'])
      table.dropUnique(['purchase_id'])
      table.dropColumn('purchase_id')
    })
  }
}
