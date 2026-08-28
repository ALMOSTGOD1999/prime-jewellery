import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import fs from 'node:fs'
import { DateTime } from 'luxon'

export default class CheckDates extends BaseCommand {
  static commandName = 'check:dates'
  static description = 'Compare CSV dates with database dates'
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

    // Bulk fetch all users and purchases from DB
    this.logger.info('Fetching all DB data...')
    const allUsers = await db.rawQuery(`
      SELECT id, created_at, activated_at, total_invested, status
      FROM users WHERE role = 'user'
    `)
    const allPurchases = await db.rawQuery(`
      SELECT user_id, amount, approved_at, created_at
      FROM purchases
      WHERE approved_at IS NOT NULL
      ORDER BY user_id, approved_at ASC
    `)

    // Build lookup maps
    const userMap = new Map<number, any>()
    for (const u of allUsers.rows) {
      userMap.set(Number(u.id), u)
    }
    const purchaseMap = new Map<number, any>()
    for (const p of allPurchases.rows) {
      const uid = Number(p.user_id)
      if (!purchaseMap.has(uid)) purchaseMap.set(uid, p) // first (earliest) purchase
    }

    let checked = 0
    let activationMismatch = 0
    let purchaseMismatch = 0
    let noDbUser = 0
    let noDbPurchase = 0

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
      if (!u) {
        noDbUser++
        continue
      }
      const p = purchaseMap.get(userId)
      if (!p) noDbPurchase++

      checked++

      // Compare activation dates
      let activationDiff = false
      let activationDiffDays = 0
      if (csvIsActivated && csvCreated && u.activated_at) {
        const csvDt = DateTime.fromISO(csvCreated)
        const dbDt = DateTime.fromJSDate(new Date(u.activated_at))
        if (csvDt.isValid && dbDt.isValid) {
          activationDiffDays = Math.abs(csvDt.diff(dbDt, 'days').days)
          if (activationDiffDays > 0) activationDiff = true
        }
      }
      if (csvIsActivated && !u.activated_at) activationDiff = true
      if (!csvIsActivated && u.activated_at) activationDiff = true

      // Compare purchase/investment dates
      let purchaseDiff = false
      let purchaseDiffDays = 0
      if (csvGoldPurchase && p?.approved_at) {
        const csvDt = DateTime.fromISO(csvGoldPurchase)
        const dbDt = DateTime.fromJSDate(new Date(p.approved_at))
        if (csvDt.isValid && dbDt.isValid) {
          purchaseDiffDays = Math.abs(csvDt.diff(dbDt, 'days').days)
          if (purchaseDiffDays > 0) purchaseDiff = true
        }
      }
      if (csvGoldPurchase && !p) purchaseDiff = true
      if (!csvGoldPurchase && p && csvTotalPurchase > 1000) purchaseDiff = true

      if (activationDiff) activationMismatch++
      if (purchaseDiff) purchaseMismatch++

      if (activationDiff || purchaseDiff) {
        const name = row[header.indexOf('member_name')]
        mismatches.push({
          id: userId,
          name,
          activationDiff,
          csvActivated: csvCreated,
          dbActivated: u.activated_at,
          csvIsActivated,
          dbIsActivated: !!u.activated_at,
          activationDiffDays,
          purchaseDiff,
          csvGoldPurchase,
          dbGoldPurchase: p?.approved_at || null,
          csvPurchaseAmount: csvTotalPurchase,
          dbPurchaseAmount: p?.amount || null,
          purchaseDiffDays,
        })
      }
    }

    // Write results to file
    const outPath = 'C:\\Users\\mukho\\Downloads\\date_mismatches.json'
    fs.writeFileSync(outPath, JSON.stringify(mismatches, null, 2))

    this.logger.info('')
    this.logger.info(`Checked: ${checked}`)
    this.logger.info(`Activation mismatches: ${activationMismatch}`)
    this.logger.info(`Purchase mismatches: ${purchaseMismatch}`)
    this.logger.info(`Not in DB: ${noDbUser}`)
    this.logger.info(`No purchase in DB: ${noDbPurchase}`)
    this.logger.info(`Results written to: ${outPath}`)

    // Print first 20 mismatches
    for (const m of mismatches.slice(0, 20)) {
      this.logger.info(`\nPJ${String(m.id).padStart(6, '0')} ${m.name}`)
      if (m.activationDiff) {
        this.logger.info(
          `  ACTIVATION: CSV=${m.csvActivated}, DB=${m.dbActivated}, diff=${m.activationDiffDays.toFixed(1)}d`
        )
      }
      if (m.purchaseDiff) {
        this.logger.info(
          `  PURCHASE:   CSV=${m.csvGoldPurchase}, DB=${m.dbGoldPurchase}, diff=${m.purchaseDiffDays.toFixed(1)}d`
        )
      }
    }
    if (mismatches.length > 20) {
      this.logger.info(`\n... and ${mismatches.length - 20} more mismatches in the JSON file`)
    }
  }
}
