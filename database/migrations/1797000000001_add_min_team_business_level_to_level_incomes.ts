import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('level_incomes', (table) => {
      table.integer('min_team_business_level').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('level_incomes', (table) => {
      table.dropColumn('min_team_business_level')
    })
  }
}
