import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import fs from 'node:fs'
import { DateTime } from 'luxon'

export default class CheckDatesFull extends BaseCommand {
  static commandName = 'check:dates-full'
  static description = 'Full date comparison CSV vs DB'
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

    this.logger.info(`CSV loaded: ${rows.length} users`)

    // Bulk fetch
    const allUsers = await db.rawQuery(`SELECT id, created_at, activated_at, total_invested, status, name FROM users WHERE role = 'user'`)
    const allPurchases = await db.rawQuery(`SELECT user_id, amount, approved_at FROM purchases WHERE approved_at IS NOT NULL ORDER BY user_id, approved_at ASC`)

    const userMap = new Map<number, any>()
    for (const u of allUsers.rows) userMap.set(Number(u.id), u)
    const purchaseMap = new Map<number, any>()
    for (const p of allPurchases.rows) {
      const uid = Number(p.user_id)
      if (!purchaseMap.has(uid)) purchaseMap.set(uid, p)
    }

    let csvHasGoldDate = 0
    let csvHasGoldDateButNoDbPurchase = 0
    let csvHasGoldDateAndDbPurchaseDateMismatch = 0
    let dbHasPurchaseButCsvNoGoldDate = 0
    let activationDateMismatch = 0
    let activationStateMismatch = 0

    const mismatches: any[] = []

    for (const row of rows) {
      const memberCode = row[header.indexOf('member_code')] || ''
      const match = memberCode.match(/PJ(\d+)/i)
      if (!match) continue
      const userId = Number(match[1])

      const csvCreated = row[header.indexOf('created_at')]
      const csvGoldPurchase = row[header.indexOf('gold_purchase_date')]
      const csvIsActivated = (row[header.indexOf('is_activated')] || '').toLowerCase() === 'true'
      const csvTotalPurchase = Number(row[header.indexOf('total_purchase_value')] || 0)

      const u = userMap.get(userId)
      if (!u) continue
      const p = purchaseMap.get(userId)

      // Activation checks
      const dbIsActivated = !!u.activated_at
      if (csvIsActivated !== dbIsActivated) {
        activationStateMismatch++
        mismatches.push({ id: userId, name: u.name, type: 'activation_state', csvIsActivated, dbIsActivated, csvCreated, dbActivated: u.activated_at })
      } else if (csvIsActivated && dbIsActivated && csvCreated && u.activated_at) {
        const csvDt = DateTime.fromISO(csvCreated)
        const dbDt = DateTime.fromJSDate(new Date(u.activated_at))
        if (csvDt.isValid && dbDt.isValid) {
          const diffDays = Math.abs(csvDt.diff(dbDt, 'days').days)
          if (diffDays > 0) {
            activationDateMismatch++
            mismatches.push({ id: userId, name: u.name, type: 'activation_date', csvCreated, dbActivated: u.activated_at, diffDays })
          }
        }
      }

      // Purchase checks
      if (csvGoldPurchase) {
        csvHasGoldDate++
        if (!p) {
          csvHasGoldDateButNoDbPurchase++
          mismatches.push({ id: userId, name: u.name, type: 'csv_purchase_no_db', csvGoldPurchase, csvTotalPurchase })
        } else {
          const csvDt = DateTime.fromISO(csvGoldPurchase)
          const dbDt = DateTime.fromJSDate(new Date(p.approved_at))
          if (csvDt.isValid && dbDt.isValid) {
            const diffDays = Math.abs(csvDt.diff(dbDt, 'days').days)
            if (diffDays > 0) {
              csvHasGoldDateAndDbPurchaseDateMismatch++
              mismatches.push({ id: userId, name: u.name, type: 'purchase_date', csvGoldPurchase, dbGoldPurchase: p.approved_at, diffDays, csvAmount: csvTotalPurchase, dbAmount: p.amount })
            }
          }
        }
      } else if (p) {
        dbHasPurchaseButCsvNoGoldDate++
        mismatches.push({ id: userId, name: u.name, type: 'db_purchase_no_csv', dbGoldPurchase: p.approved_at, dbAmount: p.amount, csvTotalPurchase })
      }
    }

    fs.writeFileSync('C:\\Users\\mukho\\Downloads\\date_mismatches_full.json', JSON.stringify(mismatches, null, 2))

    this.logger.info('')
    this.logger.info(`=== SUMMARY ===`)
    this.logger.info(`CSV users with gold_purchase_date: ${csvHasGoldDate}`)
    this.logger.info(`CSV has gold date but DB has no purchase: ${csvHasGoldDateButNoDbPurchase}`)
    this.logger.info(`CSV and DB purchase dates differ: ${csvHasGoldDateAndDbPurchaseDateMismatch}`)
    this.logger.info(`DB has purchase but CSV has no gold date: ${dbHasPurchaseButCsvNoGoldDate}`)
    this.logger.info(`Activation state mismatches: ${activationStateMismatch}`)
    this.logger.info(`Activation date mismatches (both activated): ${activationDateMismatch}`)
    this.logger.info(`Total mismatches written to date_mismatches_full.json`)
  }
}
