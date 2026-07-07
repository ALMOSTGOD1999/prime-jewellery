import { WithdrawlStatusEnum, WithdrawlTypeEnum } from '#enums/withdrawl'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'withdrawls'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.decimal('amount', 12, 2).notNullable()
      table.enum('type', Object.values(WithdrawlTypeEnum)).notNullable()
      table
        .enum('status', Object.values(WithdrawlStatusEnum))
        .defaultTo(WithdrawlStatusEnum.PENDING)
      table.string('mode').nullable()
      table.string('ref').nullable()
      table.timestamp('approved_at').nullable()
      table.timestamp('rejected_at').nullable()
      table.text('remark').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
