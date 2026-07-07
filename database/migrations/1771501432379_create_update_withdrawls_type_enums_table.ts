import { WithdrawlTypeEnum } from '#enums/withdrawl'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'withdrawls'

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      DROP CONSTRAINT IF EXISTS withdrawls_type_check;
      
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT withdrawls_type_check 
      CHECK (type IN (${Object.values(WithdrawlTypeEnum)
        .map((v) => `'${v}'`)
        .join(', ')}));
    `)
  }

  async down() {
    // Revert to original constraint without activation_sponsor
    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      DROP CONSTRAINT IF EXISTS withdrawls_type_check;
      
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT withdrawls_type_check 
      CHECK (type IN ('activation_cashback', 'activation_level', 'cashback', 'level', 'salary', 'emi', 'emi_level'));
    `)
  }
}
