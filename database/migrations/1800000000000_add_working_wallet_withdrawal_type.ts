import { BaseSchema } from '@adonisjs/lucid/schema'
import { WithdrawlTypeEnum } from '#enums/withdrawl'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`ALTER TABLE withdrawls DROP CONSTRAINT IF EXISTS withdrawls_type_check`)
    this.schema.raw(
      `ALTER TABLE withdrawls ADD CONSTRAINT withdrawls_type_check CHECK (type IN (${Object.values(WithdrawlTypeEnum)
        .map((type) => `'${type}'`)
        .join(', ')}))`
    )
  }

  async down() {
    this.schema.raw(`ALTER TABLE withdrawls DROP CONSTRAINT IF EXISTS withdrawls_type_check`)
    this.schema.raw(
      `ALTER TABLE withdrawls ADD CONSTRAINT withdrawls_type_check CHECK (type IN (${Object.values(WithdrawlTypeEnum)
        .filter((type) => type !== WithdrawlTypeEnum.WORKING_WALLET)
        .map((type) => `'${type}'`)
        .join(', ')}))`
    )
  }
}
