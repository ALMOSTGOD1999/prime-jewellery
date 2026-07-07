import { BaseSchema } from '@adonisjs/lucid/schema'
import { TransactionTypeEnum } from '#enums/transaction'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.raw('DROP TYPE IF EXISTS transaction_type_enum')
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 25).primary()
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.decimal('amount', 12, 2).notNullable()
      table
        .enum('type', Object.values(TransactionTypeEnum), {
          enumName: 'transaction_type_enum',
          useNative: true,
          existingType: false,
          schemaName: 'public',
        })
        .notNullable()
      table.json('proof').nullable()
      table.string('utr').nullable()
      table.timestamp('approved_at').nullable()
      table.timestamp('rejected_at').nullable()
      table.timestamp('cancelled_at').nullable()
      table.timestamp('stopped_at').nullable()
      table.decimal('wasted_amount', 12, 2).nullable()
      table.text('remark').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // EMI specific columns
      table
        .string('user_emi_subscription_id', 25)
        .references('id')
        .inTable('user_emi_subscriptions')
        .onDelete('CASCADE')
        .nullable()
      table.integer('emi_month').nullable()
    })
  }

  async down() {
    this.schema.raw('DROP TYPE IF EXISTS transaction_type_enum')
    this.schema.dropTable(this.tableName)
  }
}
