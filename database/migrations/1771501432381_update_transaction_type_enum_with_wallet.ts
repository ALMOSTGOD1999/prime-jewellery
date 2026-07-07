import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw("ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'wallet_credit'")
    this.schema.raw("ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'wallet_debit'")
  }

  async down() {
    // PostgreSQL doesn't support removing values from an enum directly
    // This migration is one-way for safety
  }
}
