import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import fs from 'node:fs'

export default class ShowJson extends BaseCommand {
  static commandName = 'show:json'
  static description = 'Show JSON file content'
  static options: CommandOptions = { startApp: false }

  async run() {
    const path = 'C:\\Users\\mukho\\Downloads\\date_mismatches.json'
    const content = fs.readFileSync(path, 'utf-8')
    const data = JSON.parse(content)
    this.logger.info(`Total mismatches: ${data.length}`)
    for (const m of data) {
      const lines = []
      lines.push(`\nPJ${String(m.id).padStart(6, '0')} ${m.name}`)
      if (m.activationDiff) {
        lines.push(`  ACTIVATION: CSV=${m.csvActivated}, DB=${m.dbActivated}, CSV_activated=${m.csvIsActivated}, DB_activated=${m.dbIsActivated}, diffDays=${m.activationDiffDays}`)
      }
      if (m.purchaseDiff) {
        lines.push(`  PURCHASE: CSV=${m.csvGoldPurchase}, DB=${m.dbGoldPurchase}, CSV_amt=${m.csvPurchaseAmount}, DB_amt=${m.dbPurchaseAmount}, diffDays=${m.purchaseDiffDays}`)
      }
      this.logger.info(lines.join('\n'))
    }
  }
}
