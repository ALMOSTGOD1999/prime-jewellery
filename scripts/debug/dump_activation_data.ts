import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import fs from 'node:fs'

export default class DumpActivationData extends BaseCommand {
  static commandName = 'dump:activation-data'
  static description = 'Dump activation update data as SQL'
  static options: CommandOptions = { startApp: false }

  async run() {
    const data = JSON.parse(fs.readFileSync('C:\\Users\\mukho\\Downloads\\activation_updates.json', 'utf-8'))
    this.logger.info('const activationUpdates = [')
    for (const u of data) {
      this.logger.info(`  { id: ${u.id}, newActivated: '${u.newActivated}' }, // ${u.name}`)
    }
    this.logger.info(']')
  }
}
