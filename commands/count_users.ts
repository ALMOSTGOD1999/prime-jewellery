import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'

export default class CountUsers extends BaseCommand {
  static commandName = 'payout:count-users'
  static description = 'Count activated users'

  static options: CommandOptions = { startApp: true }

  async run() {
    const total = await User.query().where('role', 'user').whereNotNull('activated_at').count('* as total')
    this.logger.info('Activated users: ' + total[0].$extras.total)
  }
}
