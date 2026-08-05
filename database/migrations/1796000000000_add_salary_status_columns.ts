import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'salaries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // 'paid' | 'pending' | 'expired'
      table.string('status', 20).notNullable().defaultTo('paid')
      // Business volume (6-month accumulation window) at qualification time —
      // used to check the 20% growth requirement before a pending incentive is paid.
      table.bigInteger('qualifying_business').nullable()
      // When the incentive became payable (for legacy records = created_at).
      table.timestamp('paid_at').nullable()
    })

    // Legacy salary records were always payable on creation — backfill paid_at
    // so income counting (status = 'paid' AND paid_at within month) keeps working.
    this.defer(async (db) => {
      await db.rawQuery(
        `UPDATE salaries SET paid_at = created_at WHERE status = 'paid' AND paid_at IS NULL`
      )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('status')
      table.dropColumn('qualifying_business')
      table.dropColumn('paid_at')
    })
  }
}
