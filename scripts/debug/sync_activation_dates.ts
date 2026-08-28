import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import fs from 'node:fs'
import { DateTime } from 'luxon'

export default class SyncActivationDates extends BaseCommand {
  static commandName = 'sync:activation-dates'
  static description = 'Update DB activated_at to match CSV created_at for mismatched users'
  static options: CommandOptions = { startApp: true }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  async run() {
    const csvPath = 'C:\\Users\\mukho\\Downloads\\all-users (1).csv'
    const content = fs.readFileSync(csvPath, 'utf-8')
    const lines = content.split('\n').filter((l) => l.trim())
    const header = this.parseCSVLine(lines[0])
    const rows = lines.slice(1).map((l) => this.parseCSVLine(l))

    // Build CSV map
    const csvMap = new Map<number, { createdAt: string; isActivated: boolean; name: string }>()
    for (const row of rows) {
      const memberCode = row[header.indexOf('member_code')] || ''
      const match = memberCode.match(/PJ(\d+)/i)
      if (!match) continue
      const userId = Number(match[1])
      const createdAt = row[header.indexOf('created_at')]
      const isActivated = (row[header.indexOf('is_activated')] || '').toLowerCase() === 'true'
      const name = row[header.indexOf('member_name')]
      csvMap.set(userId, { createdAt, isActivated, name })
    }

    // Fetch all DB users
    const dbUsers = await db.rawQuery(`SELECT id, created_at, activated_at FROM users WHERE role = 'user'`)
    const dbMap = new Map<number, any>()
    for (const u of dbUsers.rows) dbMap.set(Number(u.id), u)

    let updated = 0
    let skipped = 0
    let noChange = 0
    const updates: any[] = []

    for (const [userId, csvData] of csvMap.entries()) {
      const dbUser = dbMap.get(userId)
      if (!dbUser) {
        skipped++
        continue
      }

      const dbActivated = dbUser.activated_at ? DateTime.fromJSDate(new Date(dbUser.activated_at)) : null
      const csvCreated = DateTime.fromISO(csvData.createdAt)

      if (!csvCreated.isValid) {
        skipped++
        continue
      }

      // If CSV says not activated, but DB says activated → update activated_at to CSV created_at
      if (!csvData.isActivated && dbActivated) {
        if (dbActivated.toISODate() !== csvCreated.toISODate()) {
          await db.rawQuery(
            `UPDATE users SET activated_at = ? WHERE id = ?`,
            [csvData.createdAt, userId]
          )
          updated++
          updates.push({
            id: userId,
            name: csvData.name,
            oldActivated: dbUser.activated_at,
            newActivated: csvData.createdAt,
          })
          this.logger.info(`Updated PJ${String(userId).padStart(6, '0')} ${csvData.name}: activated_at ${dbUser.activated_at} → ${csvData.createdAt}`)
        } else {
          noChange++
        }
      } else if (csvData.isActivated && dbActivated) {
        // Both activated — check if dates match
        const dbCreated = DateTime.fromJSDate(new Date(dbUser.created_at))
        if (dbCreated.toISODate() !== csvCreated.toISODate()) {
          // Update created_at to match CSV (since CSV is the source of truth for timeline)
          await db.rawQuery(
            `UPDATE users SET created_at = ?, activated_at = ? WHERE id = ?`,
            [csvData.createdAt, csvData.createdAt, userId]
          )
          updated++
          updates.push({
            id: userId,
            name: csvData.name,
            oldActivated: dbUser.activated_at,
            newActivated: csvData.createdAt,
          })
          this.logger.info(`Updated PJ${String(userId).padStart(6, '0')} ${csvData.name}: created_at/activated_at → ${csvData.createdAt}`)
        } else {
          noChange++
        }
      } else {
        noChange++
      }
    }

    fs.writeFileSync('C:\\Users\\mukho\\Downloads\\activation_updates.json', JSON.stringify(updates, null, 2))

    this.logger.info('')
    this.logger.info(`Done! Updated: ${updated}, No change: ${noChange}, Skipped: ${skipped}`)
    this.logger.info(`Details written to activation_updates.json`)
  }
}
