import { BaseSchema } from '@adonisjs/lucid/schema'
import { TransactionTypeEnum } from '#enums/transaction'
import { WithdrawlTypeEnum } from '#enums/withdrawl'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '${TransactionTypeEnum.INVESTMENT}'`)
    this.schema.raw(`ALTER TABLE withdrawls DROP CONSTRAINT IF EXISTS withdrawls_type_check`)
    this.schema.raw(`ALTER TABLE withdrawls ADD CONSTRAINT withdrawls_type_check CHECK (type IN (${Object.values(WithdrawlTypeEnum).map((type) => `'${type}'`).join(', ')}))`)
  }

  async down() {
    this.schema.raw(`ALTER TABLE withdrawls DROP CONSTRAINT IF EXISTS withdrawls_type_check`)
    this.schema.raw(`ALTER TABLE withdrawls ADD CONSTRAINT withdrawls_type_check CHECK (type IN (${Object.values(WithdrawlTypeEnum).filter((type) => type !== WithdrawlTypeEnum.INVESTMENT_INCOME).map((type) => `'${type}'`).join(', ')}))`)
  }
}
