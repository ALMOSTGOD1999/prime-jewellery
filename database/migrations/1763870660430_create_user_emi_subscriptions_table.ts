import { BaseSchema } from '@adonisjs/lucid/schema'

const EmiStatusEnum = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export default class extends BaseSchema {
  protected tableName = 'user_emi_subscriptions'

  async up() {
    this.schema.raw('DROP TYPE IF EXISTS emi_status_enum')
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 25).primary()

      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.decimal('plan_amount', 12, 2).notNullable()
      table
        .enum('status', Object.values(EmiStatusEnum), {
          useNative: true,
          enumName: 'emi_status_enum',
          existingType: false,
        })
        .defaultTo(EmiStatusEnum.PENDING)

      table.enum('withdrawal_status', ['none', 'partial', 'full']).defaultTo('none')
      table.boolean('has_used_for_purchase').defaultTo(false)
      table.timestamp('start_date').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS emi_status_enum')
  }
}
