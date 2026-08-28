import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FindUser extends BaseCommand {
  static commandName = 'find:user'
  static options: CommandOptions = { startApp: true }

  async run() {
    // Search for users matching 439819 in various ways
    const byId = await db.rawQuery(`SELECT id, name FROM users WHERE id = 439819`)
    this.logger.info(`User.find(439819): ${byId.rows.length ? byId.rows[0].name : 'NOT FOUND'}`)

    // Search for any ID containing 439819
    const like = await db.rawQuery(`SELECT id, name FROM users WHERE id::text LIKE '%439819%' LIMIT 5`)
    this.logger.info(`IDs containing 439819: ${like.rows.length} found`)
    like.rows.forEach((r: any) => this.logger.info(`  ${r.id} - ${r.name}`))

    // Check what formatUserId would show
    const all = await db.rawQuery(`SELECT id, name FROM users ORDER BY id DESC LIMIT 10`)
    this.logger.info('\nLast 10 users:')
    all.rows.forEach((r: any) => {
      const padded = String(r.id).padStart(6, '0')
      this.logger.info(`  ID ${r.id} → PJ${padded} — ${r.name}`)
    })
  }
}
