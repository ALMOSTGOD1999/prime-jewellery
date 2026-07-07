import { BaseSchema } from '@adonisjs/lucid/schema'
import { UserGenderEnum, UserRoleEnum } from '#enums/user'
import { IndianStatesEnum } from '#enums/settings'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.raw('DROP TYPE IF EXISTS user_gender_enum')
    this.schema.raw('DROP TYPE IF EXISTS user_role_enum')
    this.schema.raw('DROP TYPE IF EXISTS indian_state_enum')
    this.schema.createTable(this.tableName, (table) => {
      table.integer('id').primary()
      table.string('name').notNullable()
      table.string('email', 254).notNullable()
      table.string('phone').notNullable()
      table.enum('gender', Object.values(UserGenderEnum), {
        enumName: 'user_gender_enum',
        schemaName: 'public',
        useNative: true,
        existingType: false,
      })
      table.json('avatar').nullable()
      table.enum('role', Object.values(UserRoleEnum), {
        enumName: 'user_role_enum',
        existingType: false,
        useNative: true,
        schemaName: 'public',
      })
      table.string('password').notNullable()
      table.timestamp('activated_at').nullable()

      table.integer('parent_id').nullable().references('id').inTable('users').onDelete('SET null')
      table.text('address').nullable()
      table.integer('zipcode').nullable()
      table.text('city').nullable()
      table.enum('state', Object.values(IndianStatesEnum), {
        enumName: 'indian_state_enum',
        schemaName: 'public',
        useNative: true,
        existingType: false,
      })

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.raw('DROP TYPE IF EXISTS user_gender_enum')
    this.schema.raw('DROP TYPE IF EXISTS user_role_enum')
    this.schema.raw('DROP TYPE IF EXISTS indian_state_enum')
    this.schema.dropTable(this.tableName)
  }
}
