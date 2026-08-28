import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import fs from 'node:fs'
import { DateTime } from 'luxon'

export default class VerifyActivationSync extends BaseCommand {
  static commandName = 'verify:activation-sync'
  static description = 'Verify activation dates now match CSV'
  static options: CommandOptions = { startApp: true }

  async run() {
    const updates = JSON.parse(fs.readFileSync('C:\\Users\\mukho\\Downloads\\activation_updates.json', 'utf-8'))

    this.logger.info(`Verifying ${updates.length} updated users...`)

    for (const u of updates) {
      const dbUser = await db.rawQuery(`SELECT activated_at FROM users WHERE id = ?`, [u.id])
      if (dbUser.rows.length === 0) {
        this.logger.warning(`PJ${String(u.id).padStart(6, '0')} not found in DB`)
        continue
      }
      const dbActivated = dbUser.rows[0].activated_at
      const dbDt = DateTime.fromJSDate(new Date(dbActivated))
      const csvDt = DateTime.fromISO(u.newActivated)
      const match = dbDt.toISODate() === csvDt.toISODate()
      this.logger.info(`PJ${String(u.id).padStart(6, '0')} ${u.name}: DB=${dbActivated}, CSV=${u.newActivated}, Match=${match}`)
    }
  }
}
