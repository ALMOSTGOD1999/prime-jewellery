import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import fs from 'node:fs'

export default class ShowDateDetails extends BaseCommand {
  static commandName = 'show:date-details'
  static description = 'Show full mismatch details from JSON'
  static options: CommandOptions = { startApp: false }

  async run() {
    const path = 'C:\\Users\\mukho\\Downloads\\date_mismatches_full.json'
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'))

    this.logger.info(`Total mismatches: ${data.length}`)
    this.logger.info('')

    const byType: Record<string, any[]> = {}
    for (const m of data) {
      if (!byType[m.type]) byType[m.type] = []
      byType[m.type].push(m)
    }

    for (const [type, items] of Object.entries(byType)) {
      this.logger.info(`\n=== ${type} (${items.length}) ===`)
      for (const m of items) {
        if (type === 'activation_state') {
          this.logger.info(`PJ${String(m.id).padStart(6, '0')} ${m.name}: CSV_activated=${m.csvIsActivated}, DB_activated=${m.dbIsActivated}, CSV_created=${m.csvCreated}, DB_activated_at=${m.dbActivated}`)
        } else if (type === 'db_purchase_no_csv') {
          this.logger.info(`PJ${String(m.id).padStart(6, '0')} ${m.name}: DB_purchase=${m.dbGoldPurchase}, DB_amount=${m.dbAmount}, CSV_total_purchase=${m.csvTotalPurchase}`)
        } else if (type === 'csv_purchase_no_db') {
          this.logger.info(`PJ${String(m.id).padStart(6, '0')} ${m.name}: CSV_gold_date=${m.csvGoldPurchase}, CSV_amount=${m.csvTotalPurchase}`)
        } else if (type === 'purchase_date') {
          this.logger.info(`PJ${String(m.id).padStart(6, '0')} ${m.name}: CSV=${m.csvGoldPurchase}, DB=${m.dbGoldPurchase}, diff=${m.diffDays.toFixed(1)}d, CSV_amt=${m.csvAmount}, DB_amt=${m.dbAmount}`)
        } else if (type === 'activation_date') {
          this.logger.info(`PJ${String(m.id).padStart(6, '0')} ${m.name}: CSV_created=${m.csvCreated}, DB_activated=${m.dbActivated}, diff=${m.diffDays.toFixed(1)}d`)
        }
      }
    }
  }
}
