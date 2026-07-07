import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'achievements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 25).primary()

      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.integer('power').notNullable()
      table.integer('weaker').notNullable()
      table.integer('criteria').notNullable()
      table.string('reward').notNullable()

      table.timestamp('collected_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Ensure each user can only achieve each criteria once
      table.unique(['user_id', 'criteria'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
