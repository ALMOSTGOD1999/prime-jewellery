import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.raw("DROP TYPE IF EXISTS user_leg_enum")
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('leg', ['left', 'right'], {
        enumName: 'user_leg_enum',
        schemaName: 'public',
        useNative: true,
        existingType: false,
      }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('leg')
    })
    this.schema.raw("DROP TYPE IF EXISTS user_leg_enum")
  }
}
