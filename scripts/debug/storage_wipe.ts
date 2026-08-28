import { args, BaseCommand } from '@adonisjs/core/ace'
import drive from '@adonisjs/drive/services/main'

import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class StorageWipe extends BaseCommand {
  static commandName = 'storage:wipe'
  static description = 'Wipe storage files'

  static options: CommandOptions = { startApp: true }

  @args.string({ required: false, description: 'Prefix directory to wipe' })
  declare prefix?: string

  async run() {
    if (this.app.inProduction) return this.logger.error('Do not add mock data in production!!')
    const disk = drive.use()
    const prefix = this.prefix || ''
    await disk.deleteAll(prefix)
    this.logger.info(`Storage wiped! Path: "${prefix}"`)
  }
}
